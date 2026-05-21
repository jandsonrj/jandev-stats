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

// Caminho de uma chama — forma fechada, pensada pra ser preenchida.
const FLAME_D = 'M12 2c-1 3-3 5-3 8a3 3 0 0 0 6 0c0-1 1-2 1-3 2 2 3 5 3 8a7 7 0 1 1-14 0c0-5 4-9 7-13z';

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = url.searchParams.get('username');
  const themeName = url.searchParams.get('theme') || 'vision-friendly-dark';

  if (!username) {
    res.statusCode = 400;
    return res.end('Missing ?username');
  }

  const theme = resolveTheme(themeName);
  const W = parseInt(url.searchParams.get('card_width') || '495', 10);
  const H = parseInt(url.searchParams.get('height') || '195', 10);

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
    @keyframes rise { from { opacity: 0; } to { opacity: 1; } }
  </style>

  <defs>
    <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#ff3d17"/>
      <stop offset="52%" stop-color="#ff8c2f"/>
      <stop offset="100%" stop-color="#ffe07a"/>
    </linearGradient>
    <filter id="flameBlur" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="2.2"/>
    </filter>
  </defs>

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
    <g transform="translate(0, -42)">
      <g>
        <animateTransform attributeName="transform" type="scale"
          values="0.95;1.1;0.95" keyTimes="0;0.5;1" calcMode="spline"
          keySplines="0.4 0 0.6 1;0.4 0 0.6 1" dur="2.6s" repeatCount="indefinite"/>
        <g transform="translate(-11, -25)">
          <path fill="#ff6a1a" filter="url(#flameBlur)" d="${FLAME_D}">
            <animate attributeName="opacity" values="0.25;0.55;0.25"
              dur="2.6s" repeatCount="indefinite"/>
          </path>
          <path fill="url(#flameGrad)" d="${FLAME_D}"/>
        </g>
      </g>
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
