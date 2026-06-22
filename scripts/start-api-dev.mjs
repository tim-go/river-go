#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const envName = process.argv[2] ?? "local";
const repoDir = process.cwd();
const platformDir = path.join(repoDir, "platform");
const runtimePath =
  process.env.RIVER_GO_RUNTIME_CONFIG ??
  path.join(platformDir, ".config", "river-go-runtime.json");

const runtimeConfig = readJson(runtimePath, {});
const envConfig = readObject(runtimeConfig[envName]);
const apiPort = readString(envConfig?.ports?.api);
const databaseUrl = readString(envConfig?.database?.url);
const firebaseProjectId = readString(envConfig?.firebase?.projectId);
const adminEmails = readString(envConfig?.auth?.adminEmails);
const what3wordsApiKey = readString(envConfig?.integrations?.what3words?.apiKey);
const observationJobToken = readString(envConfig?.jobs?.observationIngestionToken);
const emailIntegration = readObject(envConfig?.integrations?.email);
const resendApiKey = readString(emailIntegration?.apiKey);
const emailFrom = readString(emailIntegration?.from);
const emailReplyTo = readString(emailIntegration?.replyTo);
const appBaseUrl =
  readString(envConfig?.urls?.app) ?? readString(envConfig?.urls?.web);

const env = { ...process.env };

setIfPresent(env, "PORT", apiPort);
setIfPresent(env, "FIREBASE_PROJECT_ID", firebaseProjectId);
setIfPresent(env, "ADMIN_EMAILS", adminEmails);
setIfPresent(env, "WHAT3WORDS_API_KEY", what3wordsApiKey);
setIfPresent(env, "OBSERVATION_JOB_TOKEN", observationJobToken);
setIfPresent(env, "RESEND_API_KEY", resendApiKey);
setIfPresent(env, "EMAIL_FROM", emailFrom);
setIfPresent(env, "EMAIL_REPLY_TO", emailReplyTo);
setIfPresent(env, "APP_BASE_URL", appBaseUrl);
if (resendApiKey) {
  env.EMAIL_PROVIDER = "resend";
}

// Firebase Admin SDK credentials for local dev. A service-account key avoids the
// reauth (invalid_rapt) failures that user ADC hits on Workspace accounts, and is
// the recommended way to run the Admin SDK off-GCP. Drop the key at
// .config/firebase-admin.json (gitignored); it's used for privileged ops like
// generating email-verification / password-reset links.
if (!env.GOOGLE_APPLICATION_CREDENTIALS) {
  const adminKeyPath = path.join(repoDir, ".config", "firebase-admin.json");
  if (fs.existsSync(adminKeyPath)) {
    env.GOOGLE_APPLICATION_CREDENTIALS = adminKeyPath;
    console.log(`Firebase Admin: using service-account key ${adminKeyPath}`);
  } else {
    console.log(
      "Firebase Admin: no .config/firebase-admin.json found — falling back to " +
        "ADC (privileged ops like email links may fail with invalid_rapt).",
    );
  }
}

if (databaseUrl && !databaseUrl.includes("<")) {
  setIfPresent(env, "DATABASE_URL", databaseUrl);
}

console.log(`Starting RiverLaunch.app API with ${envName} runtime config.`);
console.log(`Runtime config: ${fs.existsSync(runtimePath) ? runtimePath : "not found"}`);

const child = spawn("npm", ["--prefix", "api", "run", "dev"], {
  cwd: repoDir,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readObject(value) {
  return typeof value === "object" && value !== null ? value : null;
}

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function setIfPresent(env, key, value) {
  if (value && !env[key]) {
    env[key] = value;
  }
}
