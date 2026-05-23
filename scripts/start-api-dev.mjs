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

const env = { ...process.env };

setIfPresent(env, "PORT", apiPort);
setIfPresent(env, "FIREBASE_PROJECT_ID", firebaseProjectId);
setIfPresent(env, "ADMIN_EMAILS", adminEmails);

if (databaseUrl && !databaseUrl.includes("<")) {
  setIfPresent(env, "DATABASE_URL", databaseUrl);
}

console.log(`Starting River Go API with ${envName} runtime config.`);
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
