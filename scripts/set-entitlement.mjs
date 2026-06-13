#!/usr/bin/env node
// Manual Pro/partner entitlement fulfillment (30-day plan Phase 6).
//
// This is the by-hand step the operator runs after a Stripe payment-link receipt
// arrives: it sets a per-account allowance override on the user's record in the
// `cheapagent-usage` Blobs store so the signed-in daily limit rises above the
// free default. It is entitlement *lookup* fulfillment — NOT billing
// infrastructure: there is no webhook, no Stripe API call, no self-serve. A
// human reads a Stripe email and runs this once. (Standing kill-criterion.)
//
// The override shape matches docs/key-issuance-design.md (one mechanism, two
// surfaces): `plan` + `limits.{daily_chars,daily_documents}` on `users/{sub}`.
// usage.mjs reads `limits.daily_chars` (the only counter enforced today) and
// falls back to the free constant when it is absent. daily_documents is written
// forward-compatibly but is not enforced until the Phase 7 hosted API.
//
// Auth to Blobs from a laptop (outside the Netlify runtime) needs the site id
// and a Netlify API token, supplied via env:
//
//   NETLIFY_SITE_ID=52eefbb8-f8fd-43e5-8d9f-4c0cf9830eb7 \
//   NETLIFY_API_TOKEN=<personal access token> \
//   node scripts/set-entitlement.mjs --sub <user-sub> --plan pro --daily-chars 100000
//
// Identify the account by --sub (from the Netlify Identity dashboard, always
// works) or by --email (matched against existing usage records; only works once
// the account has signed in at least once). Use --clear to revert to the free
// default, and --dry-run to preview without writing.

import { getStore } from "@netlify/blobs";

const USERS_PREFIX = "users/";
const KNOWN_PLANS = new Set(["free", "pro", "partner"]);
const MAX_DAILY_CHAR_LIMIT = 1_000_000; // mirror usage.mjs sanity ceiling
const WRITE_ATTEMPTS = 4;

function usage(message) {
  if (message) console.error(`\nError: ${message}`);
  console.error(
    `\nUsage:\n` +
      `  NETLIFY_SITE_ID=<id> NETLIFY_API_TOKEN=<token> \\\n` +
      `    node scripts/set-entitlement.mjs (--sub <sub> | --email <email>) [options]\n\n` +
      `Options:\n` +
      `  --sub <sub>             account id (Netlify Identity sub); unambiguous, preferred\n` +
      `  --email <email>         match an existing usage record by email (post-first-signin only)\n` +
      `  --plan <free|pro|partner>   set the plan label\n` +
      `  --daily-chars <n>       set the per-day character allowance override (<= ${MAX_DAILY_CHAR_LIMIT})\n` +
      `  --daily-documents <n>   set the per-day document override (forward-compat; not enforced yet)\n` +
      `  --clear                 remove the limits override and reset plan to "free"\n` +
      `  --dry-run               print the change without writing\n`,
  );
  process.exit(message ? 1 : 0);
}

function parseArgs(argv) {
  const args = { plan: null, dailyChars: null, dailyDocuments: null, sub: null, email: null, clear: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) usage(`${arg} requires a value`);
      return v;
    };
    switch (arg) {
      case "--sub": args.sub = next(); break;
      case "--email": args.email = next().toLowerCase(); break;
      case "--plan": args.plan = next(); break;
      case "--daily-chars": args.dailyChars = Number(next()); break;
      case "--daily-documents": args.dailyDocuments = Number(next()); break;
      case "--clear": args.clear = true; break;
      case "--dry-run": args.dryRun = true; break;
      case "-h": case "--help": usage(); break;
      default: usage(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function validate(args) {
  if (!args.sub && !args.email) usage("identify the account with --sub or --email");
  if (args.sub && args.email) usage("use --sub or --email, not both");
  if (args.plan && !KNOWN_PLANS.has(args.plan)) usage(`--plan must be one of ${[...KNOWN_PLANS].join(", ")}`);
  for (const [flag, value] of [["--daily-chars", args.dailyChars], ["--daily-documents", args.dailyDocuments]]) {
    if (value !== null && (!Number.isInteger(value) || value < 1 || value > MAX_DAILY_CHAR_LIMIT)) {
      usage(`${flag} must be an integer between 1 and ${MAX_DAILY_CHAR_LIMIT}`);
    }
  }
  if (args.clear && (args.plan || args.dailyChars !== null || args.dailyDocuments !== null)) {
    usage("--clear cannot be combined with --plan/--daily-chars/--daily-documents");
  }
  if (!args.clear && !args.plan && args.dailyChars === null && args.dailyDocuments === null) {
    usage("nothing to do: pass --plan, --daily-chars, --daily-documents, or --clear");
  }
}

function openStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) usage("set NETLIFY_SITE_ID and NETLIFY_API_TOKEN in the environment");
  return getStore({ name: "cheapagent-usage", siteID, token });
}

// Resolve a sub when the operator gave only an email: scan existing usage
// records for a matching `email`. Misses when the account has never signed in
// (no record yet) — then the operator must pass --sub from the Identity dashboard.
async function resolveSubByEmail(store, email) {
  const { blobs } = await store.list({ prefix: USERS_PREFIX });
  const matches = [];
  for (const blob of blobs) {
    const record = await store.get(blob.key, { type: "json" });
    if (record?.email && record.email.toLowerCase() === email) {
      matches.push(blob.key.slice(USERS_PREFIX.length));
    }
  }
  if (matches.length === 0) {
    usage(`no usage record found for ${email}. The account may not have signed in yet — pass --sub from the Netlify Identity dashboard.`);
  }
  if (matches.length > 1) {
    usage(`multiple records match ${email} (${matches.join(", ")}). Disambiguate with --sub.`);
  }
  return matches[0];
}

function summarize(record) {
  return { plan: record?.plan ?? "(unset)", limits: record?.limits ?? "(none)" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validate(args);
  const store = openStore();
  const sub = args.sub ?? (await resolveSubByEmail(store, args.email));
  const key = `${USERS_PREFIX}${sub}`;

  for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt++) {
    const entry = await store.getWithMetadata(key, { type: "json" });
    const nowIso = new Date().toISOString();
    const record = entry?.data ?? {
      id: sub,
      email: args.email ?? "",
      plan: "free",
      created_at: nowIso,
      last_seen_at: nowIso,
      daily: {},
    };
    const before = summarize(record);

    if (args.clear) {
      delete record.limits;
      record.plan = "free";
    } else {
      if (args.plan) record.plan = args.plan;
      if (args.dailyChars !== null || args.dailyDocuments !== null) {
        record.limits = { ...(record.limits ?? {}) };
        if (args.dailyChars !== null) record.limits.daily_chars = args.dailyChars;
        if (args.dailyDocuments !== null) record.limits.daily_documents = args.dailyDocuments;
      }
    }
    const after = summarize(record);

    console.log(`account ${sub}${record.email ? ` <${record.email}>` : ""}${entry ? "" : " (new record)"}`);
    console.log("  before:", JSON.stringify(before));
    console.log("  after: ", JSON.stringify(after));

    if (args.dryRun) {
      console.log("\n--dry-run: no write performed.");
      return;
    }

    const { modified } = await store.setJSON(
      key,
      record,
      entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true },
    );
    if (modified) {
      console.log(`\nWrote ${key}. usage.mjs picks up the new allowance on the account's next quota check.`);
      if (args.dailyDocuments !== null) {
        console.log("Note: daily_documents is stored but not enforced until the Phase 7 hosted API.");
      }
      return;
    }
    console.warn(`write race on ${key}; retrying (${attempt}/${WRITE_ATTEMPTS})`);
  }
  usage(`could not write after ${WRITE_ATTEMPTS} attempts (sustained write contention). Try again.`);
}

main().catch((error) => {
  console.error("\nset-entitlement failed:", error?.message ?? error);
  process.exit(1);
});
