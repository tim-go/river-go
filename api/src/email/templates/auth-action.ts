import {
  escapeHtml,
  renderEmailShell,
  type EmailTemplateBranding,
  type RenderedEmailTemplate,
} from "./common.js";

export type AuthActionEmailInput = EmailTemplateBranding & {
  actionUrl: string;
  recipientEmail?: string | null;
  supportEmail?: string | null;
  expiresIn?: string | null;
};

type AuthActionTemplateConfig = {
  subject: string;
  intro: string;
  ctaLabel: string;
  securityNote: string;
};

function recipientLine(recipientEmail: string | null | undefined): string | null {
  return recipientEmail?.trim() ? `Account: ${recipientEmail.trim()}` : null;
}

function expiryLine(expiresIn: string | null | undefined): string {
  return expiresIn?.trim()
    ? `This link expires ${expiresIn.trim()}.`
    : "This link will expire soon.";
}

function supportLine(supportEmail: string | null | undefined): string {
  return supportEmail?.trim()
    ? `If you need help, contact ${supportEmail.trim()}.`
    : "If you need help, just reply to this email.";
}

function buildAuthActionEmail(
  input: AuthActionEmailInput,
  config: AuthActionTemplateConfig,
): RenderedEmailTemplate {
  const accountLine = recipientLine(input.recipientEmail);
  const expiry = expiryLine(input.expiresIn);
  const support = supportLine(input.supportEmail);
  const lines = [
    config.intro,
    "",
    accountLine,
    `${config.ctaLabel}: ${input.actionUrl}`,
    "",
    expiry,
    "",
    config.securityNote,
    support,
  ].filter(Boolean);

  const htmlAccount = accountLine
    ? `<p style="margin: 0 0 16px; color: #64748b;">${escapeHtml(accountLine)}</p>`
    : "";

  const html = renderEmailShell({
    branding: input,
    title: config.ctaLabel,
    bodyHtml: `
      <p style="margin: 0 0 16px;">${escapeHtml(config.intro)}</p>
      ${htmlAccount}
      <p style="margin: 0;">${escapeHtml(expiry)}</p>
    `,
    cta: {
      label: config.ctaLabel,
      url: input.actionUrl,
    },
    fallbackUrl: input.actionUrl,
    footerHtml: `${escapeHtml(config.securityNote)}<br />${escapeHtml(support)}`,
  });

  return {
    subject: config.subject,
    text: lines.join("\n"),
    html,
  };
}

export function buildEmailVerificationEmail(
  input: AuthActionEmailInput,
): RenderedEmailTemplate {
  return buildAuthActionEmail(input, {
    subject: `Verify your ${input.brandName} email`,
    intro: `Welcome to ${input.brandName}! Please confirm your email address to finish setting up your account.`,
    ctaLabel: "Verify email",
    securityNote:
      "If you did not create an account with this email address, you can safely ignore this email.",
  });
}

export function buildPasswordResetEmail(
  input: AuthActionEmailInput,
): RenderedEmailTemplate {
  return buildAuthActionEmail(input, {
    subject: `Reset your ${input.brandName} password`,
    intro: `We received a request to reset the password for your ${input.brandName} account.`,
    ctaLabel: "Reset password",
    securityNote:
      "If you did not request this, you can ignore this email and your password will stay unchanged.",
  });
}
