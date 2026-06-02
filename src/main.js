import { convertTextToToon } from "doc2toon/browser";

const CHAR_LIMIT = 1000;

const root = document.documentElement;
const nav = document.querySelector("#nav");
const form = document.querySelector("#alpha-form");
const sourceInput = document.querySelector("#source-input");
const fileInput = document.querySelector("#file-input");
const sampleButton = document.querySelector("#sample-button");
const resetButton = document.querySelector("#reset-button");
const themeToggle = document.querySelector("#theme-toggle");
const ctaCopy = document.querySelector("#cta-copy");

const srcName = document.querySelector("#src-name");
const charCount = document.querySelector("#char-count");
const inputNotice = document.querySelector("#input-notice");
const resultSummary = document.querySelector("#result-summary");
const statusBadge = document.querySelector("#status-badge");
const resultEmpty = document.querySelector("#result-empty");
const measuring = document.querySelector("#measuring");
const measuringText = document.querySelector("#measuring-text");
const resultLive = document.querySelector("#result-live");

const sourceChars = document.querySelector("#source-chars");
const sourceTokens = document.querySelector("#source-tokens");
const toonChars = document.querySelector("#toon-chars");
const toonTokens = document.querySelector("#toon-tokens");
const tokenDelta = document.querySelector("#token-delta");
const tokenPercent = document.querySelector("#token-percent");
const warningsList = document.querySelector("#warnings-list");
const output = document.querySelector("#output");
const copyButton = document.querySelector("#copy-button");
const downloadButton = document.querySelector("#download-button");
const toonName = document.querySelector("#toon-name");

const beforeBar = document.querySelector("#ba-before");
const afterBar = document.querySelector("#ba-after");
const beforeNumber = document.querySelector("#ba-before-n");
const afterNumber = document.querySelector("#ba-after-n");
const heroDelta = document.querySelector("#hero-delta");
const heroSaved = document.querySelector("#hero-saved");
const visualDelta = document.querySelector("#visual-delta");
const compareSource = document.querySelector("#compare-source");
const compareSourceTokens = document.querySelector("#compare-source-tokens");
const compareToon = document.querySelector("#compare-toon");
const compareToonTokens = document.querySelector("#compare-toon-tokens");

let activeMode = "claude";
let latestToon = "";
let latestFilename = "cheapagent-output.toon";
let usingSample = true;

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

## Evidence Receipt

Definition: A reviewer-readable record of workflow inputs, artifacts, gates, approvals, and limitations.
Tags: evidence, workflow

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
  },
  agents: {
    label: "AGENTS.md optimization",
    sourceName: "AGENTS.md",
    mode: "record",
    filename: "agents.optimized.toon",
  },
  skill: {
    label: "SKILL.md optimization",
    sourceName: "SKILL.md",
    mode: "record",
    filename: "skill.optimized.toon",
  },
  toon: {
    label: "Document to TOON",
    sourceName: "definitions.md",
    mode: "lossless",
    filename: "document.toon",
  },
};

const warningLabels = {
  duplicate_rule: "Duplicate rule",
  vague_rule: "Vague instruction",
  long_section: "Long section",
  split_candidate: "Split candidate",
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
  try {
    localStorage.setItem("cheapagent-theme", nextTheme);
  } catch {
    // Theme persistence is optional.
  }
}

function updateNav() {
  nav.classList.toggle("scrolled", window.scrollY > 12);
}

function updateModeButtons() {
  document.querySelectorAll(".demo-mode").forEach((button) => {
    const isActive = button.dataset.mode === activeMode;
    button.setAttribute("aria-checked", String(isActive));
    button.setAttribute("aria-selected", String(isActive));
  });
}

function updateCharCount() {
  charCount.textContent = `${formatNumber(sourceInput.value.length)} / ${formatNumber(CHAR_LIMIT)} chars`;
}

function enforceLimit(text) {
  if (text.length <= CHAR_LIMIT) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, CHAR_LIMIT), truncated: true };
}

function resetOutput(message = "Run the measurement to see source size, output size, warnings, and TOON.") {
  resultSummary.textContent = message;
  setStatus("ready", "info");
  setPanelState("empty");
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
  latestFilename = selectedConfig().filename;
  copyButton.disabled = true;
  downloadButton.disabled = true;
  beforeBar.style.width = "0%";
  afterBar.style.width = "0%";
  beforeNumber.textContent = "0 tok";
  afterNumber.textContent = "0 tok";
  heroDelta.textContent = "measured";
  heroSaved.textContent = "0";
  visualDelta.textContent = "run";
  compareSource.textContent = "0 chars";
  compareSourceTokens.textContent = "~0 tokens";
  compareToon.textContent = "0 chars";
  compareToonTokens.textContent = "~0 tokens";
}

function loadSample({ run = true } = {}) {
  const config = selectedConfig();
  const { text, truncated } = enforceLimit(samples[activeMode]);
  sourceInput.value = text;
  usingSample = true;
  srcName.textContent = config.sourceName;
  updateCharCount();
  latestFilename = config.filename;
  toonName.textContent = config.filename;
  setNotice(truncated ? "Sample exceeded the anonymous alpha limit and was truncated." : "Loaded a local sample. No network request was made.");
  if (run) {
    runConversion();
  } else {
    resetOutput();
  }
}

function renderWarnings(result) {
  const cards = [];

  for (const warning of result.optimizerWarnings ?? []) {
    const severity = escapeHtml(warning.severity ?? "info");
    const location = warning.lineStart
      ? `line ${warning.lineEnd && warning.lineEnd !== warning.lineStart ? `${warning.lineStart}-${warning.lineEnd}` : warning.lineStart}`
      : "source";
    cards.push(`
      <article class="warning-card" data-severity="${severity}">
        <span class="wn">${escapeHtml(warning.kind?.slice(0, 1).toUpperCase() ?? "I")}</span>
        <span class="wt">${escapeHtml(warningLabels[warning.kind] ?? warning.kind)}
          <small>${escapeHtml(warning.message)} ${escapeHtml(warning.suggestion ?? "")}</small>
          ${warning.evidence ? `<small class="evidence">${escapeHtml(warning.evidence)}</small>` : ""}
        </span>
        <span class="wa">${escapeHtml(location)}</span>
      </article>
    `);
  }

  for (const warning of result.warnings ?? []) {
    cards.push(`
      <article class="warning-card" data-severity="info">
        <span class="wn">i</span>
        <span class="wt">Conversion note<small>${escapeHtml(warning)}</small></span>
        <span class="wa">info</span>
      </article>
    `);
  }

  if (cards.length === 0) {
    warningsList.innerHTML = '<p class="empty-state">No optimizer warnings fired for this input. Clean does not mean compressed.</p>';
    return;
  }

  warningsList.innerHTML = cards.join("");
}

function renderResult(result, config) {
  const tokenSavings = result.stats.tokenSavings;
  const tokenSavingsPercent = result.stats.tokenSavingsPercent;
  const sourceTokenCount = Math.max(1, result.stats.sourceTokens);
  const toonTokenCount = Math.max(1, result.stats.toonTokens);
  const larger = tokenSavings < 0;
  const optimized = tokenSavings > 0;
  const afterWidth = Math.min(100, Math.max(8, (toonTokenCount / sourceTokenCount) * 100));

  sourceChars.textContent = formatNumber(result.stats.sourceChars);
  sourceTokens.textContent = `~${formatNumber(result.stats.sourceTokens)} tokens`;
  toonChars.textContent = formatNumber(result.stats.toonChars);
  toonTokens.textContent = `~${formatNumber(result.stats.toonTokens)} tokens`;
  tokenDelta.textContent = formatSigned(tokenSavings);
  tokenPercent.textContent = larger ? `${formatPercent(Math.abs(tokenSavingsPercent))} larger` : `${formatPercent(tokenSavingsPercent)} saved`;

  beforeBar.style.width = "100%";
  afterBar.style.width = `${afterWidth}%`;
  beforeNumber.textContent = `${formatNumber(result.stats.sourceTokens)} tok`;
  afterNumber.textContent = `${formatNumber(result.stats.toonTokens)} tok`;

  heroDelta.textContent = larger ? `${formatPercent(Math.abs(tokenSavingsPercent))} larger` : `${formatPercent(tokenSavingsPercent)} saved`;
  heroSaved.textContent = optimized ? formatNumber(tokenSavings) : "0";
  visualDelta.textContent = larger ? "larger" : optimized ? "saved" : "flat";

  compareSource.textContent = `${formatNumber(result.stats.sourceChars)} chars`;
  compareSourceTokens.textContent = `~${formatNumber(result.stats.sourceTokens)} tokens`;
  compareToon.textContent = `${formatNumber(result.stats.toonChars)} chars`;
  compareToonTokens.textContent = `~${formatNumber(result.stats.toonTokens)} tokens`;

  resultSummary.textContent = `${config.label}: ${result.profile.name} profile, ${result.lossless ? "lossless" : "lossy"} output, delimiter "${result.delimiter}". Savings are measured for this input only.`;
  setStatus(optimized ? "optimized" : "measured", optimized ? "optimized" : "info");
  renderWarnings(result);

  latestToon = result.toon;
  latestFilename = config.filename;
  toonName.textContent = config.filename;
  output.textContent = result.toon;
  copyButton.disabled = false;
  downloadButton.disabled = false;
  setNotice(`Measured ${formatNumber(sourceInput.value.trimEnd().length)} characters locally.`);
  setPanelState("live");
}

function runConversion() {
  const text = sourceInput.value.trimEnd();
  updateCharCount();

  if (!text.trim()) {
    resetOutput("Paste or upload content to measure context efficiency.");
    setNotice("Input is empty.");
    return;
  }

  const config = selectedConfig();
  setStatus("measuring", "info");
  setPanelState("measuring");
  measuringText.textContent = "Profiling structure...";

  window.setTimeout(() => {
    try {
      measuringText.textContent = "Encoding TOON...";
      const result = convertTextToToon({
        text,
        flavor: activeMode === "toon" ? detectFlavor(text) : "markdown",
        sourceType: "paste",
        mode: config.mode,
        delimiter: "auto",
      });
      renderResult(result, config);
    } catch (error) {
      resetOutput("The local converter returned an error.");
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

async function copyOutput() {
  if (!latestToon) {
    return;
  }
  const copied = await copyText(latestToon);
  setNotice(copied ? "Copied TOON output to clipboard." : "Clipboard access is unavailable. Select the TOON output manually.");
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
  setNotice(`Prepared ${latestFilename}.`);
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
    loadSample({ run: true });
    return;
  }

  const config = selectedConfig();
  srcName.textContent = config.sourceName;
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
    setNotice("Anonymous alpha limit reached at 1000 characters.");
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
    setNotice("Only .md and .txt files are supported in this alpha.");
    fileInput.value = "";
    return;
  }

  const rawText = await file.text();
  const { text, truncated } = enforceLimit(rawText);
  sourceInput.value = text;
  usingSample = false;
  srcName.textContent = file.name;
  updateCharCount();
  setNotice(truncated ? `${file.name} was truncated to the anonymous 1000-character limit.` : `Loaded ${file.name} locally.`);
  runConversion();
});

document.querySelectorAll(".demo-mode").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

sampleButton.addEventListener("click", () => loadSample());
resetButton.addEventListener("click", () => loadSample({ run: false }));
copyButton.addEventListener("click", copyOutput);
downloadButton.addEventListener("click", downloadOutput);
themeToggle.addEventListener("click", () => {
  setTheme(root.dataset.theme === "dark" ? "light" : "dark");
});
ctaCopy.addEventListener("click", async () => {
  const copied = await copyText("npx doc2toon convert CLAUDE.md --stats");
  setNotice(copied ? "Copied example command." : "Clipboard access is unavailable.");
});

window.addEventListener("scroll", updateNav, { passive: true });

try {
  setTheme(localStorage.getItem("cheapagent-theme") ?? "dark");
} catch {
  setTheme("dark");
}

updateNav();
updateModeButtons();
loadSample({ run: true });
