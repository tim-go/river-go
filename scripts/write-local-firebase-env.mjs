#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const envName = process.argv[2] ?? "staging";
const repoDir = process.cwd();
const platformDir = path.join(repoDir, "platform");
const runtimePath =
  process.env.RIVER_GO_RUNTIME_CONFIG ??
  path.join(platformDir, ".config", "river-go-runtime.json");
const platformPath =
  process.env.RIVER_GO_PLATFORM_CONFIG ??
  path.join(platformDir, ".config", "river-go-platform.json");

const runtimeConfig = readJson(runtimePath, {});
const platformConfig = readJson(platformPath, {});
const configuredSdkFile = readPath(
  platformConfig,
  `environments.${envName}.files.firebaseSdkFile`,
);
const firebaseSdkPath = configuredSdkFile
  ? path.resolve(platformDir, configuredSdkFile)
  : path.join(platformDir, ".config", `firebase-sdk-${envName}.json`);
const firebaseSdkConfig = readJson(firebaseSdkPath, {});

const values = {
  VITE_FIREBASE_API_KEY: readClientValue("apiKey"),
  VITE_FIREBASE_AUTH_DOMAIN: readClientValue("authDomain"),
  VITE_FIREBASE_PROJECT_ID: readClientValue("projectId"),
  VITE_FIREBASE_STORAGE_BUCKET: readClientValue("storageBucket"),
  VITE_FIREBASE_MESSAGING_SENDER_ID: readClientValue("messagingSenderId"),
  VITE_FIREBASE_APP_ID: readClientValue("appId"),
  VITE_FIREBASE_MEASUREMENT_ID: readClientValue("measurementId"),
  VITE_FIREBASE_AUTH_FLOW: "popup",
};

const missing = Object.entries(values)
  .filter(([key]) => key !== "VITE_FIREBASE_MEASUREMENT_ID")
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0) {
  console.error(`Could not write .env.local; missing ${missing.join(", ")}.`);
  console.error(`Checked ${runtimePath} and ${firebaseSdkPath}.`);
  process.exit(1);
}

const output = `${Object.entries(values)
  .map(([key, value]) => `${key}=${value}`)
  .join("\n")}\n`;

fs.writeFileSync(path.join(repoDir, ".env.local"), output, { mode: 0o600 });
console.log(`Wrote .env.local for ${envName}.`);

function readClientValue(key) {
  return (
    readPath(firebaseSdkConfig, key) ??
    readPath(runtimeConfig, `${envName}.firebase.client.${key}`) ??
    ""
  );
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readPath(value, dottedPath) {
  const result = dottedPath
    .split(".")
    .reduce((current, part) => current?.[part], value);

  return typeof result === "string" && result.trim() ? result : null;
}
