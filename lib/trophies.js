// Sistema de trofeus. Cada trophy tem:
//  - id, label, icon (path SVG)
//  - tiers: thresholds que determinam Bronze → Silver → Gold → Platinum → Diamond
//  - getValue(stats): extrai o valor da stat correspondente
//
// O ranking é: se value >= tier[i], desbloqueia aquele tier.

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];

const TIER_COLORS = {
  BRONZE:   { main: '#cd7f32', accent: '#e8a05c', glow: '#cd7f3266' },
  SILVER:   { main: '#a8a8a8', accent: '#d1d1d1', glow: '#a8a8a866' },
  GOLD:     { main: '#ffd700', accent: '#fff170', glow: '#ffd70066' },
  PLATINUM: { main: '#5fc9c0', accent: '#9bf0e8', glow: '#5fc9c066' },
  DIAMOND:  { main: '#b9f2ff', accent: '#7ee0f9', glow: '#b9f2ff66' },
  LOCKED:   { main: '#3a3a3a', accent: '#555', glow: 'none' },
};

// Ícones simples — formas geométricas com identidade visual clara
const TROPHY_ICONS = {
  star:     'M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L2 9h7z',          // star
  rocket:   'M12 2L8 8l-4 1 3 4-1 5 6-3 6 3-1-5 3-4-4-1z',                    // rocket-ish diamond
  fire:     'M12 2c-1 3-3 5-3 8a3 3 0 0 0 6 0c0-1 1-2 1-3 2 2 3 5 3 8a7 7 0 1 1-14 0c0-5 4-9 7-13z',
  bolt:     'M13 2L4 14h7l-1 8 9-12h-7z',                                      // lightning
  crown:    'M3 18h18l-2-10-4 4-3-7-3 7-4-4z',                                // crown
  shield:   'M12 2L4 5v7c0 5 3 9 8 10 5-1 8-5 8-10V5z',                       // shield
  globe:    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2c2 0 4 4 4 8s-2 8-4 8-4-4-4-8 2-8 4-8zM2.5 9h19M2.5 15h19',
  heart:    'M12 21s-7-4.5-9-9c-1-3 1-7 4-7 2 0 4 1 5 3 1-2 3-3 5-3 3 0 5 4 4 7-2 4.5-9 9-9 9z',
  trophy:   'M7 4h10v3a5 5 0 0 1-10 0V4zm-3 0h3v3a5 5 0 0 1-3-3zm13 0h3a5 5 0 0 1-3 3V4zM9 14h6l-1 5h-4z',
  pull:     'M6 3a3 3 0 1 1-2 5v8a3 3 0 1 1 2 0V8c1-1 1-1 0-5zm12 11a3 3 0 1 1-2 5 3 3 0 0 1 2-5zm0-11l-3 3h2v6a4 4 0 0 1-4 4h-2v-2l-3 3 3 3v-2h2a6 6 0 0 0 6-6V6h2z',
};

export const TROPHIES = [
  {
    id: 'commits',
    label: 'Committer',
    description: 'Total commits',
    icon: TROPHY_ICONS.bolt,
    thresholds: [100, 500, 1000, 2500, 5000],
    getValue: (s) => s.totalCommits,
  },
  {
    id: 'prs',
    label: 'PR Maker',
    description: 'Pull requests opened',
    icon: TROPHY_ICONS.pull,
    thresholds: [10, 50, 100, 250, 500],
    getValue: (s) => s.totalPRs,
  },
  {
    id: 'issues',
    label: 'Investigator',
    description: 'Issues touched',
    icon: TROPHY_ICONS.shield,
    thresholds: [5, 25, 50, 150, 500],
    getValue: (s) => s.totalIssues,
  },
  {
    id: 'stars',
    label: 'Stargazer',
    description: 'Stars earned',
    icon: TROPHY_ICONS.star,
    thresholds: [10, 50, 100, 500, 1000],
    getValue: (s) => s.totalStars,
  },
  {
    id: 'followers',
    label: 'Connected',
    description: 'Followers',
    icon: TROPHY_ICONS.heart,
    thresholds: [10, 50, 100, 500, 1000],
    getValue: (s) => s.followers,
  },
  {
    id: 'repos',
    label: 'Polyglot',
    description: 'Languages used',
    icon: TROPHY_ICONS.globe,
    thresholds: [3, 5, 8, 12, 18],
    getValue: (s) => s.languagesCount || 0,
  },
  {
    id: 'streak',
    label: 'On Fire',
    description: 'Longest streak',
    icon: TROPHY_ICONS.fire,
    thresholds: [7, 30, 90, 180, 365],
    getValue: (s) => s.longestStreak || 0,
  },
  {
    id: 'contribs',
    label: 'Active Dev',
    description: 'Contribs in last year',
    icon: TROPHY_ICONS.rocket,
    thresholds: [100, 500, 1000, 2000, 4000],
    getValue: (s) => s.totalCommits, // proxy razoável; pode trocar por totalContributions se passar
  },
];

export function calculateTier(value, thresholds) {
  let tierIndex = -1;
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) tierIndex = i;
  }
  return tierIndex >= 0 ? TIERS[tierIndex] : 'LOCKED';
}

export function tierColor(tier) {
  return TIER_COLORS[tier];
}

export { TIERS, TIER_COLORS };
