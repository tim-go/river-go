#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import process from "node:process";

const repoDir = process.cwd();
const defaultPorts = ["5173", "5174", "6173", "8080"];
const ports = process.argv.slice(2).length > 0 ? process.argv.slice(2) : defaultPorts;

const listeners = getListeners()
  .filter((listener) => ports.includes(listener.port))
  .filter((listener) => isRiverGoProcess(listener, repoDir));

if (listeners.length === 0) {
  console.log(`No River Go dev processes found on ports ${ports.join(", ")}.`);
  process.exit(0);
}

for (const listener of listeners) {
  console.log(`Stopping pid ${listener.pid} on port ${listener.port}: ${listener.command}`);
  try {
    process.kill(listener.pid, "SIGTERM");
  } catch (error) {
    console.warn(
      `Could not stop pid ${listener.pid}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

setTimeout(() => {
  const remaining = getListeners()
    .filter((listener) => ports.includes(listener.port))
    .filter((listener) => isRiverGoProcess(listener, repoDir));

  for (const listener of remaining) {
    console.log(`Force stopping pid ${listener.pid} on port ${listener.port}.`);
    try {
      process.kill(listener.pid, "SIGKILL");
    } catch (error) {
      console.warn(
        `Could not force stop pid ${listener.pid}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}, 500);

function getListeners() {
  let output = "";

  try {
    output = execFileSync("ss", ["-ltnp"], { encoding: "utf8" });
  } catch (error) {
    console.error(
      `Could not inspect listening ports with ss: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exit(1);
  }

  return output
    .split("\n")
    .map((line) => parseListenerLine(line))
    .filter((listener) => listener !== null);
}

function parseListenerLine(line) {
  const addressMatch = line.match(/\s(?:\[?::ffff:)?(?:127\.0\.0\.1|0\.0\.0\.0|\*|::1|\[::\])\]?:([0-9]+)\s/);
  const pidMatch = line.match(/pid=([0-9]+)/);

  if (!addressMatch || !pidMatch) {
    return null;
  }

  const pid = Number.parseInt(pidMatch[1], 10);

  if (!Number.isFinite(pid)) {
    return null;
  }

  return {
    pid,
    port: addressMatch[1],
    command: readCommand(pid),
  };
}

function readCommand(pid) {
  try {
    return execFileSync("ps", ["-p", String(pid), "-o", "args="], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
}

function isRiverGoProcess(listener, repoDir) {
  const command = listener.command;

  if (!command.includes(repoDir)) {
    return false;
  }

  if (listener.port === "8080") {
    return command.includes("/api/") && command.includes("src/server.ts");
  }

  return command.includes("/node_modules/.bin/vite");
}
