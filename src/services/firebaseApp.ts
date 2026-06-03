import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";

let firebaseApp: FirebaseApp | null | undefined;

export function getClientFirebaseApp(): FirebaseApp | null {
  if (firebaseApp !== undefined) {
    return firebaseApp;
  }

  const config = getFirebaseConfig();

  if (!config) {
    firebaseApp = null;
    return firebaseApp;
  }

  firebaseApp = getApps()[0] ?? initializeApp(config);
  return firebaseApp;
}

function getFirebaseConfig(): FirebaseOptions | null {
  const configuredAuthDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as
    | string
    | undefined;
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: getRuntimeAuthDomain(configuredAuthDomain),
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
    messagingSenderId: import.meta.env
      .VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
    measurementId: import.meta.env
      .VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
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

function getRuntimeAuthDomain(configuredAuthDomain?: string) {
  const fallback = configuredAuthDomain?.trim();

  if (typeof window === "undefined") {
    return fallback;
  }

  const hostname = window.location.hostname.trim().toLowerCase();

  if (!hostname || isLocalHostname(hostname)) {
    return fallback;
  }

  return hostname;
}

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}
