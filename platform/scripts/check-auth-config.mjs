#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const envName = process.argv[2] ?? "staging";
const mode = process.argv.includes("--inline") ? "inline" : "current";
const platformDir = path.resolve(process.cwd());
const repoDir = path.resolve(platformDir, "..");
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

const webUrl = readPath(runtimeConfig, `${envName}.urls.web`);
const runtimeAuthDomain = readPath(
  runtimeConfig,
  `${envName}.firebase.client.authDomain`,
);
const sdkAuthDomain = readPath(firebaseSdkConfig, "authDomain");
const projectId =
  readPath(runtimeConfig, `${envName}.firebase.projectId`) ??
  readPath(firebaseSdkConfig, "projectId");
const apiKey =
  readPath(firebaseSdkConfig, "apiKey") ??
  readPath(runtimeConfig, `${envName}.firebase.client.apiKey`);
const configuredFlow = readPath(runtimeConfig, `${envName}.auth.flow`) ?? "auto";
const expectedAuthDomain =
  mode === "inline" ? withoutProtocol(webUrl) : runtimeAuthDomain ?? sdkAuthDomain;
const expectedFlow = mode === "inline" ? "redirect" : configuredFlow;

if (!envName || !webUrl || !apiKey || !projectId || !expectedAuthDomain) {
  console.error("Could not read auth configuration.");
  console.error(`Runtime config: ${runtimePath}`);
  console.error(`Firebase SDK config: ${firebaseSdkPath}`);
  process.exit(1);
}

const appOrigin = new URL(webUrl).origin;
const redirectUri = `https://${expectedAuthDomain}/__/auth/handler`;

console.log(`RiverLaunch.app auth check: ${envName} (${mode})`);
console.log(`Repo: ${repoDir}`);
console.log(`Runtime config: ${runtimePath}`);
console.log(`Firebase SDK config: ${firebaseSdkPath}`);
console.log("");
console.log("Expected web build values");
console.log(`  VITE_FIREBASE_PROJECT_ID=${projectId}`);
console.log(`  VITE_FIREBASE_AUTH_DOMAIN=${expectedAuthDomain}`);
console.log(`  VITE_FIREBASE_AUTH_FLOW=${expectedFlow}`);
console.log("");
console.log("Google/Firebase console values to verify");
console.log(`  Firebase Auth authorised domain: ${withoutProtocol(appOrigin)}`);
console.log(`  OAuth JavaScript origin: ${appOrigin}`);
console.log(`  OAuth redirect URI: ${redirectUri}`);

const firebaseProjectConfig = await readFirebaseProjectConfig(apiKey);
const authorizedDomains = firebaseProjectConfig.authorizedDomains ?? [];
console.log("");
console.log("Firebase Auth authorised domains");
for (const domain of authorizedDomains) {
  console.log(`  - ${domain}`);
}

const authUri = await createAuthUri(apiKey, redirectUri);
console.log("");
console.log("Generated Google OAuth request");
if (authUri) {
  const url = new URL(authUri);
  console.log(`  client_id=${url.searchParams.get("client_id")}`);
  console.log(`  redirect_uri=${url.searchParams.get("redirect_uri")}`);
  console.log(`  scope=${url.searchParams.get("scope")}`);
} else {
  console.log("  Could not generate OAuth URL.");
}

console.log("");
console.log("Checks");
check(
  authorizedDomains.includes(withoutProtocol(appOrigin)),
  `Firebase Auth contains ${withoutProtocol(appOrigin)}`,
);
check(
  authUri !== null,
  "Firebase generated a Google OAuth URL for the expected redirect URI",
);

if (mode === "inline") {
  console.log("");
  console.log("Inline cutover values");
  console.log(`  ${envName}.firebase.client.authDomain = ${expectedAuthDomain}`);
  console.log(`  ${envName}.auth.flow = redirect`);
}

async function readFirebaseProjectConfig(key) {
  const response = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${encodeURIComponent(
      key,
    )}`,
  );

  if (!response.ok) {
    return {};
  }

  return response.json();
}

async function createAuthUri(key, continueUri) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(
      key,
    )}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        providerId: "google.com",
        continueUri,
        customParameter: {},
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return typeof result.authUri === "string" ? result.authUri : null;
}

function check(passed, label) {
  console.log(`  ${passed ? "[ok]" : "[warn]"} ${label}`);
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

function withoutProtocol(value) {
  return value?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";
}
