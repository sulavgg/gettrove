// Shared email template utilities for LOCKD

const BRAND_COLOR = '#7C3AED';
const BRAND_COLOR_LIGHT = '#A78BFA';
const BG_DARK = '#0F1117';
const BG_CARD = '#1A1D2B';
const TEXT_PRIMARY = '#EDEDED';
const TEXT_MUTED = '#9CA3AF';
const SUCCESS_COLOR = '#22C55E';
const WARNING_COLOR = '#F59E0B';
const DESTRUCTIVE_COLOR = '#EF4444';

export const APP_URL = 'https://habitzv1.lovable.app';

export function emailWrapper(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:${BG_DARK}; color:${TEXT_PRIMARY}; font-family:'Segoe UI',Helvetica,Arial,sans-serif; }
    .wrapper { max-width:600px; margin:0 auto; background:${BG_DARK}; }
    .card { background:${BG_CARD}; border-radius:12px; padding:24px; margin:16px; }
    .section-title { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:${BRAND_COLOR_LIGHT}; margin:0 0 12px 0; }
    .stat-row { display:flex; align-items:center; padding:6px 0; font-size:15px; line-height:1.5; }
    .stat-label { color:${TEXT_MUTED}; }
    .stat-value { color:${TEXT_PRIMARY}; font-weight:600; }
    .cta-btn { display:inline-block; background:${BRAND_COLOR}; color:#FFFFFF !important; font-weight:700; font-size:16px; padding:14px 32px; border-radius:12px; text-decoration:none; text-align:center; }
    .cta-row { text-align:center; padding:24px 16px; }
    .divider { border:none; border-top:1px solid #2D3142; margin:16px 0; }
    .footer { text-align:center; padding:16px; font-size:12px; color:${TEXT_MUTED}; }
    .footer a { color:${BRAND_COLOR_LIGHT}; text-decoration:underline; }
    .alert-box { border-radius:8px; padding:12px 16px; margin-bottom:12px; font-size:14px; }
    .alert-warning { background:${WARNING_COLOR}22; border:1px solid ${WARNING_COLOR}44; color:${WARNING_COLOR}; }
    .alert-success { background:${SUCCESS_COLOR}22; border:1px solid ${SUCCESS_COLOR}44; color:${SUCCESS_COLOR}; }
    .alert-danger { background:${DESTRUCTIVE_COLOR}22; border:1px solid ${DESTRUCTIVE_COLOR}44; color:${DESTRUCTIVE_COLOR}; }
    .badge { display:inline-block; background:${BRAND_COLOR}33; color:${BRAND_COLOR_LIGHT}; font-size:12px; font-weight:600; padding:4px 10px; border-radius:20px; }
    .preheader { display:none !important; max-height:0; overflow:hidden; mso-hide:all; }
    @media only screen and (max-width:620px) {
      .wrapper { width:100% !important; }
      .card { margin:8px !important; padding:16px !important; }
    }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div class="wrapper">
    <!-- Header -->
    <div style="text-align:center;padding:32px 16px 8px;">
      <span style="font-size:28px;font-weight:800;color:${TEXT_PRIMARY};letter-spacing:-1px;">LOCKD</span>
    </div>
    ${body}
    <!-- Footer -->
    <div class="footer">
      <hr class="divider" />
      <p><a href="${APP_URL}/profile">Manage notifications</a> · <a href="${APP_URL}/profile">Unsubscribe</a></p>
      <p style="margin-top:8px;">LOCKD — Stay locked or get exposed</p>
      <p style="color:#555;">habitzv1.lovable.app</p>
    </div>
  </div>
</body>
</html>`;
}

export function statusSection(postedToday: boolean, currentStreak: number, hoursLeft: number): string {
  if (postedToday) {
    return `
      <div class="alert-box alert-success">✅ Posted today — streak safe</div>
      <div class="stat-row">🔥 <span class="stat-value" style="margin-left:8px;">Current Streak: ${currentStreak} days</span></div>`;
  }
  return `
    <div class="alert-box alert-warning">⚠️ You haven't posted yet today</div>
    <div class="stat-row">🔥 <span class="stat-value" style="margin-left:8px;">Current Streak: ${currentStreak} days (ends in ~${hoursLeft} hours)</span></div>`;
}

export function rankSection(rank: number, total: number, rankChange: number): string {
  const arrow = rankChange > 0 ? `↑ +${rankChange}` : rankChange < 0 ? `↓ ${rankChange}` : '—';
  const arrowColor = rankChange > 0 ? SUCCESS_COLOR : rankChange < 0 ? DESTRUCTIVE_COLOR : TEXT_MUTED;
  return `<div class="stat-row">📊 <span class="stat-value" style="margin-left:8px;">Rank: #${rank} of ${total}</span> <span style="color:${arrowColor};margin-left:8px;font-size:13px;">(${arrow} from yesterday)</span></div>`;
}

export function pointsSection(pointsToday: number, pointsWeek: number, weeklyRank: number | null): string {
  let html = `<div class="stat-row">⚡ <span class="stat-value" style="margin-left:8px;">Points Today: ${pointsToday} pts</span></div>`;
  html += `<div class="stat-row">📈 <span class="stat-value" style="margin-left:8px;">This Week: ${pointsWeek} pts`;
  if (weeklyRank) html += ` (Rank #${weeklyRank} in weekly)`;
  html += `</span></div>`;
  return html;
}

export function challengeSection(
  challengeName: string,
  progress: string,
  gap: string,
  daysLeft: number
): string {
  return `
    <div class="card">
      <div class="section-title">═══ THIS WEEK'S CHALLENGE ═══</div>
      <div class="stat-row" style="font-size:16px;font-weight:600;">🌅 ${challengeName}</div>
      <div class="stat-row">${progress}</div>
      <div class="stat-row" style="color:${TEXT_MUTED};font-size:13px;">${gap} · ${daysLeft} days left</div>
    </div>`;
}

export function groupsSection(groups: Array<{ emoji: string; name: string; updates: string[] }>): string {
  if (!groups.length) return '';
  let html = `<div class="card"><div class="section-title">═══ YOUR GROUPS ═══</div>`;
  for (const g of groups) {
    html += `<div style="margin-bottom:12px;">
      <div style="font-weight:600;font-size:15px;">${g.emoji} ${g.name}</div>`;
    for (const u of g.updates) {
      html += `<div style="color:${TEXT_MUTED};font-size:13px;padding-left:24px;">${u}</div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

export function happeningSection(items: string[]): string {
  if (!items.length) return '';
  let html = `<div class="card"><div class="section-title">═══ WHAT'S HAPPENING ═══</div>`;
  for (const item of items) {
    html += `<div class="stat-row" style="font-size:14px;">${item}</div>`;
  }
  html += `</div>`;
  return html;
}

export function ctaButtons(): string {
  return `
    <div class="cta-row">
      <a href="${APP_URL}/post" class="cta-btn" style="margin-right:8px;">Post Now</a>
      <a href="${APP_URL}/leaderboard" class="cta-btn" style="background:#374151;">View Leaderboard</a>
    </div>`;
}

export function celebrationTemplate(
  emoji: string,
  headline: string,
  body: string,
  ctaLabel: string,
  ctaUrl: string
): string {
  return `
    <div class="card" style="text-align:center;">
      <div style="font-size:64px;margin-bottom:16px;">${emoji}</div>
      <h1 style="font-size:24px;font-weight:800;margin:0 0 8px;">${headline}</h1>
      <p style="color:${TEXT_MUTED};font-size:15px;line-height:1.6;">${body}</p>
    </div>
    <div class="cta-row">
      <a href="${ctaUrl}" class="cta-btn">${ctaLabel}</a>
    </div>`;
}
