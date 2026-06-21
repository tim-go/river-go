import { describe, expect, it } from "vitest";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
  type AuthActionEmailInput,
} from "./auth-action.js";

const base: AuthActionEmailInput = {
  brandName: "RiverLaunch.app",
  logoUrl: null,
  accentColor: "#2f6bff",
  actionUrl: "https://staging.riverlaunch.info/auth/action?mode=verifyEmail&oobCode=ABC",
  recipientEmail: "paddler@example.com",
  supportEmail: "hello@mail.riverlaunch.app",
  expiresIn: "soon",
};

describe("service email templates", () => {
  it("verification email includes the action URL, brand and recipient", () => {
    const email = buildEmailVerificationEmail(base);
    expect(email.subject).toContain("RiverLaunch.app");
    // The href escapes & -> &amp;, so assert the escape-safe parts of the URL.
    expect(email.html).toContain("auth/action?mode=verifyEmail");
    expect(email.html).toContain("oobCode=ABC");
    expect(email.html).toContain("Verify email");
    expect(email.text).toContain(base.actionUrl);
    expect(email.text).toContain("paddler@example.com");
  });

  it("password reset email is distinct and links to the reset action", () => {
    const email = buildPasswordResetEmail({
      ...base,
      actionUrl: "https://staging.riverlaunch.info/auth/action?mode=resetPassword&oobCode=ABC",
    });
    expect(email.subject.toLowerCase()).toContain("reset");
    expect(email.html).toContain("Reset password");
    expect(email.html).toContain("mode=resetPassword");
  });

  it("escapes html-sensitive characters in dynamic values", () => {
    const email = buildEmailVerificationEmail({
      ...base,
      recipientEmail: "a<b>@example.com",
    });
    expect(email.html).not.toContain("a<b>@example.com");
    expect(email.html).toContain("a&lt;b&gt;@example.com");
  });
});
