import { fetchUserStats, aggregateLanguages } from '../lib/github.js';
import { resolveTheme } from '../lib/themes.js';

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Altura fixa pra alinhar com o card /api/stats (195px).
// O conteúdo é distribuído verticalmente pra preencher o card sem sobrar espaço estranho.
const FIXED_HEIGHT = 195;

function compactLayout(langs, theme, width) {
  // Barra única com segmentos coloridos + grid de legendas (2 colunas).
  const barX = 25;
  const barY = 55;
  const barW = width - 50;
  const barH = 8;

  let cursor = 0;
  const segments = langs
    .map((l) => {
      const segW = (l.percent / 100) * barW;
      const seg = `<rect x="${barX + cursor}" y="${barY}" width="${segW}" height="${barH}" fill="${l.color}"/>`;
      cursor += segW;
      return seg;
    })
    .join('');

  // Layout: barra em y=55, legendas começam em y=85, vão até y=180 (15px de respiro embaixo).
  // Espaço disponível pras legendas: 180 - 85 = 95px.
  // Com no máximo 4 linhas (8 langs em 2 colunas), spacing = 95/4 = 23.75 → usamos 22px.
  const legendStartY = 85;
  const rowSpacing = 22;
  const colWidth = (width - 50) / 2;

  const legends = langs
    .map((l, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = barX + col * colWidth;
      const y = legendStartY + row * rowSpacing;
      return `
        <g transform="translate(${x}, ${y})" class="stagger" style="animation-delay: ${i * 80}ms">
          <circle cx="6" cy="6" r="5" fill="${l.color}"/>
          <text x="18" y="10" class="lang-name">${escapeXml(l.name)} ${l.percent.toFixed(2)}%</text>
        </g>
      `;
    })
    .join('');

  return { content: `${segments}${legends}`, height: FIXED_HEIGHT };
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = url.searchParams.get('username');
  const themeName = url.searchParams.get('theme') || 'vision-friendly-dark';
  const langsCount = Math.min(parseInt(url.searchParams.get('langs_count') || '7', 10), 20);
  const excludeRepos = (url.searchParams.get('exclude_repo') || '').split(',').filter(Boolean);
  const hideTitle = url.searchParams.get('hide_title') === 'true';
  const customTitle = url.searchParams.get('custom_title');
  const excludeLangs = (url.searchParams.get('hide') || '').split(',').filter(Boolean);

  const width = parseInt(url.searchParams.get('card_width') || '350', 10);

  if (!username) {
    res.statusCode = 400;
    return res.end('Missing ?username');
  }

  const theme = resolveTheme(themeName);

  try {
    const stats = await fetchUserStats(username);
    const repos = stats.repos.filter((r) => !excludeRepos.includes(r.name));
    const langs = aggregateLanguages(repos, { exclude: excludeLangs, top: langsCount });

    const title = customTitle || 'Most Used Languages';
    const { content, height } = compactLayout(langs, theme, width);

    const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
  fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="titleId">
  <title id="titleId">${escapeXml(title)}</title>
  <style>
    .title { font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .lang-name { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; }
    .stagger { opacity: 0; animation: fade-in 0.3s ease-in-out forwards; }
    @keyframes fade-in { to { opacity: 1; } }
  </style>
  <rect x="0.5" y="0.5" rx="6" width="${width - 1}" height="${height - 1}"
    fill="${theme.bg}" stroke="${theme.border}" stroke-opacity="1"/>
  ${hideTitle ? '' : `<text x="25" y="35" class="title">${escapeXml(title)}</text>`}
  ${content}
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=14400, stale-while-revalidate=86400');
    return res.end(svg);
  } catch (err) {
    console.error('[top-langs] error:', err);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(`<svg width="${width}" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" rx="6" width="${width - 1}" height="79" fill="${theme.bg}" stroke="${theme.border}"/>
      <text x="20" y="45" fill="#ff5252" font-family="Segoe UI" font-size="14">⚠ ${escapeXml(err.message)}</text>
    </svg>`);
  }
}
