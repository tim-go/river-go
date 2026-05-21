import { dirname } from "node:path";
import {
  defaultPlatformConfigPath,
  loadPlatformConfig,
  templatePlatformConfigPath,
  validatePlatformConfig,
} from "./lib/config.mjs";

const { config, path: configPath, source } = loadPlatformConfig();
const { errors, warnings } = validatePlatformConfig(config);

console.log("River Go platform config check");
console.log(`Config: ${configPath}`);
console.log(`Source: ${source}`);

if (source === "template") {
  console.log("");
  console.log("Local config not found. To create one:");
  console.log(`  mkdir -p ${dirname(defaultPlatformConfigPath)}`);
  console.log(`  cp ${templatePlatformConfigPath} ${defaultPlatformConfigPath}`);
}

if (warnings.length > 0) {
  console.log("");
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.log("");
  console.log("Errors:");
  for (const error of errors) {
    console.log(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log("");
  console.log("OK: platform configuration shape is valid.");
}
