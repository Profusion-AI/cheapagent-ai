// Day-30 hosted-API gate readout (30-day plan v2 + phased dev plan, Phase 4.5).
//
// Prints the three gate-criteria numbers from the places they actually live —
// Blobs aggregate counters, Netlify Forms, and the manual tally doc — so the
// day-30 decision is read mechanically, not argued anecdotally. Committed on
// the day instrumentation went live (2026-06-12); run it any day; decide on
// day 30 (2026-07-09).
//
// Usage:
//   NETLIFY_AUTH_TOKEN=... NETLIFY_SITE_ID=... node scripts/gate-readout.mjs
//
// NETLIFY_AUTH_TOKEN: a personal access token (Netlify dashboard → User
// settings → Applications). NETLIFY_SITE_ID: the site's API ID (Site
// configuration → Site details). Both are read-only uses here.
//
// Netlify Analytics (if the docs/analytics-decision.md adoption was enabled)
// is dashboard-only: append visitor/pageview numbers to the readout by hand.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { getStore } from "@netlify/blobs";

const GATE = {
  intentSignals: 20, // waitlist + /go clicks + direct asks
  payingNeedingHosted: 2,
  blockedTeamConversations: 1,
};
const FORM_NAME = "api-early-access";
const METRICS_PREFIX = "metrics/daily/";
const TALLY_PATH = fileURLToPath(new URL("../docs/gate-tally.md", import.meta.url));

const siteID = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!siteID || !token) {
  console.error("Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN (read-only readout).");
  process.exit(1);
}

// ---- Blobs: sum the daily aggregate counters -------------------------------
const store = getStore({ name: "cheapagent-usage", siteID, token });
const totals = {};
const { blobs } = await store.list({ prefix: METRICS_PREFIX });
for (const blob of blobs) {
  const day = await store.get(blob.key, { type: "json" });
  for (const [field, amount] of Object.entries(day ?? {})) {
    if (Number.isInteger(amount)) totals[field] = (totals[field] ?? 0) + amount;
  }
}

// ---- Netlify Forms: waitlist submission count ------------------------------
const formsResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteID}/forms`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!formsResponse.ok) {
  console.error(`Netlify Forms API: HTTP ${formsResponse.status}`);
  process.exit(1);
}
const forms = await formsResponse.json();
const waitlist = forms.find((form) => form.name === FORM_NAME);
const waitlistCount = waitlist?.submission_count ?? 0;

// ---- Manual tally doc: bullets under each section, plus deductions ---------
// Verification deductions exist because we test the real production counters
// after deploys; honest counting means subtracting our own clicks.
const tally = readTally(TALLY_PATH);
const deductions = {};
for (const line of tally["verification deductions"] ?? []) {
  const match = line.match(/^\S+\s+(\S+)\s+(\d+)/);
  if (match) deductions[match[1]] = (deductions[match[1]] ?? 0) + Number(match[2]);
}
const counter = (field) => Math.max(0, (totals[field] ?? 0) - (deductions[field] ?? 0));

const goPro = counter("go_pro_clicks");
const goEnterprise = counter("go_enterprise_clicks");
const directAsks = (tally["direct asks"] ?? []).length;
const paying = (tally["paying customers needing hosted"] ?? []).length;
const blockedConversations = (tally["team conversations blocked on hosted"] ?? []).length;

const intentSignals = waitlistCount + goPro + goEnterprise + directAsks;
const met = [
  intentSignals >= GATE.intentSignals,
  paying >= GATE.payingNeedingHosted,
  blockedConversations >= GATE.blockedTeamConversations,
];
const passed = met.filter(Boolean).length >= 2;

const flag = (ok) => (ok ? "MET    " : "not met");
console.log("Day-30 hosted-API gate readout —", new Date().toISOString().slice(0, 10));
console.log("");
console.log(`1. Intent signals          ${String(intentSignals).padStart(4)} / ${GATE.intentSignals}   ${flag(met[0])}`);
console.log(`     waitlist submissions  ${String(waitlistCount).padStart(4)}`);
console.log(`     /go/pro clicks        ${String(goPro).padStart(4)}${deductions.go_pro_clicks ? `   (raw ${totals.go_pro_clicks ?? 0}, −${deductions.go_pro_clicks} verification)` : ""}`);
console.log(`     /go/enterprise clicks ${String(goEnterprise).padStart(4)}${deductions.go_enterprise_clicks ? `   (raw ${totals.go_enterprise_clicks ?? 0}, −${deductions.go_enterprise_clicks} verification)` : ""}`);
console.log(`     direct asks (tally)   ${String(directAsks).padStart(4)}`);
console.log(`2. Paying, needing hosted  ${String(paying).padStart(4)} / ${GATE.payingNeedingHosted}    ${flag(met[1])}`);
console.log(`3. Blocked team convos     ${String(blockedConversations).padStart(4)} / ${GATE.blockedTeamConversations}    ${flag(met[2])}`);
console.log("");
console.log(`GATE (any two): ${passed ? "PASS — build the hosted beta (days 31–45)" : "FAIL — redirect days 31–60 to MCP/CI depth; nothing built early is wasted"}`);
console.log("");
console.log("Supporting (not gate criteria):");
console.log(`     feedback useful/not    ${counter("feedback_useful")} / ${counter("feedback_not_useful")}`);
console.log(`     copies out/summary     ${counter("copies_output")} / ${counter("copies_summary")}`);
console.log(`     downloads              ${counter("downloads")}`);
console.log(`     conversions debited    ${totals.debits_allowed ?? 0}`);
console.log("");
console.log("Append by hand if enabled (docs/analytics-decision.md): Netlify Analytics");
console.log("visitors + /api.html pageviews from the dashboard.");

function readTally(path) {
  const sections = {};
  let current = null;
  let text = "";
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.warn(`(no ${path} — manual tallies count as zero)`);
    return sections;
  }
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].toLowerCase().replace(/\s*\(.*\)$/, "");
      sections[current] ??= [];
    } else if (current && /^-\s+\S/.test(line)) {
      sections[current].push(line.replace(/^-\s+/, ""));
    }
  }
  return sections;
}
