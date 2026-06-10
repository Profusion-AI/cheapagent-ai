// Storage-consent banner. CheapAgent sets no advertising or analytics
// cookies; the choice here governs optional (functional) browser storage
// like the theme preference. The sign-in session token is essential.

const CONSENT_KEY = "cheapagent-consent";

export function getConsent() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "all" || value === "essential" ? value : null;
  } catch {
    return null;
  }
}

export function functionalStorageAllowed() {
  return getConsent() === "all";
}

function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage being unavailable means there is nothing to consent to.
  }
}

let banner = null;

function buildBanner(onChoice) {
  const element = document.createElement("aside");
  element.className = "consent-banner";
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-label", "Browser storage choices");
  element.innerHTML = `
    <p class="consent-text">
      <strong>No tracking here.</strong> CheapAgent uses no advertising or analytics cookies.
      Browser storage keeps your sign-in session (essential) and can remember your theme
      preference (optional). Details on the <a href="/privacy.html">privacy page</a>.
    </p>
    <div class="consent-actions">
      <button type="button" class="btn btn-accent btn-sm" data-consent-choice="all"><span class="lbl">Allow all</span></button>
      <button type="button" class="btn btn-line btn-sm" data-consent-choice="essential"><span class="lbl">Essential only</span></button>
    </div>
  `;
  element.querySelectorAll("[data-consent-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const choice = button.dataset.consentChoice;
      setConsent(choice);
      element.remove();
      banner = null;
      onChoice?.(choice);
    });
  });
  return element;
}

function showBanner(onChoice) {
  if (banner) {
    return;
  }
  banner = buildBanner(onChoice);
  document.body.append(banner);
}

export function initConsentBanner({ onChange } = {}) {
  document.querySelectorAll("[data-consent-prefs]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showBanner(onChange);
    });
  });
  if (!getConsent()) {
    showBanner(onChange);
  }
}
