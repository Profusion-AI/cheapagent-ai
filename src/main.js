import { convertTextToToon } from "doc2toon/browser";

const CHAR_LIMIT = 1000;

const sourceInput = document.querySelector("#source-input");
const charCount = document.querySelector("#char-count");
const form = document.querySelector("#alpha-form");
const fileInput = document.querySelector("#file-input");
const sampleButton = document.querySelector("#sample-button");
const inputNotice = document.querySelector("#input-notice");
const resultSummary = document.querySelector("#result-summary");
const statusBadge = document.querySelector("#status-badge");
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
const themeToggle = document.querySelector("#theme-toggle");
const heroDelta = document.querySelector("#hero-delta");
const visualDelta = document.querySelector("#visual-delta");

let latestToon = "";
let latestFilename = "cheapagent-output.toon";

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
    mode: "record",
    filename: "claude.optimized.toon",
  },
  agents: {
    label: "AGENTS.md optimization",
    mode: "record",
    filename: "agents.optimized.toon",
  },
  skill: {
    label: "SKILL.md optimization",
    mode: "record",
    filename: "skill.optimized.toon",
  },
  toon: {
    label: "Document to TOON",
    mode: "lossless",
    filename: "document.toon",
  },
};

const warningLabels = {
  duplicate_rule: "Possible duplicate rule",
  vague_rule: "Possibly vague instruction",
  long_section: "Long section",
  split_candidate: "Possible split candidate",
};

function currentMode() {
  const checked = document.querySelector('input[name="mode"]:checked');
  return checked?.value ?? "claude";
}

function selectedConfig() {
  return modeConfig[currentMode()] ?? modeConfig.claude;
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

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  try {
    localStorage.setItem("cheapagent-theme", nextTheme);
  } catch {
    // Theme persistence is optional.
  }
}

function updateCharCount() {
  const count = sourceInput.value.length;
  charCount.textContent = `${formatNumber(count)} / ${formatNumber(CHAR_LIMIT)} chars`;
}

function enforceLimit(text) {
  if (text.length <= CHAR_LIMIT) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, CHAR_LIMIT), truncated: true };
}

function setStatus(text, state) {
  statusBadge.textContent = text;
  statusBadge.dataset.state = state;
}

function resetOutput(message = "Run the measurement to see source size, output size, warnings, and TOON.") {
  resultSummary.textContent = message;
  setStatus("ready", "info");
  sourceChars.textContent = "0";
  sourceTokens.textContent = "~0 tokens";
  toonChars.textContent = "0";
  toonTokens.textContent = "~0 tokens";
  tokenDelta.textContent = "0";
  tokenDelta.style.color = "";
  tokenPercent.textContent = "0%";
  warningsList.innerHTML = '<p class="empty-state">Warnings appear after measurement.</p>';
  output.textContent = "";
  latestToon = "";
  copyButton.disabled = true;
  downloadButton.disabled = true;
  heroDelta.textContent = "measured";
  visualDelta.textContent = "run";
}

function renderWarnings(result) {
  const cards = [];

  for (const warning of result.optimizerWarnings ?? []) {
    const location = warning.lineStart
      ? `line ${warning.lineEnd && warning.lineEnd !== warning.lineStart ? `${warning.lineStart}-${warning.lineEnd}` : warning.lineStart}`
      : "source";
    cards.push(`
      <article class="warning-card" data-severity="${escapeHtml(warning.severity)}">
        <div class="warning-topline">
          <span class="warning-kind">${escapeHtml(warningLabels[warning.kind] ?? warning.kind)}</span>
          <span class="warning-severity">${escapeHtml(warning.severity)}</span>
          <span class="warning-location">${escapeHtml(location)}</span>
        </div>
        <p>${escapeHtml(warning.message)}</p>
        <p>${escapeHtml(warning.suggestion)}</p>
        ${warning.evidence ? `<div class="warning-evidence">${escapeHtml(warning.evidence)}</div>` : ""}
      </article>
    `);
  }

  for (const warning of result.warnings ?? []) {
    cards.push(`
      <article class="warning-card" data-severity="info">
        <div class="warning-topline">
          <span class="warning-kind">Conversion note</span>
          <span class="warning-severity">info</span>
        </div>
        <p>${escapeHtml(warning)}</p>
      </article>
    `);
  }

  if (cards.length === 0) {
    warningsList.innerHTML = '<p class="empty-state">No optimizer warnings for this input. Clean does not mean compressed; it means no current advisory signal fired.</p>';
    return;
  }

  warningsList.innerHTML = cards.join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

  try {
    const result = convertTextToToon({
      text,
      flavor: currentMode() === "toon" ? detectFlavor(text) : "markdown",
      sourceType: "paste",
      mode: config.mode,
      delimiter: "auto",
    });

    const tokenSavings = result.stats.tokenSavings;
    const tokenSavingsPercent = result.stats.tokenSavingsPercent;
    const optimized = tokenSavings > 0;
    const larger = tokenSavings < 0;

    sourceChars.textContent = formatNumber(result.stats.sourceChars);
    sourceTokens.textContent = `~${formatNumber(result.stats.sourceTokens)} tokens`;
    toonChars.textContent = formatNumber(result.stats.toonChars);
    toonTokens.textContent = `~${formatNumber(result.stats.toonTokens)} tokens`;
    tokenDelta.textContent = formatSigned(tokenSavings);
    tokenPercent.textContent = larger ? `${formatPercent(Math.abs(tokenSavingsPercent))} larger` : `${formatPercent(tokenSavingsPercent)} saved`;
    tokenDelta.style.color = optimized ? "var(--color-optimized)" : larger ? "var(--color-text-muted)" : "var(--color-primary)";
    heroDelta.textContent = larger ? `${formatPercent(Math.abs(tokenSavingsPercent))} larger` : `${formatPercent(tokenSavingsPercent)} saved`;
    visualDelta.textContent = larger ? "larger" : optimized ? "saved" : "flat";

    resultSummary.textContent = `${config.label}: ${result.profile.name} profile, ${result.lossless ? "lossless" : "lossy"} output, delimiter "${result.delimiter}". Savings are measured for this input only.`;
    setStatus(optimized ? "optimized" : "measured", optimized ? "optimized" : "info");
    renderWarnings(result);

    latestToon = result.toon;
    latestFilename = config.filename;
    output.textContent = result.toon;
    copyButton.disabled = false;
    downloadButton.disabled = false;
    setNotice(`Measured ${formatNumber(text.length)} characters locally.`);
  } catch (error) {
    resetOutput("The local converter returned an error.");
    setStatus("error", "error");
    warningsList.innerHTML = `
      <article class="warning-card" data-severity="warning">
        <div class="warning-topline">
          <span class="warning-kind">Conversion error</span>
          <span class="warning-severity">warning</span>
        </div>
        <p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>
      </article>
    `;
  }
}

function loadSample() {
  const { text, truncated } = enforceLimit(samples[currentMode()]);
  sourceInput.value = text;
  updateCharCount();
  setNotice(truncated ? "Sample exceeded the anonymous alpha limit and was truncated." : "Loaded a local sample. No network request was made.");
  runConversion();
}

async function copyOutput() {
  if (!latestToon) {
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(latestToon);
    } else if (!fallbackCopy(latestToon)) {
      throw new Error("Clipboard API unavailable");
    }
    setNotice("Copied TOON output to clipboard.");
  } catch {
    if (fallbackCopy(latestToon)) {
      setNotice("Copied TOON output to clipboard.");
      return;
    }
    setNotice("Clipboard access is unavailable. Select the TOON output manually.");
  }
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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runConversion();
});

sourceInput.addEventListener("input", () => {
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
  updateCharCount();
  setNotice(truncated ? `${file.name} was truncated to the anonymous 1000-character limit.` : `Loaded ${file.name} locally.`);
  runConversion();
});

document.querySelectorAll('input[name="mode"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (!sourceInput.value.trim()) {
      loadSample();
      return;
    }
    runConversion();
  });
});

sampleButton.addEventListener("click", loadSample);
copyButton.addEventListener("click", copyOutput);
downloadButton.addEventListener("click", downloadOutput);
themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

try {
  setTheme(localStorage.getItem("cheapagent-theme") ?? "dark");
} catch {
  setTheme("dark");
}

loadSample();
