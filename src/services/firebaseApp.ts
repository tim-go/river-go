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
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
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
