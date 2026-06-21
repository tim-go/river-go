import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../auth.js";
import { getAppBaseUrl } from "../config.js";
import { getEmailTemplateBranding } from "./branding.js";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
} from "./templates/auth-action.js";
import {
  sendTransactionalEmail,
  type TransactionalEmailDelivery,
} from "./transactional-email.js";

const FIREBASE_ACTION_PARAMS = [
  "mode",
  "oobCode",
  "apiKey",
  "continueUrl",
  "lang",
  "tenantId",
];

// Rewrite Firebase's hosted action URL to our own branded /auth/action page so
// the user never sees a Firebase screen — the oobCode is applied client-side.
function toBrandedAuthActionUrl(firebaseActionUrl: string): string {
  const base = getAppBaseUrl();
  if (!base) return firebaseActionUrl;
  try {
    const source = new URL(firebaseActionUrl);
    const target = new URL("/auth/action", base);
    for (const param of FIREBASE_ACTION_PARAMS) {
      const value = source.searchParams.get(param);
      if (value) target.searchParams.set(param, value);
    }
    return target.toString();
  } catch {
    return firebaseActionUrl;
  }
}

function getSupportEmail(): string | null {
  return process.env.EMAIL_REPLY_TO?.trim() || null;
}

export async function sendBrandedEmailVerification(input: {
  firebaseUid: string;
}): Promise<TransactionalEmailDelivery> {
  const auth = getAuth(getFirebaseAdminApp());
  const user = await auth.getUser(input.firebaseUid);

  if (!user.email) {
    return { status: "skipped", reason: "firebase_user_has_no_email" };
  }
  if (user.emailVerified) {
    return { status: "skipped", reason: "firebase_email_already_verified" };
  }

  const actionUrl = toBrandedAuthActionUrl(
    await auth.generateEmailVerificationLink(user.email),
  );
  const template = buildEmailVerificationEmail({
    ...getEmailTemplateBranding(),
    actionUrl,
    recipientEmail: user.email,
    supportEmail: getSupportEmail(),
    expiresIn: "soon",
  });

  return sendTransactionalEmail({
    to: user.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendBrandedPasswordReset(input: {
  email: string;
}): Promise<TransactionalEmailDelivery> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { status: "skipped", reason: "email_missing" };

  const auth = getAuth(getFirebaseAdminApp());

  let actionUrl: string;
  try {
    actionUrl = toBrandedAuthActionUrl(await auth.generatePasswordResetLink(email));
  } catch {
    // Includes auth/user-not-found — never reveal whether an account exists.
    return { status: "skipped", reason: "user_not_found_or_link_unavailable" };
  }

  const template = buildPasswordResetEmail({
    ...getEmailTemplateBranding(),
    actionUrl,
    recipientEmail: email,
    supportEmail: getSupportEmail(),
    expiresIn: "in about an hour",
  });

  return sendTransactionalEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}
