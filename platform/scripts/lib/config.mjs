import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const platformRoot = path.resolve(scriptDir, "..", "..");

export const defaultPlatformConfigPath = path.join(
  platformRoot,
  ".config",
  "river-go-platform.json",
);

export const templatePlatformConfigPath = path.join(
  platformRoot,
  "config",
  "templates",
  "river-go-platform.json",
);

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read JSON at ${filePath}: ${error.message}`);
  }
}

export function loadPlatformConfig() {
  const requestedPath = process.env.RIVER_GO_PLATFORM_CONFIG;
  const configPath =
    requestedPath ||
    (existsSync(defaultPlatformConfigPath)
      ? defaultPlatformConfigPath
      : templatePlatformConfigPath);

  return {
    config: readJson(configPath),
    path: configPath,
    source: configPath === templatePlatformConfigPath ? "template" : "local",
  };
}

function readPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => {
    if (current && Object.prototype.hasOwnProperty.call(current, key)) {
      return current[key];
    }
    return undefined;
  }, value);
}

function isBlank(value) {
  return typeof value !== "string" || value.trim() === "";
}

export function validatePlatformConfig(config) {
  const errors = [];
  const warnings = [];

  const requiredProjectFields = [
    "project.displayName",
    "project.slug",
    "project.githubRepo",
    "project.defaultRegion",
  ];

  for (const field of requiredProjectFields) {
    if (isBlank(readPath(config, field))) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const billingAccount =
    readPath(config, "project.billingAccount") || readPath(config, "billingAccount") || "";

  if (
    isBlank(readPath(config, "project.billingAccount")) &&
    isBlank(readPath(config, "billingAccount"))
  ) {
    warnings.push("project.billingAccount is blank; provisioning will need it.");
  } else if (!/^[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}-[0-9A-Fa-f]{6}$/.test(billingAccount)) {
    warnings.push("project.billingAccount does not look like a GCP billing account ID.");
  }

  const parentType =
    readPath(config, "project.resourceParent.type") || readPath(config, "resourceParent.type") || "";
  const parentId =
    readPath(config, "project.resourceParent.id") || readPath(config, "resourceParent.id") || "";
  if (!isBlank(parentType) || !isBlank(parentId)) {
    if (!["folder", "organization"].includes(parentType)) {
      warnings.push("project.resourceParent.type should be 'folder' or 'organization' when set.");
    }
    if (isBlank(parentId)) {
      warnings.push("project.resourceParent.id is required when project.resourceParent.type is set.");
    }
  }

  const environments = config.environments || {};
  for (const envName of ["staging", "prod"]) {
    const env = environments[envName];
    if (!env) {
      errors.push(`Missing required environment: ${envName}`);
      continue;
    }

    const requiredEnvFields = [
      "gcpProject",
      "firebaseProject",
      "region",
      "domains.web",
      "domains.api",
      "firebaseHostingSite",
      "cloudRunService",
      "artifactRegistryRepository",
      "githubEnvironment",
      "database.instance",
      "database.database",
      "database.appUser",
      "database.migrationUser",
      "storage.bucket",
    ];

    for (const field of requiredEnvFields) {
      if (isBlank(readPath(env, field))) {
        errors.push(`Missing required field: environments.${envName}.${field}`);
      }
    }

    if (!Array.isArray(env.secrets) || env.secrets.length === 0) {
      warnings.push(`environments.${envName}.secrets is empty.`);
    }

    if (isBlank(readPath(env, "serviceAccounts.ci"))) {
      warnings.push(
        `environments.${envName}.serviceAccounts.ci is missing; setup will default to github-actions.`,
      );
    }

    if (isBlank(readPath(env, "serviceAccounts.server"))) {
      warnings.push(
        `environments.${envName}.serviceAccounts.server is missing; setup will default to river-go-server.`,
      );
    }

    if (isBlank(readPath(env, "files.gcpSaKeyFile"))) {
      warnings.push(
        `environments.${envName}.files.gcpSaKeyFile is missing; setup will default to .config/gcp-sa-${envName}.json.`,
      );
    }

    if (isBlank(readPath(env, "files.firebaseAdminSaKeyFile"))) {
      warnings.push(
        `environments.${envName}.files.firebaseAdminSaKeyFile is missing; setup will default to .config/firebase-admin-sa-${envName}.json.`,
      );
    }

    if (isBlank(readPath(env, "files.firebaseSdkFile"))) {
      warnings.push(
        `environments.${envName}.files.firebaseSdkFile is missing; setup will default to .config/firebase-sdk-${envName}.json.`,
      );
    }

    if (env.database?.postgis !== true) {
      warnings.push(
        `environments.${envName}.database.postgis is not true; river geometry will need spatial support later.`,
      );
    }
  }

  return { errors, warnings };
}

export function getEnvironment(config, envName) {
  const env = config.environments?.[envName];
  if (!env) {
    throw new Error(`Unknown environment '${envName}'. Expected staging or prod.`);
  }
  return env;
}
