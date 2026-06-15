import {
  createUserWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type AuthError,
  type User,
} from "firebase/auth";
import { getClientFirebaseApp } from "./firebaseApp";
import { REQUIRE_EMAIL_VERIFICATION } from "../lib/contributorTerms";

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  photoURL: string | null;
}

export type AuthState =
  | { status: "loading"; user: null; error: null }
  | { status: "ready"; user: AuthUser | null; error: null }
  | { status: "unconfigured"; user: null; error: null }
  | { status: "error"; user: null; error: string };

let authInstance: Auth | null | undefined;
let redirectResultHandled = false;

export function subscribeToAuthState(
  callback: (state: AuthState) => void,
): () => void {
  const auth = getClientAuth();

  if (!auth) {
    callback({ status: "unconfigured", user: null, error: null });
    return () => undefined;
  }

  callback({ status: "loading", user: null, error: null });

  if (shouldUseRedirectSignIn()) {
    void handleRedirectResult(auth, callback);
  }

  return onAuthStateChanged(
    auth,
    (user) => {
      callback({ status: "ready", user: user ? mapAuthUser(user) : null, error: null });
    },
    (error) => {
      callback({
        status: "error",
        user: null,
        error: getFriendlyAuthErrorMessage(error, "Could not read sign-in state."),
      });
    },
  );
}

export async function signInWithGoogle(): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    throw new Error("Firebase Auth is not configured for this build.");
  }

  const provider = new GoogleAuthProvider();

  try {
    if (shouldUseRedirectSignIn()) {
      await signInWithRedirect(auth, provider);
      return;
    }

    await signInWithPopup(auth, provider);
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error, "Could not sign in with Google."));
  }
}

export async function createAccountWithEmail(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    throw new Error("Firebase Auth is not configured for this build.");
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password,
    );
    const displayName = input.displayName?.trim();

    if (displayName) {
      await updateProfile(credential.user, { displayName });
      await credential.user.getIdToken(true);
    }

    if (REQUIRE_EMAIL_VERIFICATION) {
      try {
        await sendEmailVerification(credential.user);
      } catch {
        // Non-fatal: the member can re-request verification from the contributor on-ramp.
      }
    }
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error, "Could not create account."));
  }
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
}): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    throw new Error("Firebase Auth is not configured for this build.");
  }

  try {
    await signInWithEmailAndPassword(auth, input.email, input.password);
  } catch (error) {
    throw new Error(getFriendlyAuthErrorMessage(error, "Could not sign in."));
  }
}

export async function sendEmailPasswordReset(email: string): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    throw new Error("Firebase Auth is not configured for this build.");
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(
      getFriendlyAuthErrorMessage(error, "Could not send password reset email."),
    );
  }
}

export async function sendCurrentUserEmailVerification(): Promise<void> {
  const auth = getClientAuth();

  if (!auth?.currentUser) {
    throw new Error("You need to be signed in to verify your email.");
  }

  try {
    await sendEmailVerification(auth.currentUser);
  } catch (error) {
    throw new Error(
      getFriendlyAuthErrorMessage(
        error,
        "Could not send the verification email.",
      ),
    );
  }
}

export async function reloadCurrentUser(): Promise<AuthUser | null> {
  const auth = getClientAuth();

  if (!auth?.currentUser) {
    return null;
  }

  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
  return auth.currentUser ? mapAuthUser(auth.currentUser) : null;
}

export async function signOutCurrentUser(): Promise<void> {
  const auth = getClientAuth();

  if (!auth) {
    return;
  }

  await signOut(auth);
}

export async function getCurrentUserIdToken(): Promise<string | null> {
  const auth = getClientAuth();

  if (!auth?.currentUser) {
    return null;
  }

  return auth.currentUser.getIdToken();
}

export function getClientAuth(): Auth | null {
  if (authInstance !== undefined) {
    return authInstance;
  }

  const app = getClientFirebaseApp();

  if (!app) {
    authInstance = null;
    return authInstance;
  }

  authInstance = getAuth(app);
  return authInstance;
}

async function handleRedirectResult(
  auth: Auth,
  callback: (state: AuthState) => void,
) {
  if (redirectResultHandled) {
    return;
  }

  redirectResultHandled = true;

  try {
    await getRedirectResult(auth);
  } catch (error) {
    callback({
      status: "error",
      user: null,
      error: getFriendlyAuthErrorMessage(
        error,
        "Could not complete redirected sign-in.",
      ),
    });
  }
}

function getFriendlyAuthErrorMessage(error: unknown, fallback: string) {
  const code = readAuthErrorCode(error);

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is not recognised. Check your details and try again.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Use Sign in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/password-does-not-meet-requirements":
    case "auth/weak-password":
      return "Use a stronger password with at least 12 characters. Three unrelated words is a good pattern.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment, then try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "The sign-in window was blocked. Allow popups or try again.";
    case "auth/network-request-failed":
      return "Network problem while signing in. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled yet.";
    case "auth/requires-recent-login":
      return "Please sign in again before changing account details.";
    default:
      return fallback;
  }
}

function readAuthErrorCode(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as AuthError).code === "string"
  ) {
    return (error as AuthError).code;
  }

  return null;
}

function shouldUseRedirectSignIn() {
  if (isLocalBrowserOrigin()) {
    return false;
  }

  const configuredFlow = (
    import.meta.env.VITE_FIREBASE_AUTH_FLOW as string | undefined
  )?.trim();

  if (configuredFlow === "redirect") {
    return true;
  }

  if (configuredFlow === "popup") {
    return false;
  }

  return import.meta.env.PROD;
}

function isLocalBrowserOrigin() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function mapAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Signed-in member",
    email: user.email,
    emailVerified: user.emailVerified,
    photoURL: user.photoURL,
  };
}
