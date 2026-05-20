import { fetchRepo } from '../lib/github.js';
import { resolveTheme } from '../lib/themes.js';

function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Quebra uma string em linhas com no máximo `maxChars` por linha
function wrap(text, maxChars) {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length <= maxChars) {
      cur = (cur + ' ' + word).trim();
    } else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fullName = url.searchParams.get('repo'); // formato: owner/name
  const themeName = url.searchParams.get('theme') || 'vision-friendly-dark';

  if (!fullName || !fullName.includes('/')) {
    res.statusCode = 400;
    return res.end('Missing or invalid ?repo (use owner/name)');
  }

  const [owner, name] = fullName.split('/');
  const theme = resolveTheme(themeName);
  const W = 400;
  const H = 120;

  try {
    const repo = await fetchRepo(owner, name);
    if (!repo) throw new Error('Repo not found');

    const descLines = wrap(repo.description || '', 50);
    const lang = repo.primaryLanguage;
    const stars = repo.stargazers.totalCount;
    const forks = repo.forkCount;

    const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
  fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t">
  <title id="t">${escapeXml(repo.nameWithOwner)}</title>
  <style>
    .name   { font: 600 16px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .owner  { font: 400 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; opacity: 0.7; }
    .desc   { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; opacity: 0.85; }
    .meta   { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; }
    .badge  { font: 600 10px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.bg}; }
  </style>

  <rect x="0.5" y="0.5" rx="6" width="${W - 1}" height="${H - 1}"
    fill="${theme.bg}" stroke="${theme.border}"/>

  <!-- ícone de repo -->
  <svg x="18" y="18" width="16" height="16" viewBox="0 0 16 16" fill="${theme.icon}">
    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/>
  </svg>

  <text x="42" y="32" class="name">${escapeXml(repo.name)}</text>
  ${repo.isArchived ? `<rect x="${42 + repo.name.length * 9 + 8}" y="20" width="60" height="16" rx="8" fill="${theme.icon}"/>
  <text x="${42 + repo.name.length * 9 + 38}" y="32" text-anchor="middle" class="badge">ARCHIVED</text>` : ''}

  <text x="42" y="48" class="owner">${escapeXml(repo.nameWithOwner)}</text>

  ${descLines.map((line, i) =>
    `<text x="18" y="${68 + i * 16}" class="desc">${escapeXml(line)}</text>`
  ).join('')}

  <!-- footer: lang + stars + forks -->
  <g transform="translate(18, ${H - 18})">
    ${lang ? `<circle cx="6" cy="0" r="6" fill="${lang.color || '#888'}"/>
    <text x="18" y="4" class="meta">${escapeXml(lang.name)}</text>` : ''}

    <g transform="translate(${lang ? 18 + lang.name.length * 7 + 16 : 0}, 0)">
      <svg x="0" y="-7" width="14" height="14" viewBox="0 0 16 16" fill="${theme.icon}">
        <path d="M14 6l-4.9-.64L7 1 4.9 5.36 0 6l3.6 3.26L2.67 14 7 11.67 11.33 14l-.93-4.74L14 6Z"/>
      </svg>
      <text x="18" y="4" class="meta">${stars}</text>
    </g>

    <g transform="translate(${(lang ? 18 + lang.name.length * 7 + 16 : 0) + 50}, 0)">
      <svg x="0" y="-7" width="14" height="14" viewBox="0 0 16 16" fill="${theme.icon}">
        <path d="M5 5.372V.5a.5.5 0 1 1 1 0v4.872A2.5 2.5 0 1 1 4 5.372zm6 6.256V11.5a2.5 2.5 0 1 1 1 0v.128a2.5 2.5 0 0 1-2.5 2.5h-3a2.5 2.5 0 0 1-2.5-2.5v-.128A2.5 2.5 0 1 1 4 11.5v.128a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5z"/>
      </svg>
      <text x="18" y="4" class="meta">${forks}</text>
    </g>
  </g>
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=14400, stale-while-revalidate=86400');
    return res.end(svg);
  } catch (err) {
    console.error('[repo] error:', err);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(`<svg width="${W}" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" rx="6" width="${W - 1}" height="79" fill="${theme.bg}" stroke="${theme.border}"/>
      <text x="20" y="45" fill="#ff5252" font-family="Segoe UI" font-size="14">⚠ ${escapeXml(err.message)}</text>
    </svg>`);
  }
}
