import { fetchUserStats, aggregateLanguages, fetchStreakStats } from '../lib/github.js';
import { resolveTheme } from '../lib/themes.js';
import { TROPHIES, calculateTier, tierColor } from '../lib/trophies.js';
import { fireStrip } from '../lib/fire.js';

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function trophyCell({ trophy, value, tier, x, y, w, h, theme, delay }) {
  const colors = tierColor(tier);
  const isLocked = tier === 'LOCKED';
  const showValue = !isLocked;

  // Layout interno: ícone em cima centralizado, label embaixo, valor abaixo
  return `
    <g class="cell" style="animation-delay: ${delay}ms" transform="translate(${x}, ${y})">
      <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="8"
        fill="${theme.bg}" stroke="${colors.main}" stroke-width="${isLocked ? 0.5 : 1}"
        ${isLocked ? 'stroke-opacity="0.4"' : ''}/>

      <!-- glow sutil pra tiers altos -->
      ${tier === 'GOLD' || tier === 'PLATINUM' || tier === 'DIAMOND' ?
        `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="8" fill="${colors.main}" fill-opacity="0.08"/>` : ''}

      <!-- ícone do trofeu -->
      <g transform="translate(${w / 2 - 12}, 12) scale(1)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="${trophy.icon}"
            fill="${isLocked ? colors.main : colors.main}"
            fill-opacity="${isLocked ? 0.3 : 0.9}"
            stroke="${colors.accent}"
            stroke-width="0.5"
            stroke-opacity="${isLocked ? 0.3 : 1}"/>
        </svg>
      </g>

      <!-- valor (número) -->
      ${showValue ? `<text x="${w / 2}" y="56" text-anchor="middle"
        font-family="Segoe UI, Ubuntu, sans-serif" font-size="14" font-weight="700"
        fill="${colors.main}">${value.toLocaleString()}</text>` :
        `<text x="${w / 2}" y="56" text-anchor="middle"
        font-family="Segoe UI, Ubuntu, sans-serif" font-size="14"
        fill="${theme.text}" opacity="0.3">—</text>`}

      <!-- label -->
      <text x="${w / 2}" y="74" text-anchor="middle"
        font-family="Segoe UI, Ubuntu, sans-serif" font-size="11" font-weight="600"
        fill="${isLocked ? theme.text : colors.main}"
        ${isLocked ? 'opacity="0.5"' : ''}>${escapeXml(trophy.label)}</text>

      <!-- tier badge (sutil) -->
      ${!isLocked ? `<text x="${w / 2}" y="${h - 8}" text-anchor="middle"
        font-family="Segoe UI, Ubuntu, sans-serif" font-size="9" font-weight="500"
        fill="${colors.main}" opacity="0.7">${tier}</text>` : ''}
    </g>
  `;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = url.searchParams.get('username');
  const themeName = url.searchParams.get('theme') || 'vision-friendly-dark';
  const columns = Math.max(3, Math.min(8, parseInt(url.searchParams.get('column') || '4', 10)));
  const hideTitle = url.searchParams.get('hide_title') === 'true';
  const margin = 12;
  const cellW = 100;
  const cellH = 105;

  if (!username) {
    res.statusCode = 400;
    return res.end('Missing ?username');
  }

  const theme = resolveTheme(themeName);

  try {
    // Pegamos stats + streak em paralelo
    const [statsData, streakData] = await Promise.all([
      fetchUserStats(username),
      fetchStreakStats(username).catch(() => ({ longestStreak: 0 })),
    ]);

    const languages = aggregateLanguages(statsData.repos, { top: 50 });

    const fullStats = {
      ...statsData,
      languagesCount: languages.length,
      longestStreak: streakData.longestStreak,
    };

    const evaluated = TROPHIES.map((t) => {
      const value = t.getValue(fullStats);
      const tier = calculateTier(value, t.thresholds);
      return { trophy: t, value, tier };
    });

    const rows = Math.ceil(evaluated.length / columns);
    const W = margin * 2 + cellW * columns + (columns - 1) * 10;
    const H = (hideTitle ? 20 : 50) + rows * cellH + (rows - 1) * 10 + margin;

    const cells = evaluated.map((e, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = margin + col * (cellW + 10);
      const y = (hideTitle ? 20 : 50) + row * (cellH + 10);
      return trophyCell({ ...e, x, y, w: cellW, h: cellH, theme, delay: i * 60 });
    }).join('');

    const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
  fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t">
  <title id="t">${escapeXml(username)} trophies</title>
  <style>
    .cell { opacity: 0; animation: pop 0.4s ease-out forwards; }
    @keyframes pop {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
  </style>
  <rect x="0.5" y="0.5" rx="6" width="${W - 1}" height="${H - 1}"
    fill="${theme.bg}" stroke="${theme.border}"/>
  ${fireStrip(W)}
  ${hideTitle ? '' : `<text x="${margin + 12}" y="32"
    font-family="Segoe UI, Ubuntu, sans-serif" font-size="18" font-weight="600"
    fill="${theme.title}">🏆 GitHub Trophies</text>`}
  ${cells}
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=14400, stale-while-revalidate=86400');
    return res.end(svg);
  } catch (err) {
    console.error('[trophies] error:', err);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(`<svg width="500" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" rx="6" width="499" height="79" fill="${theme.bg}" stroke="${theme.border}"/>
      <text x="20" y="45" fill="#ff5252" font-family="Segoe UI" font-size="14">⚠ ${escapeXml(err.message)}</text>
    </svg>`);
  }
}
