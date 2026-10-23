import {
  EVENT_DATE_DISPLAY,
  EVENT_LOCATION_DISPLAY,
  EVENT_NAME,
} from './constants.js';

export const EMAIL_BRAND = Object.freeze({
  navy: '#0b1f3a',
  navyDark: '#061525',
  purple: '#8b3db8',
  purpleDeep: '#6b2a8f',
  lilac: '#e8d4f5',
  surface: '#ffffff',
  surfaceWarm: '#f7f4f0',
  text: '#1a2332',
  muted: '#5a6577',
  border: '#d9dde5',
});

export function eventTitle() {
  return EVENT_NAME.replace('BUSINESS', 'Business').replace(
    'EMPOWERMENT CHALLENGE',
    'Empowerment Challenge'
  );
}

export function siteOrigin(config = {}) {
  const raw = String(config.publicSiteUrl || process.env.PUBLIC_SITE_URL || '')
    .trim()
    .replace(/\/$/, '');
  return raw || 'https://www.shechampion-bbf.org';
}

export function absoluteUrl(config, path = '/') {
  const origin = siteOrigin(config);
  if (!path) return origin;
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function logoUrl(config) {
  return absoluteUrl(config, '/assets/logo-horizontal.png');
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function plainTextToHtmlParagraphs(text) {
  const escaped = escapeHtml(text).trim();
  if (!escaped) return '';
  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;color:${EMAIL_BRAND.muted};font-size:15px;line-height:1.6;">${block.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/**
 * @param {{
 *   config?: object,
 *   preheader?: string,
 *   eyebrow?: string,
 *   title: string,
 *   greeting?: string,
 *   bodyHtml: string,
 *   details?: Array<{ label: string, value: string }>,
 *   bullets?: string[],
 *   primaryCta?: { label: string, href: string },
 *   secondaryCtas?: Array<{ label: string, href: string }>,
 * }} args
 */
export function renderBrandedEmail({
  config = {},
  preheader = '',
  eyebrow = 'SHE CHAMPIONS',
  title,
  greeting,
  bodyHtml,
  details = [],
  bullets = [],
  primaryCta,
  secondaryCtas = [],
}) {
  const logo = logoUrl(config);
  const contactHref = absoluteUrl(config, '/contact');
  const eventHref = absoluteUrl(
    config,
    '/business-empowerment-challenge-2026'
  );
  const privacyHref = absoluteUrl(config, '/legal/event-privacy-notice');
  const termsHref = absoluteUrl(config, '/legal/event-participation-terms');
  const origin = siteOrigin(config);

  const detailRows = details
    .map(
      (row) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid ${EMAIL_BRAND.border};font-size:14px;color:${EMAIL_BRAND.muted};width:42%;vertical-align:top;">${escapeHtml(row.label)}</td>
        <td style="padding:8px 0;border-bottom:1px solid ${EMAIL_BRAND.border};font-size:14px;color:${EMAIL_BRAND.navy};font-weight:600;vertical-align:top;">${escapeHtml(row.value)}</td>
      </tr>`
    )
    .join('');

  const bulletHtml = bullets.length
    ? `<ul style="margin:0 0 18px;padding:0 0 0 20px;color:${EMAIL_BRAND.muted};font-size:15px;line-height:1.6;">${bullets
        .map((b) => `<li style="margin:0 0 8px;">${escapeHtml(b)}</li>`)
        .join('')}</ul>`
    : '';

  const primaryButton = primaryCta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="border-radius:6px;background:${EMAIL_BRAND.purple};">
            <a href="${escapeHtml(primaryCta.href)}" style="display:inline-block;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(primaryCta.label)}</a>
          </td>
        </tr>
      </table>`
    : '';

  const secondaryLinks = secondaryCtas.length
    ? `<p style="margin:0 0 8px;font-size:14px;line-height:1.7;">${secondaryCtas
        .map(
          (c) =>
            `<a href="${escapeHtml(c.href)}" style="color:${EMAIL_BRAND.purple};font-weight:600;text-decoration:underline;">${escapeHtml(c.label)}</a>`
        )
        .join(' &nbsp;·&nbsp; ')}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.surfaceWarm};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BRAND.surfaceWarm};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${EMAIL_BRAND.surface};border:1px solid ${EMAIL_BRAND.border};border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:${EMAIL_BRAND.navy};padding:20px 28px;text-align:left;">
              <img src="${escapeHtml(logo)}" alt="SHE CHAMPIONS" width="220" style="display:block;max-width:220px;height:auto;border:0;"/>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:${EMAIL_BRAND.purple};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;font-family:Georgia,'Times New Roman',serif;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${EMAIL_BRAND.purple};font-weight:700;">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;color:${EMAIL_BRAND.navy};font-weight:600;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;font-family:Arial,Helvetica,sans-serif;color:${EMAIL_BRAND.text};">
              ${greeting ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.text};">${escapeHtml(greeting)}</p>` : ''}
              ${bodyHtml}
              ${
                detailRows
                  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:${EMAIL_BRAND.surfaceWarm};border:1px solid ${EMAIL_BRAND.border};border-radius:8px;padding:4px 14px;">${detailRows}</table>`
                  : ''
              }
              ${bulletHtml}
              ${primaryButton}
              ${secondaryLinks}
              <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.muted};">
                ${escapeHtml(EVENT_NAME)} · ${escapeHtml(EVENT_DATE_DISPLAY)} · ${escapeHtml(EVENT_LOCATION_DISPLAY)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:${EMAIL_BRAND.navyDark};padding:20px 28px;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 10px;font-size:13px;color:#d7dee8;">SHE CHAMPIONS</p>
              <p style="margin:0 0 10px;font-size:12px;line-height:1.7;">
                <a href="${escapeHtml(eventHref)}" style="color:${EMAIL_BRAND.lilac};text-decoration:none;">Event page</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(contactHref)}" style="color:${EMAIL_BRAND.lilac};text-decoration:none;">Contact</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(privacyHref)}" style="color:${EMAIL_BRAND.lilac};text-decoration:none;">Privacy</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(termsHref)}" style="color:${EMAIL_BRAND.lilac};text-decoration:none;">Terms</a>
              </p>
              <p style="margin:0;font-size:11px;color:#9aa7b8;">
                <a href="${escapeHtml(origin)}" style="color:#9aa7b8;text-decoration:underline;">${escapeHtml(origin.replace(/^https?:\/\//, ''))}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return html;
}

export function buildTextEmail({
  greeting,
  introLines = [],
  details = [],
  bullets = [],
  ctas = [],
}) {
  const lines = [];
  if (greeting) lines.push(greeting, '');
  for (const line of introLines) lines.push(line);
  if (details.length) {
    lines.push('');
    for (const d of details) lines.push(`${d.label}: ${d.value}`);
  }
  if (bullets.length) {
    lines.push('');
    for (const b of bullets) lines.push(`- ${b}`);
  }
  if (ctas.length) {
    lines.push('');
    for (const c of ctas) lines.push(`${c.label}: ${c.href}`);
  }
  lines.push('', 'SHE CHAMPIONS');
  return lines.join('\n');
}
