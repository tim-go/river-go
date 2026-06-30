import {
  escapeHtml,
  renderEmailShell,
  type EmailTemplateBranding,
  type RenderedEmailTemplate,
} from "./common.js";

export type GroupInviteEmailInput = EmailTemplateBranding & {
  groupName: string;
  inviteUrl: string;
  inviterName?: string | null;
  supportEmail?: string | null;
};

export function buildGroupInviteEmail(
  input: GroupInviteEmailInput,
): RenderedEmailTemplate {
  const inviter = input.inviterName?.trim();
  const intro = inviter
    ? `${inviter} invited you to join “${input.groupName}” on ${input.brandName}.`
    : `You've been invited to join “${input.groupName}” on ${input.brandName}.`;
  const support = input.supportEmail?.trim()
    ? `If you need help, contact ${input.supportEmail.trim()}.`
    : "If you weren't expecting this, you can safely ignore this email.";

  const lines = [
    intro,
    "",
    `Open the group: ${input.inviteUrl}`,
    "",
    support,
  ].filter(Boolean);

  const html = renderEmailShell({
    branding: input,
    title: "You're invited",
    bodyHtml: `
      <p style="margin: 0 0 16px;">${escapeHtml(intro)}</p>
      <p style="margin: 0;">Open the group to see its sessions, members, and plans, then accept the invite.</p>
    `,
    cta: {
      label: "View the group",
      url: input.inviteUrl,
    },
    fallbackUrl: input.inviteUrl,
    footerHtml: escapeHtml(support),
  });

  return {
    subject: `You're invited to ${input.groupName} on ${input.brandName}`,
    text: lines.join("\n"),
    html,
  };
}
