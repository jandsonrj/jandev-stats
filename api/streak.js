import { fetchStreakStats } from '../lib/github.js';
import { resolveTheme } from '../lib/themes.js';

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmtRange(start, end) {
  if (!start) return '—';
  const fmt = (s) => {
    const d = new Date(s);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  if (!end || start === end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

const FIRE_ICON = `
  <path d="M12 2c-1 3-3 5-3 8a3 3 0 0 0 6 0c0-1 1-2 1-3 2 2 3 5 3 8a7 7 0 1 1-14 0c0-5 4-9 7-13z"
        fill="none" stroke-width="1.5" stroke-linejoin="round"/>
`;

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = url.searchParams.get('username');
  const themeName = url.searchParams.get('theme') || 'vision-friendly-dark';

  if (!username) {
    res.statusCode = 400;
    return res.end('Missing ?username');
  }

  const theme = resolveTheme(themeName);
  const W = 495;
  const H = 195;

  try {
    const s = await fetchStreakStats(username);

    const colW = W / 3;

    const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
  fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t">
  <title id="t">${escapeXml(username)} streak stats</title>
  <style>
    .num    { font: 700 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .label  { font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; }
    .sub    { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; opacity: 0.7; }
    .col    { opacity: 0; animation: rise 0.5s ease-out forwards; }
    .col1   { animation-delay: 100ms; }
    .col2   { animation-delay: 250ms; }
    .col3   { animation-delay: 400ms; }
    .fire   { stroke: ${theme.icon}; animation: flicker 2s ease-in-out infinite; }
    @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  </style>

  <rect x="0.5" y="0.5" rx="6" width="${W - 1}" height="${H - 1}"
    fill="${theme.bg}" stroke="${theme.border}"/>

  <!-- Coluna 1: Total contributions -->
  <g class="col col1" transform="translate(${colW * 0.5}, ${H / 2})">
    <text class="num" x="0" y="-15" text-anchor="middle">${s.totalContributions.toLocaleString()}</text>
    <text class="label" x="0" y="15" text-anchor="middle">Total Contributions</text>
    <text class="sub" x="0" y="35" text-anchor="middle">${fmtRange(s.firstDate, s.lastDate)}</text>
  </g>

  <!-- Divisor -->
  <line x1="${colW}" y1="30" x2="${colW}" y2="${H - 30}" stroke="${theme.border}" stroke-opacity="0.3" stroke-width="0.5"/>

  <!-- Coluna 2: Current streak (com chama) -->
  <g class="col col2" transform="translate(${colW * 1.5}, ${H / 2})">
    <g transform="translate(-12, -68) scale(1)" class="fire" fill="none">
      ${FIRE_ICON}
    </g>
    <text class="num" x="0" y="-15" text-anchor="middle">${s.currentStreak}</text>
    <text class="label" x="0" y="15" text-anchor="middle">Current Streak</text>
    <text class="sub" x="0" y="35" text-anchor="middle">${s.currentStreak > 0 ? fmtRange(s.currentStart, s.currentEnd) : 'No active streak'}</text>
  </g>

  <!-- Divisor -->
  <line x1="${colW * 2}" y1="30" x2="${colW * 2}" y2="${H - 30}" stroke="${theme.border}" stroke-opacity="0.3" stroke-width="0.5"/>

  <!-- Coluna 3: Longest streak -->
  <g class="col col3" transform="translate(${colW * 2.5}, ${H / 2})">
    <text class="num" x="0" y="-15" text-anchor="middle">${s.longestStreak}</text>
    <text class="label" x="0" y="15" text-anchor="middle">Longest Streak</text>
    <text class="sub" x="0" y="35" text-anchor="middle">${fmtRange(s.longestStart, s.longestEnd)}</text>
  </g>
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=14400, stale-while-revalidate=86400');
    return res.end(svg);
  } catch (err) {
    console.error('[streak] error:', err);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(`<svg width="${W}" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" rx="6" width="${W - 1}" height="79" fill="${theme.bg}" stroke="${theme.border}"/>
      <text x="20" y="45" fill="#ff5252" font-family="Segoe UI" font-size="14">⚠ ${escapeXml(err.message)}</text>
    </svg>`);
  }
}
