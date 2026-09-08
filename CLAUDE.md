@AGENTS.md

# Podoposture

## Bibliotecas disponiveis

Instaladas em 2026-09-08, todas com tipos (o `@types/three` veio junto com o
drei). Nenhuma esta em uso: nesta data nao ha um unico import delas em `src/`.
Estao aqui para serem consideradas em tarefas de animacao, 3D, scroll, geracao
procedural e QA visual, nao para serem adotadas por padrao. O que a pagina ja
faz com CSS e com SVG proprio continua sendo o caminho mais barato.

### Animacao

- **motion 13.2** (`motion/react`). E o Framer Motion com o nome novo do
  pacote. Animacao declarativa em React: `motion.div`, variantes, `stagger`,
  `useScroll`, `useInView`, layout animations. Primeira escolha quando a
  animacao acompanha estado de componente ou entrada por scroll.
- **gsap 3.15**. Timeline imperativa, com controle fino de sequencia, easing e
  `ScrollTrigger`. Vale quando a coreografia e longa demais para variantes, ou
  quando e preciso pausar, reverter e sincronizar varios elementos por tempo.
  Sobrepoe o motion em quase tudo: escolher um por peca, nao os dois.
- **lottie-react 3.1**. Toca animacao exportada do After Effects em JSON. So
  faz sentido se a animacao vier pronta de fora; nao e ferramenta de autoria.

### Scroll

- **lenis 1.3**. Scroll suave por interpolacao, substituindo o nativo. Muda o
  comportamento da pagina inteira, entao entra so por decisao consciente:
  atrapalha ancora, `scroll-behavior`, `IntersectionObserver` e navegacao por
  teclado se ligado sem cuidado, e precisa ser desligado em
  `prefers-reduced-motion`.

### 3D

- **three 0.185**. WebGL puro. Custa o maior peso de bundle do conjunto.
- **@react-three/fiber 9.7**. Three como arvore de componentes React.
- **@react-three/drei 10.7**. Helpers para o fiber: camera, controles,
  carregadores, materiais prontos.

  O hero ja teve um plano deformado por ruido em WebGL e ele foi removido em
  2026-09-06 (`fundo-ondulado.tsx`, esta no historico do git). Antes de trazer
  3D de volta, ler por que saiu. Qualquer uso precisa de carga dinamica com
  `ssr: false` e de um caminho sem WebGL.

### Geracao procedural

- **p5 2.3**. Desenho em canvas por codigo: campos de fluxo, particulas, ruido,
  padroes. Serve para GERAR arte que depois vira SVG ou imagem estatica, mais
  do que para rodar em producao; o site inteiro desenha em SVG proprio hoje, e
  um canvas ao vivo perde nitidez, acessibilidade e selecao de texto.

### Ferramenta

- **svgo 4.1** (dev). Otimiza SVG por linha de comando ou por script. Util
  depois de exportar caminho novo do Illustrator ou do gerador de marca. Nao
  passar a marca por ele sem conferir: `scripts/gerar-marca.py` e os
  `translate` de `brand-mark.tsx` dependem de coordenadas medidas.
- **@playwright/test 1.63** (dev). Runner de teste de browser. Nao ha
  `playwright.config.ts`, nao ha `*.spec.ts` e nao ha script de teste no
  `package.json`: o pacote esta instalado e nada mais. Serve para QA visual
  (comparacao de screenshot por faixa) e para conferir as quebras escritas do
  hero e da abertura, que hoje sao verificadas a mao.

### Storybook

Nao esta instalado. Nao aparece no `package.json`, nao aparece no
`package-lock.json`, nao ha pasta `.storybook/` e nao ha nada em
`node_modules/@storybook`. Se a instalacao foi tentada, ela nao concluiu.

## Regras que valem para qualquer uma delas

- `prefers-reduced-motion` sempre, e resolvido por CSS, nao ramificando o
  `initial` no React (ver o vault: reduced-motion com Framer e SSR).
- Um `transform` por no quando entrada e movimento continuo convivem.
- Carga dinamica para o que for pesado. O LCP da home e a foto do hero.
- Movimento representa alguma coisa do produto. Decoracao nao entra.
