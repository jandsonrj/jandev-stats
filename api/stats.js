import { fetchUserStats } from '../lib/github.js';
import { resolveTheme } from '../lib/themes.js';
import { calculateRank } from '../lib/rank.js';
import { ICONS } from '../lib/icons.js';

const CARD_WIDTH = 495;
const CARD_HEIGHT = 195;

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function statLine({ icon, label, value, y, theme, delay }) {
  return `
    <g class="stagger" style="animation-delay: ${delay}ms" transform="translate(25, ${y})">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="${theme.icon}">
        <path d="${icon}"/>
      </svg>
      <text x="25" y="12.5" class="stat-label">${escapeXml(label)}</text>
      <text x="220" y="12.5" class="stat-value">${escapeXml(value)}</text>
    </g>
  `;
}

function rankCircle({ level, percentile, theme }) {
  // Anel SVG — quanto MELHOR o rank, mais "completo" o círculo
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  // percentile vai de ~0 (S) a ~100 (C). Invertemos: progress 100 = S full circle.
  const progress = Math.max(0, Math.min(100, 100 - percentile));
  const offset = circumference - (progress / 100) * circumference;

  return `
    <g transform="translate(${CARD_WIDTH - 100}, ${CARD_HEIGHT / 2})">
      <circle cx="0" cy="0" r="${radius}" fill="none" stroke="${theme.icon}" stroke-opacity="0.2" stroke-width="6"/>
      <circle cx="0" cy="0" r="${radius}" fill="none"
        stroke="${theme.icon}" stroke-width="6"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${circumference}"
        stroke-linecap="round"
        transform="rotate(-90)"
        class="rank-progress"
        style="--target-offset: ${offset}"
      />
      <text x="0" y="0" text-anchor="middle" dominant-baseline="central" class="rank-text">${escapeXml(level)}</text>
    </g>
  `;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = url.searchParams.get('username');
  const themeName = url.searchParams.get('theme') || 'vision-friendly-dark';
  const hideRank = url.searchParams.get('hide_rank') === 'true';
  const hideTitle = url.searchParams.get('hide_title') === 'true';
  const customTitle = url.searchParams.get('custom_title');

  if (!username) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.end(errorSvg('Missing ?username parameter'));
  }

  const theme = resolveTheme(themeName);

  try {
    const stats = await fetchUserStats(username);
    const rank = calculateRank({
      commits: stats.totalCommits,
      prs: stats.totalPRs,
      issues: stats.totalIssues,
      stars: stats.totalStars,
      followers: stats.followers,
    });

    const title = customTitle || `${stats.name}'s GitHub Stats`;

    const svg = `
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}"
  fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="descId">
  <title id="titleId">${escapeXml(title)}</title>
  <desc id="descId">GitHub stats for ${escapeXml(username)}</desc>
  <style>
    .title { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .stat-label { font: 400 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; }
    .stat-value { font: 700 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; text-anchor: end; }
    .rank-text { font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .stagger { opacity: 0; animation: fade-in 0.3s ease-in-out forwards; }
    .rank-progress { animation: ring 1s ease-in-out forwards; }
    @keyframes fade-in { to { opacity: 1; } }
    @keyframes ring { to { stroke-dashoffset: var(--target-offset); } }
  </style>

  <rect x="0.5" y="0.5" rx="6" width="${CARD_WIDTH - 1}" height="${CARD_HEIGHT - 1}"
    fill="${theme.bg}" stroke="${theme.border}" stroke-opacity="1"/>

  ${hideTitle ? '' : `<text x="25" y="35" class="title">${escapeXml(title)}</text>`}

  ${statLine({ icon: ICONS.star, label: 'Total Stars Earned:', value: stats.totalStars, y: 55, theme, delay: 150 })}
  ${statLine({ icon: ICONS.commits, label: 'Total Commits:', value: stats.totalCommits, y: 80, theme, delay: 300 })}
  ${statLine({ icon: ICONS.prs, label: 'Total PRs:', value: stats.totalPRs, y: 105, theme, delay: 450 })}
  ${statLine({ icon: ICONS.issues, label: 'Total Issues:', value: stats.totalIssues, y: 130, theme, delay: 600 })}
  ${statLine({ icon: ICONS.contribs, label: 'Contributed to (last year):', value: stats.contributedTo, y: 155, theme, delay: 750 })}

  ${hideRank ? '' : rankCircle({ level: rank.level, percentile: rank.percentile, theme })}
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=14400, stale-while-revalidate=86400');
    return res.end(svg);
  } catch (err) {
    console.error('[stats] error:', err);
    res.statusCode = 200; // 200 pra o GitHub renderizar mesmo em erro
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(errorSvg(err.message || 'Unknown error', theme));
  }
}

function errorSvg(message, theme = { bg: '#0a0a0a', text: '#ff5252', border: '#ff5252' }) {
  return `<svg width="${CARD_WIDTH}" height="80" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" rx="6" width="${CARD_WIDTH - 1}" height="79" fill="${theme.bg}" stroke="${theme.border}"/>
    <text x="20" y="45" fill="${theme.text}" font-family="Segoe UI, sans-serif" font-size="14">⚠ ${escapeXml(message)}</text>
  </svg>`;
}
