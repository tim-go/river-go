import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string | null;
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

  void handleRedirectResult(auth, callback);

  return onAuthStateChanged(
    auth,
    (user) => {
      callback({ status: "ready", user: user ? mapAuthUser(user) : null, error: null });
    },
    (error) => {
      callback({
        status: "error",
        user: null,
        error: error instanceof Error ? error.message : "Could not read sign-in state.",
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

  if (shouldUseRedirectSignIn()) {
    await signInWithRedirect(auth, provider);
    return;
  }

  await signInWithPopup(auth, provider);
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

function getClientAuth(): Auth | null {
  if (authInstance !== undefined) {
    return authInstance;
  }

  const config = getFirebaseConfig();

  if (!config) {
    authInstance = null;
    return authInstance;
  }

  const app = getApps()[0] ?? initializeApp(config);
  authInstance = getAuth(app);
  return authInstance;
}

function getFirebaseConfig(): FirebaseOptions | null {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env
      .VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
  };

  const requiredValues = [
    config.apiKey,
    config.authDomain,
    config.projectId,
    config.appId,
  ];

  if (requiredValues.some((value) => !value?.trim())) {
    return null;
  }

  return config;
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
      error:
        error instanceof Error
          ? error.message
          : "Could not complete redirected sign-in.",
    });
  }
}

function shouldUseRedirectSignIn() {
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

function mapAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName ?? user.email ?? "Signed-in member",
    email: user.email,
    photoURL: user.photoURL,
  };
}
