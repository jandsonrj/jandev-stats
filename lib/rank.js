// Rank do dev — replica a fórmula do github-readme-stats com leves ajustes.
// Quanto MENOR o score (mais próximo de 0), MELHOR o rank.

const COMMITS_OFFSET = 1.65;
const ISSUES_OFFSET = 1;
const PRS_OFFSET = 0.5;
const STARS_OFFSET = 0.75;
const FOLLOWERS_OFFSET = 0.45;

const COMMITS_MEDIAN = 250;
const COMMITS_WEIGHT = 2;
const ISSUES_MEDIAN = 25;
const ISSUES_WEIGHT = 1;
const PRS_MEDIAN = 50;
const PRS_WEIGHT = 3;
const STARS_MEDIAN = 50;
const STARS_WEIGHT = 4;
const FOLLOWERS_MEDIAN = 10;
const FOLLOWERS_WEIGHT = 1;

const TOTAL_WEIGHT =
  COMMITS_WEIGHT + ISSUES_WEIGHT + PRS_WEIGHT + STARS_WEIGHT + FOLLOWERS_WEIGHT;

// Aproximação da CDF da distribuição exponencial: 1 - e^(-ln2 * x / median)
const exponentialCdf = (x) => 1 - 2 ** -x;
const logNormalCdf = (x) => x / (1 + x);

export function calculateRank({ commits, prs, issues, stars, followers, contribs = 0 }) {
  const rank =
    1 -
    (COMMITS_WEIGHT * exponentialCdf(commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponentialCdf(prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponentialCdf(issues / ISSUES_MEDIAN) +
      STARS_WEIGHT * logNormalCdf(stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * logNormalCdf(followers / FOLLOWERS_MEDIAN)) /
      TOTAL_WEIGHT;

  // levels — quanto menor o rank, melhor
  const LEVELS = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];
  const THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const percentile = rank * 100;
  const level = LEVELS.find((_, i) => percentile <= THRESHOLDS[i]) || 'C';

  return { level, percentile };
}
