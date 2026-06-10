import netlifyIdentity from "netlify-identity-widget";

// Netlify Identity owns credentials; CheapAgent only reads the verified user
// and short-lived JWTs from the widget. No password ever touches app code.

const listeners = new Set();

function notify() {
  const user = netlifyIdentity.currentUser();
  for (const listener of listeners) {
    try {
      listener(user);
    } catch {
      // One bad listener should not break auth state propagation.
    }
  }
}

export function initAuth() {
  netlifyIdentity.on("init", notify);
  netlifyIdentity.on("login", () => {
    netlifyIdentity.close();
    notify();
  });
  netlifyIdentity.on("logout", notify);
  netlifyIdentity.on("error", () => {
    // Identity being unreachable (e.g. local dev without the Identity
    // backend) must not break the anonymous workbench.
    notify();
  });
  try {
    netlifyIdentity.init();
  } catch {
    notify();
  }
}

export function onAuthChange(listener) {
  listeners.add(listener);
}

export function currentUser() {
  try {
    return netlifyIdentity.currentUser();
  } catch {
    return null;
  }
}

export function openSignIn() {
  netlifyIdentity.open("login");
}

export function signOut() {
  netlifyIdentity.logout();
}

export async function authToken() {
  const user = currentUser();
  if (!user) {
    return null;
  }
  try {
    // jwt() refreshes the access token when it is close to expiry.
    return await user.jwt();
  } catch {
    return null;
  }
}
