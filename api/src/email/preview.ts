import { getEmailTemplateBranding } from "./branding.js";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
} from "./templates/auth-action.js";

const PREVIEW_RECIPIENT = "paddler@example.com";
const PREVIEW_SUPPORT = "hello@mail.riverlaunch.app";
const previewActionUrl = (mode: string) =>
  `https://riverlaunch.app/auth/action?mode=${mode}&oobCode=PREVIEW-CODE`;

export const EMAIL_PREVIEW_TEMPLATES = ["verification", "password-reset"] as const;

// Renders a service email with sample data — no Firebase or Resend needed.
export function renderEmailPreview(
  template: string,
  format: "html" | "text",
): string | null {
  const branding = getEmailTemplateBranding();

  if (template === "verification") {
    const built = buildEmailVerificationEmail({
      ...branding,
      actionUrl: previewActionUrl("verifyEmail"),
      recipientEmail: PREVIEW_RECIPIENT,
      supportEmail: PREVIEW_SUPPORT,
      expiresIn: "soon",
    });
    return format === "text" ? built.text : built.html;
  }

  if (template === "password-reset") {
    const built = buildPasswordResetEmail({
      ...branding,
      actionUrl: previewActionUrl("resetPassword"),
      recipientEmail: PREVIEW_RECIPIENT,
      supportEmail: PREVIEW_SUPPORT,
      expiresIn: "in about an hour",
    });
    return format === "text" ? built.text : built.html;
  }

  return null;
}

export function renderEmailPreviewIndex(): string {
  const emailLinks = EMAIL_PREVIEW_TEMPLATES.map(
    (template) =>
      `<li><a href="/api/dev/email-preview?template=${template}">${template}</a> &middot; <a href="/api/dev/email-preview?template=${template}&amp;format=text">text</a></li>`,
  ).join("");

  const landingLinks = [
    ["verifyEmail", "verify email (success)"],
    ["resetPassword", "reset password (form)"],
    ["resetSuccess", "reset password (done)"],
    ["error", "error state"],
  ]
    .map(([preview, label]) => `<li><a href="/auth/action?preview=${preview}">${label}</a></li>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>RiverLaunch email previews</title></head><body style="font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; color: #0b1120;">
  <h1>RiverLaunch.app &mdash; email &amp; action previews</h1>
  <h2>Service emails</h2>
  <ul>${emailLinks}</ul>
  <h2>Landing pages (<code>/auth/action</code>)</h2>
  <p style="color:#64748b">Served by the web app &mdash; open via the Vite dev origin (e.g. http://localhost:6173/auth/action?preview=...).</p>
  <ul>${landingLinks}</ul>
  </body></html>`;
}
