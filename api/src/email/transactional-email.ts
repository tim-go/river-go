export type TransactionalEmailProvider = "resend";

export type TransactionalEmailConfig = {
  provider: TransactionalEmailProvider;
  from: string;
  replyTo?: string;
  resendApiKey: string;
};

export type TransactionalEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type TransactionalEmailDelivery =
  | { status: "sent"; provider: TransactionalEmailProvider; messageId: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; provider: TransactionalEmailProvider; error: string };

type Env = Record<string, string | undefined>;

export function getTransactionalEmailConfig(
  env: Env = process.env,
): TransactionalEmailConfig | null {
  const provider = env.EMAIL_PROVIDER?.trim();
  if (provider !== "resend") return null;

  const from = env.EMAIL_FROM?.trim();
  const resendApiKey = env.RESEND_API_KEY?.trim();
  if (!from || !resendApiKey) return null;

  const replyTo = env.EMAIL_REPLY_TO?.trim();
  return {
    provider,
    from,
    ...(replyTo ? { replyTo } : {}),
    resendApiKey,
  };
}

export async function sendTransactionalEmail(
  message: TransactionalEmailMessage,
  config = getTransactionalEmailConfig(),
): Promise<TransactionalEmailDelivery> {
  if (!config) {
    return { status: "skipped", reason: "transactional_email_not_configured" };
  }

  return sendResendEmail(message, config);
}

async function sendResendEmail(
  message: TransactionalEmailMessage,
  config: TransactionalEmailConfig,
): Promise<TransactionalEmailDelivery> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(config.replyTo ? { reply_to: config.replyTo } : {}),
      }),
    });

    const body = (await res.json().catch(() => null)) as
      | { id?: unknown; message?: unknown; error?: unknown }
      | null;

    if (!res.ok) {
      const error =
        typeof body?.message === "string"
          ? body.message
          : typeof body?.error === "string"
            ? body.error
            : `Resend API returned ${res.status}`;
      return { status: "failed", provider: "resend", error };
    }

    return {
      status: "sent",
      provider: "resend",
      messageId: typeof body?.id === "string" ? body.id : null,
    };
  } catch (error) {
    return {
      status: "failed",
      provider: "resend",
      error: error instanceof Error ? error.message : "Unknown email provider error",
    };
  }
}
