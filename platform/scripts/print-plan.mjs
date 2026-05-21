import {
  getEnvironment,
  loadPlatformConfig,
  validatePlatformConfig,
} from "./lib/config.mjs";

const envName = process.argv[2];

if (!envName || !["staging", "prod"].includes(envName)) {
  console.error("Usage: node scripts/print-plan.mjs <staging|prod>");
  process.exit(1);
}

const { config, path, source } = loadPlatformConfig();
const { errors, warnings } = validatePlatformConfig(config);

if (errors.length > 0) {
  console.error("Platform config has structural errors. Run npm run platform:check.");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

const env = getEnvironment(config, envName);

console.log(`River Go platform plan: ${envName}`);
console.log(`Config: ${path}`);
console.log(`Source: ${source}`);

if (warnings.length > 0) {
  console.log("");
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

console.log("");
console.log("Target resources:");
console.log(`- GCP project: ${env.gcpProject}`);
console.log(`- Region: ${env.region}`);
console.log(`- Firebase project: ${env.firebaseProject}`);
console.log(`- Firebase Hosting site: ${env.firebaseHostingSite}`);
console.log(`- Web domain: ${env.domains.web}`);
console.log(`- API route/domain: ${env.domains.api}`);
console.log(`- Cloud Run service: ${env.cloudRunService}`);
console.log(`- Artifact Registry repo: ${env.artifactRegistryRepository}`);
console.log(`- Cloud SQL instance: ${env.database.instance}`);
console.log(`- Cloud SQL database: ${env.database.database}`);
console.log(`- Cloud SQL app user: ${env.database.appUser}`);
console.log(`- Cloud SQL migration user: ${env.database.migrationUser}`);
console.log(`- PostGIS expected: ${env.database.postgis ? "yes" : "no"}`);
console.log(`- Firebase Storage bucket: ${env.storage.bucket}`);
console.log(`- GitHub environment: ${env.githubEnvironment}`);

console.log("");
console.log("Secrets expected:");
for (const secret of env.secrets || []) {
  console.log(`- ${secret}`);
}

console.log("");
console.log("Next provisioning script sequence:");
console.log("1. Verify or create GCP/Firebase project.");
console.log("2. Configure Firebase Hosting, Auth, and Storage.");
console.log("3. Configure Artifact Registry.");
console.log("4. Configure Cloud SQL PostgreSQL with PostGIS.");
console.log("5. Deploy Cloud Run API service.");
console.log("6. Sync Secret Manager and GitHub environment secrets.");
console.log("7. Run health checks.");
