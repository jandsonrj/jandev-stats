// Temas. Cada um define: bg, title, text, icon, border.
// O nome `vision-friendly-dark` espelha o tema do github-readme-stats que você já usa.

export const THEMES = {
  'vision-friendly-dark': {
    bg: '#000000',
    title: '#FFA500',
    text: '#FFFFFF',
    icon: '#FFA500',
    border: '#FFA500',
  },
  dark: {
    bg: '#151515',
    title: '#fe428e',
    text: '#a9fef7',
    icon: '#79ff97',
    border: '#e4e2e2',
  },
  default: {
    bg: '#fffefe',
    title: '#2f80ed',
    text: '#434d58',
    icon: '#4c71f2',
    border: '#e4e2e2',
  },
  radical: {
    bg: '#141321',
    title: '#fe428e',
    text: '#a9fef7',
    icon: '#f8d847',
    border: '#fe428e',
  },
  tokyonight: {
    bg: '#1a1b27',
    title: '#70a5fd',
    text: '#38bdae',
    icon: '#bf91f3',
    border: '#70a5fd',
  },
  dracula: {
    bg: '#282a36',
    title: '#ff79c6',
    text: '#f8f8f2',
    icon: '#50fa7b',
    border: '#bd93f9',
  },
  // tema custom JANDev — laranja sobre preto, refinado
  jandev: {
    bg: '#0a0a0a',
    title: '#ff9500',
    text: '#f5f5f5',
    icon: '#ff9500',
    border: '#ff9500',
  },
};

export function resolveTheme(name) {
  return THEMES[name] || THEMES['vision-friendly-dark'];
}
