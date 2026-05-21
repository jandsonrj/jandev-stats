// Faixa de chamas decorativa e animada pra borda superior dos cards.
//
// Por que só animar `opacity`:
// dentro de <img> o GitHub renderiza o SVG em modo "estático-animado" —
// animação declarativa (CSS) roda, mas se o CSS animar `transform` ele
// sobrescreve o atributo `transform` que posiciona cada elemento. Então o
// efeito de fogo anima EXCLUSIVAMENTE `opacity`.
//
// Como dá a sensação de fogo "correndo": cada chama tem um atraso de
// animação escalonado da esquerda pra direita. O pico de brilho percorre o
// card como uma onda — e, com o efeito nos dois cards de baixo lado a lado,
// parece que o fogo corre pela linha inteira. Loop infinito, leve, vetorial.

export function fireStrip(width) {
  const margin = 18;
  const usable = Math.max(1, width - margin * 2);
  const count = Math.max(7, Math.round(usable / 32));
  const gap = count > 1 ? usable / (count - 1) : 0;
  const dur = 2.4;            // duração do ciclo, em segundos
  const step = dur / count;   // defasagem entre chamas vizinhas -> onda

  let flames = '';
  for (let i = 0; i < count; i++) {
    const x = margin + i * gap;
    const s = 0.9 + ((i * 13) % 7) * 0.1;        // escala pseudo-aleatória 0.9..1.5
    const delay = -(i * step).toFixed(2);        // negativo -> já entra defasado
    flames +=
      `<g transform="translate(${x.toFixed(1)}, 17) scale(${s.toFixed(2)})">` +
      `<path class="fr-f" style="animation-delay:${delay}s" fill="url(#frGrad)" ` +
      `d="M0,0 C-3,-4 -1,-7 0,-10 C1.5,-6.5 3.5,-4 1.2,-1.5 C0.8,-0.6 -0.5,-0.6 0,0 Z"/>` +
      `</g>`;
  }

  return `
  <style>
    .fr-f    { opacity: 0.18; animation: frFlick ${dur}s ease-in-out infinite; }
    .fr-base { opacity: 0.16; animation: frGlow ${dur}s ease-in-out infinite; }
    @keyframes frFlick { 0%, 100% { opacity: 0.16; } 42% { opacity: 0.6; } 62% { opacity: 0.38; } }
    @keyframes frGlow  { 0%, 100% { opacity: 0.14; } 50% { opacity: 0.32; } }
  </style>
  <defs>
    <linearGradient id="frGrad" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%"   stop-color="#ff3d17"/>
      <stop offset="55%"  stop-color="#ff8c2f"/>
      <stop offset="100%" stop-color="#ffd95e"/>
    </linearGradient>
    <linearGradient id="frBase" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#ff8c2f" stop-opacity="0"/>
      <stop offset="50%"  stop-color="#ff8c2f" stop-opacity="1"/>
      <stop offset="100%" stop-color="#ff8c2f" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g aria-hidden="true">
    <rect class="fr-base" x="${margin}" y="16" width="${usable.toFixed(1)}" height="2" rx="1" fill="url(#frBase)"/>
    ${flames}
  </g>`;
}
