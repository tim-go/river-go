#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const [, , envName = "local", ...command] = process.argv;

if (!command.length) {
  console.error("Usage: node scripts/dev/run-api-runtime-command.mjs <env> <command...>");
  process.exit(1);
}

const repoDir = process.cwd();
const platformDir = path.join(repoDir, "platform");
const runtimePath =
  process.env.RIVER_GO_RUNTIME_CONFIG ??
  path.join(platformDir, ".config", "river-go-runtime.json");

const runtimeConfig = readJson(runtimePath, {});
const envConfig = readObject(runtimeConfig[envName]);
const env = { ...process.env };
const databaseUrlKey =
  process.env.RIVER_GO_DATABASE_URL_KEY === "adminUrl"
    ? "adminUrl"
    : process.env.RIVER_GO_DATABASE_URL_KEY === "migrationsUrl"
      ? "migrationsUrl"
      : "url";

setIfPresent(env, "DATABASE_URL", readString(envConfig?.database?.[databaseUrlKey]));
setIfPresent(env, "FIREBASE_PROJECT_ID", readString(envConfig?.firebase?.projectId));
setIfPresent(env, "ADMIN_EMAILS", readString(envConfig?.auth?.adminEmails));
setIfPresent(
  env,
  "WHAT3WORDS_API_KEY",
  readString(envConfig?.integrations?.what3words?.apiKey),
);
setIfPresent(
  env,
  "OBSERVATION_JOB_TOKEN",
  readString(envConfig?.jobs?.observationIngestionToken),
);

console.log(`Running API command with ${envName} runtime config.`);
console.log(`Runtime config: ${fs.existsSync(runtimePath) ? runtimePath : "not found"}`);

const child = spawn(command[0], command.slice(1), {
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
  if (value && !value.includes("<") && !env[key]) {
    env[key] = value;
  }
}
