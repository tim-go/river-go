import { getAppBaseUrl } from "../config.js";
import { getEmailTemplateBranding } from "./branding.js";
import { buildGroupInviteEmail } from "./templates/group-invite.js";
import {
  sendTransactionalEmail,
  type TransactionalEmailDelivery,
} from "./transactional-email.js";

// Send a registered invitee the "you've been invited" email. Best-effort: the
// caller fires this without blocking and the neutral invite response is
// unaffected. We never email unregistered addresses (the caller only invokes
// this once an existing member has been invited).
export async function sendGroupInviteEmail(input: {
  toEmail: string;
  groupName: string;
  groupHandleOrId: string;
  inviterName?: string | null;
}): Promise<TransactionalEmailDelivery> {
  const base = getAppBaseUrl();
  const path = `/club/${encodeURIComponent(input.groupHandleOrId)}`;
  const inviteUrl = base ? new URL(path, base).toString() : path;

  const template = buildGroupInviteEmail({
    ...getEmailTemplateBranding(),
    groupName: input.groupName,
    inviteUrl,
    inviterName: input.inviterName ?? null,
    supportEmail: process.env.EMAIL_REPLY_TO?.trim() || null,
  });

  return sendTransactionalEmail({
    to: input.toEmail,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}
