import { runVerdict, buildContextPlan } from "doc2toon/browser";
import { initAuth, onAuthChange, currentUser, openSignIn, signOut, authToken } from "./auth.js";
import { initConsentBanner, functionalStorageAllowed } from "./consent.js";

const ANON_CHAR_LIMIT = 1000;
const DAILY_CHAR_LIMIT = 15000;
const USAGE_ENDPOINT = "/.netlify/functions/usage";
const FEEDBACK_ENDPOINT = "/api/feedback";

const root = document.documentElement;
const nav = document.querySelector("#nav");
const form = document.querySelector("#alpha-form");
const sourceInput = document.querySelector("#source-input");
const fileInput = document.querySelector("#file-input");
const sampleButton = document.querySelector("#sample-button");
const resetButton = document.querySelector("#reset-button");
const themeToggle = document.querySelector("#theme-toggle");
const ctaCopy = document.querySelector("#cta-copy");

const signinButton = document.querySelector("#signin-button");
const accountChip = document.querySelector("#account-chip");
const accountEmail = document.querySelector("#account-email");
const signoutButton = document.querySelector("#signout-button");
const quotaMeta = document.querySelector("#quota-meta");

const srcName = document.querySelector("#src-name");
const charCount = document.querySelector("#char-count");
const inputNotice = document.querySelector("#input-notice");
const limitCta = document.querySelector("#limit-cta");
const resultSummary = document.querySelector("#result-summary");
const statusBadge = document.querySelector("#status-badge");
const resultEmpty = document.querySelector("#result-empty");
const measuring = document.querySelector("#measuring");
const measuringText = document.querySelector("#measuring-text");
const resultLive = document.querySelector("#result-live");

const verdictTitle = document.querySelector("#verdict-title");
const verdictBody = document.querySelector("#verdict-body");
const sourceChars = document.querySelector("#source-chars");
const sourceTokens = document.querySelector("#source-tokens");
const toonChars = document.querySelector("#toon-chars");
const toonTokens = document.querySelector("#toon-tokens");
const tokenDelta = document.querySelector("#token-delta");
const tokenPercent = document.querySelector("#token-percent");
const warningsList = document.querySelector("#warnings-list");
const output = document.querySelector("#output");
const copyButton = document.querySelector("#copy-button");
const copySummaryButton = document.querySelector("#copy-summary-button");
const downloadButton = document.querySelector("#download-button");
const usefulButton = document.querySelector("#useful-button");
const notUsefulButton = document.querySelector("#not-useful-button");
const toonName = document.querySelector("#toon-name");

const planBlock = document.querySelector("#plan-block");
const planRows = document.querySelector("#plan-rows");
const planNet = document.querySelector("#plan-net");
const copyPlanButton = document.querySelector("#copy-plan-button");
const downloadHybridButton = document.querySelector("#download-hybrid-button");

const beforeBar = document.querySelector("#ba-before");
const afterBar = document.querySelector("#ba-after");
const beforeNumber = document.querySelector("#ba-before-n");
const afterNumber = document.querySelector("#ba-after-n");

let activeMode = "claude";
let latestToon = "";
let latestVerdict = null;
let latestFilename = "cheapagent-output.toon";
let latestPlan = null;
let latestHybrid = "";
let latestHybridFilename = "document.hybrid.md";
let usingSample = false;
let dailyQuota = null;

const samples = {
  claude: `# CLAUDE.md

## Build Gate

- The converter must validate official TOON round trips before writing output.
- The converter must validate the official TOON round trip before output is written.
- Be careful and use good judgement.

## Operating Guidance

When reviewing conversion behavior, release behavior, privacy behavior, UI behavior, and test behavior, keep notes short and evidence-linked.

- Make the output better where possible.
- Report measured character and token savings.
- Do not claim fixed savings percentages.
`,
  agents: `# AGENTS.md

## Operating Standard

- Start from current local truth before making claims.
- Start from the current files before making claims.
- Use common sense when handling ambiguous instructions.

## Workflow

When converting agent instructions, review parsing behavior, privacy posture, UI output, docs wording, release notes, and validation coverage.

- Keep the canonical rule short.
- Move detailed procedures into focused skill files when a section becomes overloaded.
`,
  skill: `# SKILL.md

## Trigger

Use this skill when agent context needs conversion, release prep, docs review, UI validation, privacy review, and testing in one pass.

## Rules

- The agent must validate official TOON round trips before writing output.
- The agent must validate the official TOON round trip before output is written.
- Optimize where appropriate.
- Keep quality high.
`,
  toon: `# Definitions

## Context Budget

Definition: The amount of context an agent has to carry before it can do the task.
Tags: context, tokens

## Review Gate

Definition: A point where a human confirms the next workflow step before execution.
Tags: review, approval

## Capability Boundary

Definition: The stated limit of what a tool can safely claim or perform.
Tags: safety, scope
`,
};

const modeConfig = {
  claude: {
    label: "CLAUDE.md optimization",
    sourceName: "CLAUDE.md",
    mode: "record",
    filename: "claude.optimized.toon",
    hybridFilename: "claude.hybrid.md",
  },
  agents: {
    label: "AGENTS.md optimization",
    sourceName: "AGENTS.md",
    mode: "record",
    filename: "agents.optimized.toon",
    hybridFilename: "agents.hybrid.md",
  },
  skill: {
    label: "SKILL.md optimization",
    sourceName: "SKILL.md",
    mode: "record",
    filename: "skill.optimized.toon",
    hybridFilename: "skill.hybrid.md",
  },
  toon: {
    label: "Document to TOON",
    sourceName: "definitions.md",
    mode: "lossless",
    filename: "document.toon",
    hybridFilename: "document.hybrid.md",
  },
};

// Labels for the verdict contract's warning codes (schemas/verdict.v1.json). The code set is
// open: unknown codes render as the code itself plus the engine's message.
const warningLabels = {
  duplicate_rule: "Duplicate instruction",
  vague_rule: "Vague instruction",
  long_section: "Long section",
  split_candidate: "Split candidate",
  low_coverage: "Low content coverage",
  lossy_applied: "Lossy output",
  negative_savings: "Output larger than source",
  target_not_reached: "Budget target missed",
  budget_refused: "Budget refused",
};

const warningExplanations = {
  duplicate_rule: "This rule appears more than once. Merge it before sending context to an agent.",
  vague_rule: "This rule is too broad to be reliably followed. Make it specific or remove it.",
  long_section: "This block is carrying too much. Split it into smaller, named sections.",
  split_candidate: "This section may convert better as its own context block.",
};

// Presentation for VerdictV1.verdict. The decision comes from doc2toon's buildVerdict — the
// same policy behind the CLI, MCP, and serve surfaces. The web renders it, never re-derives it.
const verdictPresentation = {
  convert: {
    title: "TOON helps here.",
    body: "This input has enough structure to shrink cleanly. Copy the TOON output or download it.",
    badge: "TOON helps",
    state: "optimized",
  },
  keep_markdown: {
    title: "Keep Markdown.",
    body: "TOON does not improve this input. Keep the original or split the doc first.",
    badge: "keep md",
    state: "info",
  },
  split_first: {
    title: "Split first.",
    body: "Long or mixed sections are hiding the savings. Break the doc into cleaner parts before converting.",
    badge: "split first",
    state: "info",
  },
  review: {
    title: "Review before copying.",
    body: "CheapAgent found issues that may affect agent behavior. Check the warnings before using the output.",
    badge: "review",
    state: "info",
  },
  refused: {
    title: "Budget refused.",
    body: "The token budget cannot be met losslessly, and lossy output was not permitted. Raise the budget or allow lossy mode.",
    badge: "refused",
    state: "info",
  },
};

function selectedConfig() {
  return modeConfig[activeMode] ?? modeConfig.claude;
}

function detectFlavor(text) {
  if (/^\s*#{1,6}\s+/m.test(text) || /^\s*[-+*]\s+/m.test(text) || /\|.+\|/.test(text)) {
    return "markdown";
  }
  return "text";
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatSigned(value) {
  if (value > 0) {
    return `-${formatNumber(value)}`;
  }
  if (value < 0) {
    return `+${formatNumber(Math.abs(value))}`;
  }
  return "0";
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(1)}%`;
}

function setNotice(message) {
  inputNotice.textContent = message;
}

function setStatus(text, state) {
  statusBadge.textContent = text;
  statusBadge.dataset.state = state;
}

function setPanelState(state) {
  resultEmpty.classList.toggle("show", state === "empty");
  measuring.classList.toggle("show", state === "measuring");
  resultLive.classList.toggle("show", state === "live");
}

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  root.dataset.theme = nextTheme;
  if (!functionalStorageAllowed()) {
    return;
  }
  try {
    localStorage.setItem("cheapagent-theme", nextTheme);
  } catch {
    // Theme persistence is optional.
  }
}

function updateNav() {
  nav.classList.toggle("scrolled", window.scrollY > 12);
}

function initReveal() {
  if (!("IntersectionObserver" in window)) {
    return;
  }
  const targets = [...document.querySelectorAll(".reveal, .pipe-step")];
  if (targets.length === 0) {
    return;
  }
  document.querySelectorAll(".pipe-step").forEach((step, index) => {
    if (!step.dataset.d) {
      step.dataset.d = String(Math.min(index + 1, 4));
    }
  });
  root.classList.add("reveal-ready");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.1 },
  );
  for (const target of targets) {
    observer.observe(target);
  }
}

function updateModeButtons() {
  document.querySelectorAll(".demo-mode").forEach((button) => {
    const isActive = button.dataset.mode === activeMode;
    button.setAttribute("aria-checked", String(isActive));
    button.setAttribute("aria-selected", String(isActive));
  });
}

function charLimit() {
  // Signed-in: honor the account's server-side allowance once the quota is
  // known — a hand-issued Pro/partner entitlement raises dailyQuota.limit above
  // the default, so "larger browser allowance" is real and not just a label.
  // Fall back to the free constant before the first quota response arrives.
  if (currentUser()) {
    return dailyQuota?.limit ?? DAILY_CHAR_LIMIT;
  }
  return ANON_CHAR_LIMIT;
}

function updateCharCount() {
  charCount.textContent = `${formatNumber(sourceInput.value.length)} / ${formatNumber(charLimit())} chars`;
}

function enforceLimit(text) {
  const limit = charLimit();
  if (text.length <= limit) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, limit), truncated: true };
}

function renderQuota() {
  if (!currentUser()) {
    quotaMeta.hidden = true;
  } else {
    quotaMeta.hidden = false;
    quotaMeta.textContent = dailyQuota
      ? `${formatNumber(dailyQuota.remaining)} of ${formatNumber(dailyQuota.limit)} chars left today`
      : `up to ${formatNumber(DAILY_CHAR_LIMIT)} chars per day`;
  }
  // Keep the "/ N chars" denominator in sync with the effective allowance once
  // a Pro entitlement lifts dailyQuota.limit above the default.
  updateCharCount();
}

function renderAuth(user) {
  signinButton.hidden = Boolean(user);
  accountChip.hidden = !user;
  accountEmail.textContent = user?.email ?? "";
  updateCharCount();
  renderQuota();
}

async function refreshQuota() {
  const token = await authToken();
  if (!token) {
    dailyQuota = null;
    renderQuota();
    return;
  }
  try {
    const response = await fetch(USAGE_ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      dailyQuota = await response.json();
    }
  } catch {
    // Quota display is informational; the debit call still enforces the limit.
  }
  renderQuota();
}

// Asks the server to debit today's allowance before converting. Only the
// character count is sent; the document body never leaves the browser.
async function debitQuota(chars) {
  const token = await authToken();
  if (!token) {
    return { ok: false, reason: "auth" };
  }
  try {
    const response = await fetch(USAGE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ chars }),
    });
    if (!response.ok) {
      return { ok: false, reason: "unavailable" };
    }
    const result = await response.json();
    dailyQuota = result;
    renderQuota();
    return result.allowed ? { ok: true } : { ok: false, reason: "quota", remaining: result.remaining };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

function resetOutput(message = "Run a check to see whether TOON helps this input.") {
  resultSummary.textContent = message;
  setStatus("ready", "info");
  setPanelState("empty");
  verdictTitle.textContent = "Run a check.";
  verdictBody.textContent = "CheapAgent will say whether TOON helps this input.";
  sourceChars.textContent = "0";
  sourceTokens.textContent = "~0 tokens";
  toonChars.textContent = "0";
  toonTokens.textContent = "~0 tokens";
  tokenDelta.textContent = "0";
  tokenPercent.textContent = "0%";
  warningsList.innerHTML = "";
  output.textContent = "";
  toonName.textContent = selectedConfig().filename;
  latestToon = "";
  latestVerdict = null;
  latestFilename = selectedConfig().filename;
  latestPlan = null;
  latestHybrid = "";
  latestHybridFilename = selectedConfig().hybridFilename;
  planBlock.hidden = true;
  planRows.innerHTML = "";
  planNet.textContent = "";
  copyButton.disabled = true;
  copySummaryButton.disabled = true;
  downloadButton.disabled = true;
  copyPlanButton.disabled = true;
  downloadHybridButton.disabled = true;
  usefulButton.disabled = true;
  notUsefulButton.disabled = true;
  beforeBar.style.width = "0%";
  afterBar.style.width = "0%";
  beforeNumber.textContent = "0 tok";
  afterNumber.textContent = "0 tok";
}

function clearInput() {
  sourceInput.value = "";
  usingSample = false;
  srcName.textContent = "Source doc";
  latestFilename = selectedConfig().filename;
  toonName.textContent = selectedConfig().filename;
  updateCharCount();
  setNotice("Measured locally. Document text is not stored by default.");
  resetOutput();
}

function loadSample({ run = false } = {}) {
  const config = selectedConfig();
  const { text, truncated } = enforceLimit(samples[activeMode]);
  sourceInput.value = text;
  usingSample = true;
  srcName.textContent = config.sourceName;
  updateCharCount();
  latestFilename = config.filename;
  toonName.textContent = config.filename;
  setNotice(
    truncated
      ? `Sample was truncated to the ${formatNumber(charLimit())}-character limit.`
      : "Loaded sample locally. Run check to see the verdict.",
  );
  if (run) {
    runConversion();
  } else {
    resetOutput();
  }
}

function renderWarnings(verdict) {
  const cards = [];

  for (const warning of verdict.warnings ?? []) {
    const severity = escapeHtml(warning.severity ?? "info");
    const lineStart = warning.range?.line_start;
    const lineEnd = warning.range?.line_end;
    const location = lineStart
      ? `line ${lineEnd && lineEnd !== lineStart ? `${lineStart}-${lineEnd}` : lineStart}`
      : "source";
    const detail = warningExplanations[warning.code] ?? `${warning.message} ${warning.suggestion ?? ""}`.trim();
    cards.push(`
      <article class="warning-card" data-severity="${severity}">
        <span class="wn">${escapeHtml(warning.code?.slice(0, 1).toUpperCase() ?? "I")}</span>
        <span class="wt">${escapeHtml(warningLabels[warning.code] ?? warning.code)}
          <small>${escapeHtml(detail)}</small>
          ${warning.evidence ? `<small class="evidence">${escapeHtml(warning.evidence)}</small>` : ""}
        </span>
        <span class="wa">${escapeHtml(location)}</span>
      </article>
    `);
  }

  if (cards.length === 0) {
    warningsList.innerHTML = '<p class="empty-state">No bloat warnings fired for this input. Clean does not mean TOON wins.</p>';
    return;
  }

  warningsList.innerHTML = cards.join("");
}

// Renders the context plan (Verdict 1.1 context_plan) under the verdict card. The plan comes
// from doc2toon's buildContextPlan — every heading-bounded section measured standalone under
// the unchanged frozen policy, lossless-only, splice overhead counted. The web renders the
// engine's plan and never re-derives it. A single-section document degenerates to the
// whole-doc verdict, so the table would only repeat the card — the block stays hidden.
function renderPlan(planResult) {
  if (!planResult || planResult.plan.sections.length < 2) {
    latestPlan = null;
    latestHybrid = "";
    planBlock.hidden = true;
    planRows.innerHTML = "";
    planNet.textContent = "";
    copyPlanButton.disabled = true;
    downloadHybridButton.disabled = true;
    return false;
  }

  const plan = planResult.plan;
  const rows = plan.sections.map((section) => {
    const name =
      section.kind === "frontmatter" ? "(frontmatter)" : section.heading ?? "(preamble)";
    const lines = `lines ${section.range.line_start}-${section.range.line_end}`;
    const measured = section.measured_chars;
    const delta = measured
      ? `${measured.savings_pct > 0 ? "+" : ""}${measured.savings_pct.toFixed(1)}%`
      : "not measured";
    return `
      <tr class="${section.action === "convert" ? "convert" : ""}">
        <td>${escapeHtml(name)} <small class="plan-lines">${escapeHtml(lines)}</small></td>
        <td>${escapeHtml(section.profile ?? "—")}</td>
        <td class="plan-num">${escapeHtml(delta)}</td>
        <td>${escapeHtml(section.verdict ?? "—")}</td>
        <td class="plan-action" data-action="${escapeHtml(section.action)}">${escapeHtml(section.action)}</td>
      </tr>
    `;
  });
  planRows.innerHTML = rows.join("");

  const converted = plan.sections.filter((section) => section.action === "convert").length;
  planNet.textContent = [
    `sections: ${plan.sections.length} (${converted} convert, ${plan.sections.length - converted} keep)`,
    `net (splice overhead included): ${formatNumber(plan.net.source)} → ${formatNumber(plan.net.hybrid)} chars (${plan.net.savings_pct > 0 ? "+" : ""}${plan.net.savings_pct.toFixed(1)}%)`,
    `recommend_hybrid: ${plan.recommend_hybrid}`,
    `reassembly_verified: ${plan.reassembly_verified}`,
    `safe_to_auto_apply: ${plan.safe_to_auto_apply}`,
  ].join(" · ");

  latestPlan = planResult.verdict;
  latestHybrid = converted > 0 ? planResult.hybrid : "";
  copyPlanButton.disabled = false;
  downloadHybridButton.disabled = converted === 0;
  planBlock.hidden = false;
  return true;
}

function renderResult(verdict, config, planResult) {
  const presentation = verdictPresentation[verdict.verdict] ?? verdictPresentation.review;
  const planShown = renderPlan(planResult);
  const chars = verdict.measured_chars;
  const tokens = verdict.token_estimates;
  const larger = tokens.savings < 0;
  const sourceTokenCount = Math.max(1, tokens.source);
  const toonTokenCount = Math.max(1, tokens.toon);
  const afterWidth = Math.min(100, Math.max(8, (toonTokenCount / sourceTokenCount) * 100));

  sourceChars.textContent = formatNumber(chars.source);
  sourceTokens.textContent = `~${formatNumber(tokens.source)} tokens`;
  toonChars.textContent = formatNumber(chars.toon);
  toonTokens.textContent = `~${formatNumber(tokens.toon)} tokens`;
  tokenDelta.textContent = formatSigned(tokens.savings);
  tokenPercent.textContent = larger ? `${formatPercent(Math.abs(tokens.savings_pct))} larger` : `${formatPercent(tokens.savings_pct)} saved`;

  beforeBar.style.width = "100%";
  afterBar.style.width = `${afterWidth}%`;
  beforeNumber.textContent = `${formatNumber(tokens.source)} tok`;
  afterNumber.textContent = `${formatNumber(tokens.toon)} tok`;

  verdictTitle.textContent = presentation.title;
  verdictBody.textContent =
    planShown && verdict.verdict === "split_first"
      ? `${presentation.body} …and here's the plan: every section below, measured standalone.`
      : presentation.body;
  resultSummary.textContent = `${presentation.title} ${presentation.body}`;
  setStatus(presentation.badge, presentation.state);
  renderWarnings(verdict);

  latestVerdict = verdict;
  latestToon = verdict.toon_candidate ?? "";
  latestFilename = config.filename;
  latestHybridFilename = config.hybridFilename;
  toonName.textContent = config.filename;
  output.textContent = latestToon;
  copyButton.disabled = !latestToon;
  copySummaryButton.disabled = false;
  downloadButton.disabled = !latestToon;
  usefulButton.disabled = false;
  notUsefulButton.disabled = false;
  setNotice(
    chars.savings > 0
      ? `Measured ${formatNumber(chars.source)} characters locally.`
      : "TOON did not win. This output is larger or less useful than the source. Keep Markdown or split the doc first.",
  );
  setPanelState("live");
}

async function runConversion() {
  const text = sourceInput.value.trimEnd();
  updateCharCount();
  // Reset the limit CTA each run; only the exhausted-allowance branch re-shows it.
  if (limitCta) limitCta.hidden = true;

  if (!text.trim()) {
    resetOutput("No text found. Upload a .md or .txt file, or paste text directly.");
    setNotice("No text found. Upload a .md or .txt file, or paste text directly.");
    return;
  }

  if (currentUser() && !usingSample) {
    const debit = await debitQuota(text.length);
    if (!debit.ok && (debit.reason === "quota")) {
      resetOutput("Today's signed-in allowance is used up.");
      setStatus("limit", "error");
      setNotice(`Daily limit reached: ${formatNumber(debit.remaining ?? 0)} of ${formatNumber(dailyQuota?.limit ?? DAILY_CHAR_LIMIT)} characters left today. The allowance resets at midnight UTC.`);
      // Pain-moment CTA (Phase 6 promotion): only shown when a signed-in account
      // actually exhausts its allowance — never a generic banner.
      if (limitCta) limitCta.hidden = false;
      return;
    }
    if (!debit.ok && text.length > ANON_CHAR_LIMIT) {
      resetOutput("The usage service is unreachable, so the signed-in allowance cannot be confirmed.");
      setStatus("offline", "error");
      setNotice(`Could not reach the usage service. Inputs up to ${formatNumber(ANON_CHAR_LIMIT)} characters still work without it.`);
      return;
    }
    if (!debit.ok) {
      setNotice("Usage service unreachable; running under the anonymous limit.");
    }
  }

  const config = selectedConfig();
  setStatus("measuring", "info");
  setPanelState("measuring");
  measuringText.textContent = "Profiling structure...";

  window.setTimeout(() => {
    try {
      measuringText.textContent = "Encoding TOON...";
      const flavor = activeMode === "toon" ? detectFlavor(text) : "markdown";
      const verdict = runVerdict(text, {
        flavor,
        sourceType: "paste",
        mode: config.mode,
        delimiter: "auto",
      });
      // The plan is its own lossless-only surface (context-plan-design.md §2), independent
      // of the tab's conversion mode — same as the CLI's `plan` vs `convert --mode`.
      const planResult = buildContextPlan(text, { flavor, sourceType: "paste" });
      renderResult(verdict, config, planResult);
    } catch (error) {
      resetOutput("Review before copying.");
      setStatus("error", "error");
      warningsList.innerHTML = `
        <article class="warning-card" data-severity="warning">
          <span class="wn">!</span>
          <span class="wt">Conversion error<small>${escapeHtml(error instanceof Error ? error.message : String(error))}</small></span>
          <span class="wa">review</span>
        </article>
      `;
      setPanelState("live");
    }
  }, 120);
}

// Signed-in-only result-action deltas (plan-v2 tracked metrics): reports
// which action was clicked — an enum value, never content. Fire-and-forget:
// the click's real work never waits on it, and anonymous use stays
// request-free because authToken() resolves null without a session.
async function recordResultAction(eventName) {
  try {
    const token = await authToken();
    if (!token) {
      return;
    }
    await fetch(USAGE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ event: eventName }),
    });
  } catch {
    // Counting is best-effort by design; the action already succeeded.
  }
}

// One explicit click, one anonymous bit. Buttons disable after voting so a
// result can be voted on once; a new run re-enables them.
async function sendFeedback(useful) {
  usefulButton.disabled = true;
  notUsefulButton.disabled = true;
  setNotice(
    useful
      ? "Thanks — counted as one anonymous “useful”. Nothing else was sent."
      : "Thanks — counted as one anonymous “not useful”. Nothing else was sent.",
  );
  try {
    await fetch(FEEDBACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useful }),
    });
  } catch {
    // Best-effort: an uncounted vote is an undercount, never a retry loop.
  }
}

async function copyOutput() {
  if (!latestToon) {
    return;
  }
  const copied = await copyText(latestToon);
  setNotice(copied ? "Copied output." : "Clipboard access is unavailable. Select the TOON output manually.");
  if (copied) {
    recordResultAction("copy_output");
  }
}

// A shareable, paste-anywhere rendering of VerdictV1 built from the schema's own field names.
// Deliberately excludes the document body and the TOON output: the summary is the receipt.
function buildSummaryText(verdict) {
  const chars = verdict.measured_chars;
  const tokens = verdict.token_estimates;
  const warningSummary = (verdict.warnings ?? [])
    .map((warning) => `${warning.code} (${warning.severity})`)
    .join(", ");
  return [
    "CheapAgent context check — To TOONify or not?",
    `verdict: ${verdict.verdict}`,
    `safe_to_auto_apply: ${verdict.safe_to_auto_apply}`,
    `profile: ${verdict.profile.name} (${verdict.profile.source_type})`,
    `measured_chars: source ${chars.source} → toon ${chars.toon} (savings_pct: ${chars.savings_pct.toFixed(1)})`,
    `token_estimates (${tokens.estimator}): ~${tokens.source} → ~${tokens.toon} tokens`,
    `warnings: ${warningSummary || "none"}`,
    `mode: ${verdict.mode}`,
    "Run yours: https://cheapagent.ai",
  ].join("\n");
}

async function copySummary() {
  if (!latestVerdict) {
    return;
  }
  const copied = await copyText(buildSummaryText(latestVerdict));
  setNotice(
    copied
      ? "Copied verdict summary. No document text is included."
      : "Clipboard access is unavailable. Select the TOON output manually.",
  );
  if (copied) {
    recordResultAction("copy_summary");
  }
}

// A shareable rendering of the context plan built from the schema's own field names, in the
// Copy-summary style. It includes the document's own section headings (the plan's evidence
// rows) but never section bodies and never TOON output.
function buildPlanText(planVerdict) {
  const plan = planVerdict.context_plan;
  const converted = plan.sections.filter((section) => section.action === "convert").length;
  const sectionLines = plan.sections.map((section) => {
    const name =
      section.kind === "frontmatter" ? "(frontmatter)" : section.heading ?? "(preamble)";
    const measured = section.measured_chars
      ? `savings_pct: ${section.measured_chars.savings_pct.toFixed(1)}`
      : "not measured";
    const verdictPart = section.verdict ? `, verdict: ${section.verdict}` : "";
    return `- ${section.action} "${name}" (${section.profile ?? section.kind}, ${measured}${verdictPart})`;
  });
  return [
    "CheapAgent context plan — convert the parts that win",
    `document verdict: ${planVerdict.verdict}`,
    `sections: ${plan.sections.length} (${converted} convert, ${plan.sections.length - converted} keep)`,
    ...sectionLines,
    `net (splice overhead included): source ${plan.net.source} → hybrid ${plan.net.hybrid} chars (savings_pct: ${plan.net.savings_pct.toFixed(1)})`,
    `recommend_hybrid: ${plan.recommend_hybrid}`,
    `reassembly_verified: ${plan.reassembly_verified}`,
    `safe_to_auto_apply: ${plan.safe_to_auto_apply}`,
    "Run yours: https://cheapagent.ai",
  ].join("\n");
}

async function copyPlan() {
  if (!latestPlan?.context_plan) {
    return;
  }
  const copied = await copyText(buildPlanText(latestPlan));
  setNotice(
    copied
      ? "Copied plan. Section headings are included; section text and TOON output are not."
      : "Clipboard access is unavailable. Select the TOON output manually.",
  );
}

function downloadHybrid() {
  if (!latestHybrid || !latestPlan?.context_plan) {
    return;
  }
  const blob = new Blob([latestHybrid], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = latestHybridFilename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setNotice(
    latestPlan.context_plan.recommend_hybrid
      ? `Downloaded ${latestHybridFilename}: converted sections as fenced TOON, everything else byte-identical.`
      : `Downloaded ${latestHybridFilename}. Note: the measured net is below the 5% band, so the plan does not recommend it — the plan informs, you decide.`,
  );
  recordResultAction("download");
}

function downloadOutput() {
  if (!latestToon) {
    return;
  }
  const blob = new Blob([latestToon], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = latestFilename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setNotice(`Downloaded ${latestFilename}.`);
  recordResultAction("download");
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back below.
  }
  return fallbackCopy(text);
}

function fallbackCopy(text) {
  const copySource = document.createElement("textarea");
  copySource.value = text;
  copySource.setAttribute("readonly", "");
  copySource.style.position = "fixed";
  copySource.style.opacity = "0";
  document.body.append(copySource);
  copySource.select();
  const copied = document.execCommand("copy");
  copySource.remove();
  return copied;
}

function setMode(mode) {
  activeMode = modeConfig[mode] ? mode : "claude";
  updateModeButtons();
  if (usingSample) {
    loadSample({ run: false });
    return;
  }

  const config = selectedConfig();
  srcName.textContent = sourceInput.value.trim() ? config.sourceName : "Source doc";
  latestFilename = config.filename;
  toonName.textContent = config.filename;
  if (sourceInput.value.trim()) {
    runConversion();
  } else {
    resetOutput();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runConversion();
});

sourceInput.addEventListener("input", () => {
  usingSample = false;
  const { text, truncated } = enforceLimit(sourceInput.value);
  if (truncated) {
    sourceInput.value = text;
    setNotice(
      currentUser()
        ? `Per-run limit reached at ${formatNumber(DAILY_CHAR_LIMIT)} characters.`
        : `Anonymous limit reached at ${formatNumber(ANON_CHAR_LIMIT)} characters. Sign in for ${formatNumber(DAILY_CHAR_LIMIT)} characters per day.`,
    );
  }
  updateCharCount();
});

fileInput.addEventListener("change", async () => {
  const [file] = fileInput.files ?? [];
  if (!file) {
    return;
  }

  const allowed = /\.(md|txt)$/i.test(file.name) || ["text/markdown", "text/plain", ""].includes(file.type);
  if (!allowed) {
    setNotice("Only .md and .txt files are supported in this beta.");
    fileInput.value = "";
    return;
  }

  const rawText = await file.text();
  if (!rawText.trim()) {
    resetOutput("No text found. Upload a .md or .txt file, or paste text directly.");
    setNotice("No text found. Upload a .md or .txt file, or paste text directly.");
    fileInput.value = "";
    return;
  }
  const { text, truncated } = enforceLimit(rawText);
  sourceInput.value = text;
  usingSample = false;
  srcName.textContent = file.name;
  updateCharCount();
  setNotice(
    truncated
      ? `${file.name} was truncated to the ${formatNumber(charLimit())}-character limit.`
      : `Loaded ${file.name} locally. Run check to see the verdict.`,
  );
  resetOutput();
});

document.querySelectorAll(".demo-mode").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
  button.addEventListener("keydown", (event) => {
    const buttons = [...document.querySelectorAll(".demo-mode")];
    const index = buttons.indexOf(button);
    const last = buttons.length - 1;
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    } else {
      return;
    }
    event.preventDefault();
    buttons[next].focus();
    setMode(buttons[next].dataset.mode);
  });
});

sampleButton.addEventListener("click", () => loadSample());
resetButton.addEventListener("click", clearInput);
copyButton.addEventListener("click", copyOutput);
copySummaryButton.addEventListener("click", copySummary);
downloadButton.addEventListener("click", downloadOutput);
copyPlanButton.addEventListener("click", copyPlan);
downloadHybridButton.addEventListener("click", downloadHybrid);
usefulButton.addEventListener("click", () => sendFeedback(true));
notUsefulButton.addEventListener("click", () => sendFeedback(false));
themeToggle.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});
ctaCopy.addEventListener("click", async () => {
  const copied = await copyText("doc2toon convert CLAUDE.md --stats");
  setNotice(copied ? "Copied example command." : "Clipboard access is unavailable.");
});

signinButton.addEventListener("click", openSignIn);
signoutButton.addEventListener("click", () => {
  signOut();
  dailyQuota = null;
});

onAuthChange((user) => {
  renderAuth(user);
  if (user) {
    refreshQuota();
  } else {
    dailyQuota = null;
    const { text, truncated } = enforceLimit(sourceInput.value);
    if (truncated) {
      sourceInput.value = text;
      setNotice(`Signed out: input trimmed to the anonymous ${formatNumber(ANON_CHAR_LIMIT)}-character limit.`);
      updateCharCount();
    }
  }
});

initAuth();
renderAuth(currentUser());

initConsentBanner({
  onChange: (choice) => {
    if (choice === "all") {
      setTheme(root.dataset.theme);
      return;
    }
    try {
      localStorage.removeItem("cheapagent-theme");
    } catch {
      // Nothing stored means nothing to clear.
    }
  },
});

window.addEventListener("scroll", updateNav, { passive: true });

try {
  setTheme(localStorage.getItem("cheapagent-theme") ?? "dark");
} catch {
  setTheme("dark");
}

updateNav();
updateModeButtons();
initReveal();
clearInput();
