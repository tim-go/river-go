import { afterEach, describe, expect, it } from "vitest";
import {
  isAcceptedSchedulerIdentity,
  isAuthorizedSchedulerOidc,
} from "./observation-job-auth.js";

const SCHEDULER_SA =
  "river-levels-scheduler@example-project.iam.gserviceaccount.com";

describe("isAcceptedSchedulerIdentity", () => {
  it("accepts a verified token from the configured service account", () => {
    expect(
      isAcceptedSchedulerIdentity(
        { email: SCHEDULER_SA, email_verified: true },
        SCHEDULER_SA,
      ),
    ).toBe(true);
  });

  it("rejects a token from a different service account", () => {
    expect(
      isAcceptedSchedulerIdentity(
        { email: "attacker@example-project.iam.gserviceaccount.com", email_verified: true },
        SCHEDULER_SA,
      ),
    ).toBe(false);
  });

  it("rejects an unverified email even if it matches", () => {
    expect(
      isAcceptedSchedulerIdentity(
        { email: SCHEDULER_SA, email_verified: false },
        SCHEDULER_SA,
      ),
    ).toBe(false);
  });

  it("rejects when no scheduler identity is configured", () => {
    expect(
      isAcceptedSchedulerIdentity(
        { email: SCHEDULER_SA, email_verified: true },
        undefined,
      ),
    ).toBe(false);
  });

  it("rejects a missing payload", () => {
    expect(isAcceptedSchedulerIdentity(undefined, SCHEDULER_SA)).toBe(false);
  });
});

describe("isAuthorizedSchedulerOidc", () => {
  const original = {
    audience: process.env.OBSERVATION_JOB_OIDC_AUDIENCE,
    serviceAccount: process.env.OBSERVATION_JOB_SERVICE_ACCOUNT,
  };

  afterEach(() => {
    process.env.OBSERVATION_JOB_OIDC_AUDIENCE = original.audience;
    process.env.OBSERVATION_JOB_SERVICE_ACCOUNT = original.serviceAccount;
  });

  it("returns false (without any network call) when OIDC is not configured", async () => {
    delete process.env.OBSERVATION_JOB_OIDC_AUDIENCE;
    delete process.env.OBSERVATION_JOB_SERVICE_ACCOUNT;
    await expect(
      isAuthorizedSchedulerOidc({ authorization: "Bearer anything" }),
    ).resolves.toBe(false);
  });

  it("returns false when configured but no bearer token is present", async () => {
    process.env.OBSERVATION_JOB_OIDC_AUDIENCE =
      "https://api.example/api/jobs/observations/ingest";
    process.env.OBSERVATION_JOB_SERVICE_ACCOUNT = SCHEDULER_SA;
    await expect(isAuthorizedSchedulerOidc({})).resolves.toBe(false);
  });
});
