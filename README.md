# jandev-stats

GitHub stats cards SVG self-hosted na Vercel — substitui o `github-readme-stats` quando ele cai (o que acontece com frequência por sobrecarga e rate limit do Camo).

**6 endpoints disponíveis:**
- `/api/stats` — card principal (stars, commits, PRs, issues, rank)
- `/api/top-langs` — linguagens mais usadas
- `/api/streak` — streak atual + mais longa + total
- `/api/trophies` — conquistas com tier (bronze → diamond)
- `/api/profile` — cartão de visita do dev
- `/api/repo?repo=owner/name` — card de repositório individual

## Por que self-host?

- **Zero `camo.githubusercontent.com` falhando**: você controla o endpoint.
- **Rate limit próprio**: 5.000 req/h por token. Com cache de 4h no edge da Vercel, atende muita gente.
- **Visual customizável**: tema `jandev` exclusivo seu.
- **Zero dependências npm**: só `fetch` nativo do Node 20.

## Deploy

### 1. Crie um Personal Access Token (PAT) no GitHub

Vá em https://github.com/settings/tokens e crie um token (clássico ou fine-grained):

**Token clássico**: marque `read:user` (e `repo` se quiser stats de privados).

**Fine-grained**:
- Repository access: All repositories
- Permissions: `Contents` (Read), `Metadata` (Read), `Followers` (Read)

### 2. Suba pra Vercel

```bash
npm i -g vercel
vercel
vercel env add GITHUB_TOKEN production
# cola o token
vercel --prod
```

Ou pelo dashboard: Settings → Environment Variables → `GITHUB_TOKEN`.

### 3. Use no README do GitHub

Trocando `SEU-DOMINIO` pelo seu deploy:

```markdown
## 📈 GitHub Stats
<p align="left">
  <img height="195em" src="https://SEU-DOMINIO.vercel.app/api/stats?username=jandsonrj&theme=vision-friendly-dark"/>
  <img height="195em" src="https://SEU-DOMINIO.vercel.app/api/top-langs?username=jandsonrj&theme=vision-friendly-dark"/>
</p>

## 🔥 Streak
<p align="left">
  <img src="https://SEU-DOMINIO.vercel.app/api/streak?username=jandsonrj&theme=vision-friendly-dark"/>
</p>

## 🏆 Trophies
<p align="left">
  <img src="https://SEU-DOMINIO.vercel.app/api/trophies?username=jandsonrj&theme=vision-friendly-dark"/>
</p>

## 👋 About me
<p align="left">
  <img src="https://SEU-DOMINIO.vercel.app/api/profile?username=jandsonrj&theme=vision-friendly-dark"/>
</p>
```

## Endpoints

### `/api/stats`
Card principal: stars, commits, PRs, issues, contribs + rank circular.

**Params:** `username` (obrigatório), `theme`, `hide_rank`, `hide_title`, `custom_title`

### `/api/top-langs`
Linguagens mais usadas em barra com legenda em 2 colunas.

**Params:** `username` (obrigatório), `theme`, `langs_count` (default 7), `exclude_repo`, `hide`, `card_width` (default 350), `hide_title`, `custom_title`

### `/api/streak` 🔥
Três colunas: total contributions, current streak, longest streak.

A "current streak" conta dias consecutivos até hoje (tolera "hoje sem commit" se você ainda não commitou — não quebra o streak antes da meia-noite).

**Params:** `username` (obrigatório), `theme`

⚠️ Esse endpoint faz até 5 requests ao GraphQL (1 por ano de histórico) — por isso o cache de 4h é crítico.

### `/api/trophies` 🏆
Grade de conquistas com tier visual (Bronze → Silver → Gold → Platinum → Diamond).

**Trofeus disponíveis:**
- **Committer** (100 / 500 / 1k / 2.5k / 5k commits)
- **PR Maker** (10 / 50 / 100 / 250 / 500 PRs)
- **Investigator** (5 / 25 / 50 / 150 / 500 issues)
- **Stargazer** (10 / 50 / 100 / 500 / 1k stars)
- **Connected** (10 / 50 / 100 / 500 / 1k followers)
- **Polyglot** (3 / 5 / 8 / 12 / 18 linguagens)
- **On Fire** (7 / 30 / 90 / 180 / 365 dias de streak)
- **Active Dev** (100 / 500 / 1k / 2k / 4k contribs/ano)

**Params:** `username` (obrigatório), `theme`, `column` (default 4, max 8), `hide_title`

### `/api/profile` 👋
Cartão de visita visual: nome grande, bio, location, company, contribs/year, orgs, stack como pills coloridos.

**Params:** `username` (obrigatório), `theme`

### `/api/repo?repo=owner/name` 📦
Card de repositório individual — para usar em READMEs de projetos específicos, não só perfil.

```markdown
<img src="https://SEU-DOMINIO.vercel.app/api/repo?repo=jandsonrj/fluxson&theme=vision-friendly-dark"/>
```

**Params:** `repo` (obrigatório, formato `owner/name`), `theme`

## Temas

`vision-friendly-dark` (default), `jandev`, `dark`, `radical`, `tokyonight`, `dracula`, `default`.

### Tema custom
Edite `lib/themes.js`:

```js
'meu-tema': {
  bg: '#000',
  title: '#ff9500',
  text: '#fff',
  icon: '#ff9500',
  border: '#ff9500',
},
```

## Cache

- Browser: 30min (`max-age=1800`)
- CDN (Vercel edge): 4h (`s-maxage=14400`)
- Stale-while-revalidate: 24h

GitHub bate no edge da Vercel, que retorna instantâneo. A API do GitHub só é chamada 1× a cada 4h por região.

## Estrutura

```
api/
├── stats.js       # /api/stats
├── top-langs.js   # /api/top-langs
├── streak.js      # /api/streak
├── trophies.js    # /api/trophies
├── profile.js     # /api/profile
└── repo.js        # /api/repo

lib/
├── github.js      # GraphQL fetch
├── themes.js      # Sistema de temas
├── rank.js        # Cálculo de rank (B+, A, S, etc)
├── icons.js       # Ícones SVG inline
└── trophies.js    # Definição dos trofeus + tiers
```

## Diferenças vs. github-readme-stats

- **Commits**: `contributionsCollection.totalCommitContributions` (último ano + privados). O GRS usa proxy externo flaky pra "all commits ever" — preferimos a fonte oficial estável.
- **Rank**: fórmula idêntica, testada — bate com o GRS.
- **Streak**: implementação própria via GraphQL (não depende do `github-readme-streak-stats`).
- **Trophies**: implementação própria, sem dependência do `github-profile-trophy`.
