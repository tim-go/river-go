export type RenderedEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export type EmailTemplateBranding = {
  brandName: string;
  logoUrl?: string | null;
  accentColor?: string | null;
};

export type EmailShellInput = {
  branding: EmailTemplateBranding;
  title: string;
  bodyHtml: string;
  cta?: {
    label: string;
    url: string;
  };
  fallbackUrl?: string | null;
  footerHtml?: string | null;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeAccentColor(value: string | null | undefined): string {
  const color = value?.trim();
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) return color;
  return "#2f6bff";
}

function logoBlock(branding: EmailTemplateBranding): string {
  const logoUrl = branding.logoUrl?.trim();
  if (!logoUrl) {
    return `<div style="font-size: 18px; font-weight: 700; color: #0b1120;">${escapeHtml(
      branding.brandName,
    )}</div>`;
  }

  return `<img src="${escapeHtml(logoUrl)}" width="72" height="72" alt="${escapeHtml(
    branding.brandName,
  )}" style="display: block; border: 0; outline: none; text-decoration: none; width: 72px; height: 72px; border-radius: 16px; margin: 0 auto;" />`;
}

function ctaBlock(input: EmailShellInput, accentColor: string): string {
  if (!input.cta) return "";

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 28px auto 8px;">
      <tr>
        <td align="center" bgcolor="${accentColor}" style="border-radius: 8px;">
          <a href="${escapeHtml(input.cta.url)}" style="display: inline-block; padding: 14px 24px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 20px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px;">${escapeHtml(
            input.cta.label,
          )}</a>
        </td>
      </tr>
    </table>
  `;
}

function fallbackUrlBlock(url: string | null | undefined): string {
  if (!url?.trim()) return "";

  return `
    <p style="margin: 24px 0 8px; font-size: 13px; line-height: 19px; color: #6b7280;">If the button does not work, copy and paste this link into your browser:</p>
    <p style="margin: 0; font-size: 13px; line-height: 19px; word-break: break-all;"><a href="${escapeHtml(
      url,
    )}" style="color: #2f6bff; text-decoration: underline;">${escapeHtml(url)}</a></p>
  `;
}

export function renderEmailShell(input: EmailShellInput): string {
  const accentColor = safeAccentColor(input.branding.accentColor);

  return `
    <!doctype html>
    <html>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(input.title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: #eef2f7;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; background: #eef2f7;">
          <tr>
            <td align="center" style="padding: 32px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width: 100%; max-width: 600px;">
                <tr>
                  <td align="center" style="padding: 0 0 18px;">
                    ${logoBlock(input.branding)}
                  </td>
                </tr>
                <tr>
                  <td style="background: #ffffff; border: 1px solid #e3e8f0; border-radius: 14px; padding: 36px 40px; font-family: Arial, Helvetica, sans-serif; color: #0b1120;">
                    <h1 style="margin: 0 0 18px; font-size: 23px; line-height: 30px; font-weight: 700; text-align: center; color: #0b1120;">${escapeHtml(
                      input.title,
                    )}</h1>
                    <div style="font-size: 16px; line-height: 24px; color: #334155;">
                      ${input.bodyHtml}
                    </div>
                    ${ctaBlock(input, accentColor)}
                    ${fallbackUrlBlock(input.fallbackUrl)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 24px 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 19px; text-align: center; color: #6b7280;">
                    ${
                      input.footerHtml ??
                      `This message was sent by ${escapeHtml(input.branding.brandName)}.`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();
}
