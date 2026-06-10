import { initConsentBanner } from "./consent.js";

// The privacy page only needs the consent banner and a saved theme; the
// workbench logic stays on the main page.
try {
  const theme = localStorage.getItem("cheapagent-theme");
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  }
} catch {
  // Default theme is fine.
}

initConsentBanner();
