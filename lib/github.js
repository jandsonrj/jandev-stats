// Busca dados do GitHub via GraphQL API.
// Uma única request retorna tudo o que precisamos.

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

const STATS_QUERY = `
  query userInfo($login: String!) {
    user(login: $login) {
      name
      login
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
      }
      repositoriesContributedTo(
        first: 1
        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
      ) {
        totalCount
      }
      pullRequests(first: 1) { totalCount }
      mergedPullRequests: pullRequests(states: MERGED) { totalCount }
      openIssues: issues(states: OPEN) { totalCount }
      closedIssues: issues(states: CLOSED) { totalCount }
      followers { totalCount }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        orderBy: { direction: DESC, field: STARGAZERS }
      ) {
        totalCount
        nodes {
          name
          stargazers { totalCount }
          isFork
          languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node { name color }
            }
          }
        }
      }
    }
  }
`;

const ALL_COMMITS_QUERY = `
  query userTotalCommits($login: String!) {
    search(query: $login, type: USER) {
      userCount
    }
  }
`;

/**
 * Busca todas as estatísticas do usuário de uma vez.
 * Retorna um objeto normalizado pronto pra renderizar.
 */
export async function fetchUserStats(username, { includeAllCommits = true, countPrivate = true } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN env var ausente');

  const res = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'jandev-stats',
    },
    body: JSON.stringify({ query: STATS_QUERY, variables: { login: username } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GitHub GraphQL: ${json.errors.map(e => e.message).join('; ')}`);
  }
  const user = json.data?.user;
  if (!user) throw new Error(`Usuário ${username} não encontrado`);

  // Stars totais somando todos os repos
  const totalStars = user.repositories.nodes.reduce(
    (acc, r) => acc + (r.stargazers?.totalCount || 0),
    0
  );

  // Commits: do contributionsCollection (último ano + privados se countPrivate)
  let totalCommits = user.contributionsCollection.totalCommitContributions;
  if (countPrivate) {
    totalCommits += user.contributionsCollection.restrictedContributionsCount;
  }

  // Para "all commits ever", a API GraphQL não expõe diretamente.
  // O github-readme-stats usa um proxy externo (api.github.com/search/commits) que é flaky.
  // Aqui usamos o contributionsCollection.totalCommitContributions como base honesta.
  // Se você quiser todos os commits da vida, dá pra implementar via REST search/commits depois.

  return {
    name: user.name || user.login,
    login: user.login,
    totalStars,
    totalCommits,
    totalPRs: user.pullRequests.totalCount,
    mergedPRs: user.mergedPullRequests.totalCount,
    totalIssues: user.openIssues.totalCount + user.closedIssues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    followers: user.followers.totalCount,
    repos: user.repositories.nodes,
  };
}

// ===== Streak =====
// Busca o calendário de contribuições do GitHub e calcula:
//  - streak atual (dias consecutivos terminando em hoje ou ontem)
//  - streak mais longo (melhor sequência da história disponível)
//  - total de contribuições no período
// O GraphQL contributionsCollection só retorna o último ano por padrão.
// Para histórico completo, pedimos vários anos em paralelo via "from"/"to".

export async function fetchContributionCalendar(username, year) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN env var ausente');

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        createdAt
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
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
    body: JSON.stringify({ query, variables: { login: username, from, to } }),
  });

  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${json.errors.map(e => e.message).join('; ')}`);
  return json.data.user;
}

export async function fetchStreakStats(username) {
  // Busca da criação da conta até hoje. Limita a 5 anos pra não estourar
  // request budget — se você tem mais de 5 anos, ainda assim cobre a maioria.
  const thisYear = new Date().getUTCFullYear();
  // Primeiro pega createdAt do user
  const first = await fetchContributionCalendar(username, thisYear);
  const createdYear = new Date(first.createdAt).getUTCFullYear();
  const startYear = Math.max(createdYear, thisYear - 4);

  const years = [];
  for (let y = startYear; y <= thisYear; y++) years.push(y);

  const results = await Promise.all(
    years.map(y => (y === thisYear ? Promise.resolve(first) : fetchContributionCalendar(username, y)))
  );

  // Achatamos todos os dias em ordem cronológica
  const allDays = [];
  for (const userData of results) {
    for (const week of userData.contributionsCollection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) {
        allDays.push(day);
      }
    }
  }
  allDays.sort((a, b) => a.date.localeCompare(b.date));

  // Total contribs no período
  const totalContributions = allDays.reduce((acc, d) => acc + d.contributionCount, 0);

  // Streak mais longa
  let longest = 0, longestStart = null, longestEnd = null;
  let cur = 0, curStart = null;
  for (const day of allDays) {
    if (day.contributionCount > 0) {
      if (cur === 0) curStart = day.date;
      cur++;
      if (cur > longest) {
        longest = cur;
        longestStart = curStart;
        longestEnd = day.date;
      }
    } else {
      cur = 0;
      curStart = null;
    }
  }

  // Streak atual: contar de hoje (ou ontem se hoje for 0) pra trás
  const today = new Date().toISOString().slice(0, 10);
  let currentStreak = 0;
  let currentStart = null;
  // iteramos de trás pra frente
  let i = allDays.length - 1;
  // pula dias futuros que possam aparecer (GraphQL às vezes devolve a semana inteira)
  while (i >= 0 && allDays[i].date > today) i--;
  // se hoje tem 0 contribs, ainda permitimos contar a partir de ontem
  if (i >= 0 && allDays[i].contributionCount === 0 && allDays[i].date === today) {
    i--; // ignora o "hoje vazio"
  }
  while (i >= 0 && allDays[i].contributionCount > 0) {
    currentStreak++;
    currentStart = allDays[i].date;
    i--;
  }
  const currentEnd = currentStreak > 0 ? today : null;

  return {
    totalContributions,
    firstDate: allDays[0]?.date,
    lastDate: allDays[allDays.length - 1]?.date,
    longestStreak: longest,
    longestStart,
    longestEnd,
    currentStreak,
    currentStart,
    currentEnd,
  };
}

// ===== Pinned repos =====
export async function fetchPinnedRepos(username) {
  const token = process.env.GITHUB_TOKEN;
  const query = `
    query($login: String!) {
      user(login: $login) {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              nameWithOwner
              description
              stargazers { totalCount }
              forkCount
              primaryLanguage { name color }
              url
            }
          }
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
  return json.data.user.pinnedItems.nodes;
}

// Busca um único repo (pra endpoint de repo-card individual)
export async function fetchRepo(owner, name) {
  const token = process.env.GITHUB_TOKEN;
  const query = `
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        name
        nameWithOwner
        description
        stargazers { totalCount }
        forkCount
        primaryLanguage { name color }
        url
        isArchived
        isTemplate
        isFork
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
    body: JSON.stringify({ query, variables: { owner, name } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
  return json.data.repository;
}

/**
 * Agrega bytes por linguagem em todos os repos do usuário (exclui forks).
 */
export function aggregateLanguages(repos, { excludeForks = true, exclude = [], top = 7 } = {}) {
  const excludeSet = new Set(exclude.map(s => s.toLowerCase()));
  const totals = new Map();

  for (const repo of repos) {
    if (excludeForks && repo.isFork) continue;
    for (const edge of repo.languages?.edges || []) {
      const name = edge.node.name;
      if (excludeSet.has(name.toLowerCase())) continue;
      const prev = totals.get(name) || { size: 0, color: edge.node.color };
      prev.size += edge.size;
      totals.set(name, prev);
    }
  }

  const grandTotal = [...totals.values()].reduce((a, b) => a + b.size, 0);
  const arr = [...totals.entries()]
    .map(([name, v]) => ({
      name,
      color: v.color || '#888',
      size: v.size,
      percent: grandTotal ? (v.size / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, top);

  return arr;
}
