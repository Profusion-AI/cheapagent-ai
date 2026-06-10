import {
  AUTH_EVENTS,
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  logout,
  onAuthChange as onIdentityAuthChange,
  refreshSession,
  requestPasswordRecovery,
  signup,
  updateUser,
} from "@netlify/identity";

// First-party sign-in for CheapAgent (v0.2.2). Netlify Identity still owns
// credentials: this module hands email/password straight to @netlify/identity
// and keeps only the resulting session. The dialog lives in the page DOM
// (no widget iframe), so it follows the brand theme and is reachable by
// assistive tech and agents through ordinary element references.

const AUTH_HASH = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token|error)=/;

const listeners = new Set();
let cachedUser = null;

let dialog = null;
let authTitle = null;
let authMessage = null;
let authStatus = null;
let authEmail = null;
let authPassword = null;
let authNewPassword = null;
let authSubmit = null;
let tabLogin = null;
let tabSignup = null;

let busy = false;
// Set when an invite link lands; the reset view then finishes the invite
// instead of a password recovery.
let pendingInviteToken = null;

const viewCopy = {
  login: { title: "Sign in", submit: "Sign in" },
  signup: { title: "Create account", submit: "Create account" },
  forgot: { title: "Reset password", submit: "Send recovery link" },
  reset: { title: "Set a new password", submit: "Save new password" },
  sent: { title: "Check your email", submit: "" },
  notice: { title: "Signed in", submit: "" },
};

function notify() {
  for (const listener of listeners) {
    try {
      listener(cachedUser);
    } catch {
      // One bad listener should not break auth state propagation.
    }
  }
}

function friendlyError(error) {
  if (error?.name === "MissingIdentityError" || error?.status === 404 || /not found/i.test(error?.message ?? "")) {
    return "The sign-in service is not available here. On a local preview, accounts are disabled; the anonymous workbench still works.";
  }
  const raw = error?.message ?? "";
  if (/invalid[ _-]?grant|invalid.*password|no user found/i.test(raw)) {
    return "Wrong email or password.";
  }
  if (/already registered|user.*exists/i.test(raw)) {
    return "That email is already registered. Try signing in instead.";
  }
  if (/confirm/i.test(raw) && /email/i.test(raw)) {
    return "Confirm your email first - check your inbox for the confirmation link.";
  }
  return raw || "Could not complete the request. Try again.";
}

function setStatus(message, isError = false) {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.dataset.state = isError ? "error" : "info";
}

function setView(view, message = "") {
  if (!dialog) return;
  dialog.dataset.view = view;
  const copy = viewCopy[view] ?? viewCopy.login;
  authTitle.textContent = copy.title;
  authSubmit.querySelector(".lbl").textContent = copy.submit;
  authMessage.textContent = message;
  setStatus("");
  tabLogin.setAttribute("aria-selected", String(view === "login"));
  tabSignup.setAttribute("aria-selected", String(view === "signup"));
  authPassword.setAttribute(
    "autocomplete",
    view === "signup" ? "new-password" : "current-password",
  );
  // Hidden required fields would block form submission; only the visible
  // view's inputs may participate in validation.
  authEmail.disabled = !["login", "signup", "forgot"].includes(view);
  authPassword.disabled = !["login", "signup"].includes(view);
  authNewPassword.disabled = view !== "reset";
}

function openDialog(view, message = "") {
  if (!dialog) return;
  setView(view, message);
  if (!dialog.open) {
    dialog.showModal();
  }
  const focusTarget = view === "reset" ? authNewPassword : authEmail;
  if (!focusTarget.disabled) {
    focusTarget.focus();
  }
}

function setBusy(isBusy) {
  busy = isBusy;
  authSubmit.disabled = isBusy;
  authSubmit.classList.toggle("is-busy", isBusy);
}

async function submitCurrentView() {
  const view = dialog.dataset.view;
  const email = authEmail.value.trim();

  if (view === "login") {
    if (!email || !authPassword.value) {
      setStatus("Enter your email and password.", true);
      return;
    }
    setStatus("Signing in...");
    await login(email, authPassword.value);
    authPassword.value = "";
    dialog.close();
    return;
  }

  if (view === "signup") {
    if (!email || !authPassword.value) {
      setStatus("Enter an email and choose a password.", true);
      return;
    }
    setStatus("Creating account...");
    const user = await signup(email, authPassword.value);
    authPassword.value = "";
    if (user?.confirmedAt) {
      // Autoconfirm is on: the session already exists.
      dialog.close();
      return;
    }
    setView(
      "sent",
      `Almost there. We sent a confirmation link to ${email}. Click it to activate your account, then sign in.`,
    );
    return;
  }

  if (view === "forgot") {
    if (!email) {
      setStatus("Enter the email you signed up with.", true);
      return;
    }
    setStatus("Sending recovery link...");
    await requestPasswordRecovery(email);
    setView(
      "sent",
      `If an account exists for ${email}, a password recovery link is on its way.`,
    );
    return;
  }

  if (view === "reset") {
    if (!authNewPassword.value) {
      setStatus("Choose a new password.", true);
      return;
    }
    setStatus("Saving password...");
    if (pendingInviteToken) {
      await acceptInvite(pendingInviteToken, authNewPassword.value);
      pendingInviteToken = null;
    } else {
      await updateUser({ password: authNewPassword.value });
    }
    authNewPassword.value = "";
    dialog.close();
  }
}

function bindDialog() {
  dialog = document.querySelector("#auth-dialog");
  if (!dialog) return;
  authTitle = dialog.querySelector("#auth-title");
  authMessage = dialog.querySelector("#auth-message");
  authStatus = dialog.querySelector("#auth-status");
  authEmail = dialog.querySelector("#auth-email");
  authPassword = dialog.querySelector("#auth-password");
  authNewPassword = dialog.querySelector("#auth-new-password");
  authSubmit = dialog.querySelector("#auth-submit");
  tabLogin = dialog.querySelector("#auth-tab-login");
  tabSignup = dialog.querySelector("#auth-tab-signup");

  tabLogin.addEventListener("click", () => setView("login"));
  tabSignup.addEventListener("click", () => setView("signup"));
  dialog.querySelector("#auth-forgot").addEventListener("click", () => setView("forgot"));
  dialog.querySelector("#auth-back").addEventListener("click", () => setView("login"));
  dialog.querySelector("#auth-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    // Clicking the backdrop (outside the dialog box) closes it.
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.querySelector("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await submitCurrentView();
    } catch (error) {
      setStatus(friendlyError(error), true);
    } finally {
      setBusy(false);
    }
  });
}

// Confirmation, recovery, and invite emails land back on the page with a
// token in the URL hash. handleAuthCallback() exchanges it (the widget used
// to do this); recovery additionally needs the set-new-password view.
function processAuthHash() {
  if (!AUTH_HASH.test(window.location.hash)) return;
  handleAuthCallback()
    .then((result) => {
      if (!result) return;
      if (result.type === "confirmation") {
        openDialog("notice", "Email confirmed - you are signed in.");
      } else if (result.type === "invite" && result.token) {
        pendingInviteToken = result.token;
        openDialog("reset", "Welcome! Choose a password to finish creating your account.");
      } else if (result.type === "recovery") {
        // The RECOVERY auth event opens the reset view; nothing extra here.
      }
    })
    .catch((error) => {
      openDialog("login");
      setStatus(friendlyError(error), true);
    });
}

export function initAuth() {
  bindDialog();
  onIdentityAuthChange((event, user) => {
    if (event === AUTH_EVENTS.LOGOUT) {
      cachedUser = null;
    } else if (user) {
      cachedUser = user;
    }
    if (event === AUTH_EVENTS.RECOVERY) {
      openDialog("reset", "Account recovered. Set a new password to finish.");
    }
    notify();
  });
  processAuthHash();
  // getUser() never throws; it restores an existing session (and restarts
  // the token auto-refresh timer) on page load.
  getUser().then((user) => {
    if (user) {
      cachedUser = user;
      notify();
    }
  });
}

export function onAuthChange(listener) {
  listeners.add(listener);
}

export function currentUser() {
  return cachedUser;
}

export function openSignIn() {
  openDialog("login");
}

export function signOut() {
  logout().catch(() => {
    // Identity unreachable: the library already cleared local state where it
    // could; make sure the UI does not stay stuck in a signed-in look.
    cachedUser = null;
    notify();
  });
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// The usage function authenticates via `Authorization: Bearer <jwt>`
// (verified by the Netlify Functions runtime). @netlify/identity maintains
// the current access token in the JS-readable `nf_jwt` cookie - that cookie
// is the library's documented hand-off of the JWT to servers - and
// refreshSession() renews it when it is close to expiry.
export async function authToken() {
  if (!cachedUser) {
    return null;
  }
  try {
    const refreshed = await refreshSession();
    if (refreshed) {
      return refreshed;
    }
  } catch {
    // Fall through to the cookie the library last synced.
  }
  return readCookie("nf_jwt");
}
