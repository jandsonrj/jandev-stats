// Profile card — cartão de visita visual com identidade própria.
// Mostra: nome grande, bio, contribs do ano, contagem de orgs, top languages como pills.

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

async function fetchProfile(username) {
  const token = process.env.GITHUB_TOKEN;
  const query = `
    query($login: String!) {
      user(login: $login) {
        name
        login
        bio
        location
        company
        avatarUrl
        followers { totalCount }
        following { totalCount }
        organizations {
          totalCount
        }
        contributionsCollection {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          restrictedContributionsCount
          contributionCalendar { totalContributions }
        }
      }
    }
  `;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'jandev-stats',
    },
    body: JSON.stringify({ query, variables: { login: username } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
  return json.data.user;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = url.searchParams.get('username');
  const themeName = url.searchParams.get('theme') || 'vision-friendly-dark';

  if (!username) {
    res.statusCode = 400;
    return res.end('Missing ?username');
  }

  const theme = resolveTheme(themeName);
  const W = 600;
  const H = 260;

  try {
    const [profile, stats] = await Promise.all([
      fetchProfile(username),
      fetchUserStats(username),
    ]);

    const langs = aggregateLanguages(stats.repos, { top: 5 });
    const contribs = profile.contributionsCollection.contributionCalendar.totalContributions;

    // Bio quebrada em 2 linhas (max 60 chars cada)
    const bio = profile.bio || '';
    const bioLines = [];
    if (bio) {
      const words = bio.split(/\s+/);
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length <= 60) cur = (cur + ' ' + w).trim();
        else { bioLines.push(cur); cur = w; }
        if (bioLines.length === 2) break;
      }
      if (cur && bioLines.length < 2) bioLines.push(cur);
    }

    // Pills de linguagens
    let pillX = 30;
    const pills = langs.map((l) => {
      const w = 12 + l.name.length * 7;
      const pill = `
        <g transform="translate(${pillX}, 200)">
          <rect x="0" y="0" width="${w}" height="22" rx="11" fill="${l.color}" fill-opacity="0.15" stroke="${l.color}" stroke-width="0.5"/>
          <circle cx="10" cy="11" r="3" fill="${l.color}"/>
          <text x="${w / 2 + 4}" y="15" text-anchor="middle" font-family="Segoe UI" font-size="11" font-weight="500" fill="${l.color}">${escapeXml(l.name)}</text>
        </g>
      `;
      pillX += w + 8;
      return pill;
    }).join('');

    // Stats grid (3 colunas) na direita
    const statBox = (label, value, x, delay) => `
      <g class="stat" style="animation-delay: ${delay}ms" transform="translate(${x}, 30)">
        <text x="0" y="20" font-family="Segoe UI" font-size="22" font-weight="800" fill="${theme.title}">${value.toLocaleString()}</text>
        <text x="0" y="40" font-family="Segoe UI" font-size="11" fill="${theme.text}" opacity="0.7">${label}</text>
      </g>
    `;

    const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
  fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t">
  <title id="t">${escapeXml(profile.name || username)} — Profile</title>
  <style>
    .name   { font: 800 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.title}; }
    .handle { font: 400 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; opacity: 0.6; }
    .bio    { font: 400 13px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; opacity: 0.85; }
    .meta   { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${theme.text}; opacity: 0.65; }
    .stat   { opacity: 0; animation: rise 0.5s ease-out forwards; }
    @keyframes rise { from { opacity: 0; } to { opacity: 1; } }
  </style>

  <!-- Faixa lateral decorativa -->
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.title}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${theme.title}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect x="0.5" y="0.5" rx="8" width="${W - 1}" height="${H - 1}"
    fill="${theme.bg}" stroke="${theme.border}"/>

  <!-- Accent bar -->
  <rect x="0.5" y="0.5" width="4" height="${H - 1}" rx="2" fill="${theme.title}"/>

  <!-- Gradient sutil canto superior direito -->
  <rect x="${W - 200}" y="0" width="200" height="${H}" fill="url(#accent)" opacity="0.4"/>

  <!-- Nome + handle -->
  <text x="30" y="50" class="name">${escapeXml(profile.name || username)}</text>
  <text x="30" y="70" class="handle">@${escapeXml(profile.login)}</text>

  <!-- Bio -->
  ${bioLines.map((line, i) => `<text x="30" y="${100 + i * 18}" class="bio">${escapeXml(line)}</text>`).join('')}

  <!-- Location + company -->
  <g transform="translate(30, ${bioLines.length > 0 ? 100 + bioLines.length * 18 + 18 : 100})">
    ${profile.location ? `
      <svg x="0" y="-10" width="12" height="12" viewBox="0 0 16 16" fill="${theme.icon}">
        <path d="M8 0a5 5 0 0 0-5 5c0 4 5 11 5 11s5-7 5-11a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
      </svg>
      <text x="16" y="0" class="meta">${escapeXml(profile.location)}</text>
    ` : ''}
    ${profile.company ? `
      <g transform="translate(${profile.location ? profile.location.length * 7 + 30 : 0}, 0)">
        <svg x="0" y="-10" width="12" height="12" viewBox="0 0 16 16" fill="${theme.icon}">
          <path d="M1.5 14.5h13M2 14V3.5L8 1l6 2.5V14M4 6h2m-2 3h2m-2 3h2m4-6h2m-2 3h2m-2 3h2"/>
        </svg>
        <text x="16" y="0" class="meta">${escapeXml(profile.company)}</text>
      </g>
    ` : ''}
  </g>

  <!-- Stats à direita -->
  ${statBox('Contributions', contribs, W - 280, 100)}
  ${statBox('Followers', profile.followers.totalCount, W - 180, 200)}
  ${statBox('Orgs', profile.organizations.totalCount, W - 80, 300)}

  <!-- Pills de linguagens -->
  <text x="30" y="190" font-family="Segoe UI" font-size="10" font-weight="600" fill="${theme.text}" opacity="0.5" letter-spacing="1">STACK</text>
  ${pills}
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=14400, stale-while-revalidate=86400');
    return res.end(svg);
  } catch (err) {
    console.error('[profile] error:', err);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(`<svg width="${W}" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" rx="6" width="${W - 1}" height="79" fill="${theme.bg}" stroke="${theme.border}"/>
      <text x="20" y="45" fill="#ff5252" font-family="Segoe UI" font-size="14">⚠ ${escapeXml(err.message)}</text>
    </svg>`);
  }
}
