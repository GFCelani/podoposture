@AGENTS.md

# Podoposture

## Recursos disponiveis para trabalho visual

Repertorio a consultar em tarefa de design, animacao, 3D, scroll e QA visual.
Nada disto esta em uso hoje: nao ha import de nenhuma das bibliotecas em
`src/`, e dos recursos nativos a pagina so usa `text-wrap: balance`,
`clip-path` e CSS mask. A lista existe justamente para a proxima peca nao ser
resolvida por reflexo com CSS e SVG estatico. Nao e obrigacao de uso: o custo
de cada item continua valendo, e o SVG proprio segue sendo o caminho mais
barato quando a peca e desenho parado.

### Bibliotecas instaladas

Conferidas no `package.json`. Todas com tipos: as que nao publicam os proprios
tem pacote `@types` instalado, e o `@types/three` veio junto com o drei.

- **motion 13.2** (`motion/react`): Framer Motion com o nome novo do pacote, animacao declarativa em React com variantes, stagger, `useScroll`, `useInView` e layout animations.
- **gsap 3.15**: timeline imperativa com `ScrollTrigger`, para coreografia longa demais para variantes ou que precise pausar, reverter e sincronizar por tempo; escolher um por peca, nao gsap e motion juntos.
- **lenis 1.3**: scroll suave por interpolacao no lugar do nativo, decisao de pagina inteira que precisa de cuidado com ancora, `IntersectionObserver`, teclado e `prefers-reduced-motion`.
- **lottie-react 3.1**: toca animacao exportada do After Effects em JSON, util so quando a animacao vem pronta de fora.
- **three 0.185**: WebGL puro, o maior peso de bundle do conjunto.
- **@react-three/fiber 9.7**: o three como arvore de componentes React.
- **@react-three/drei 10.7**: helpers do fiber (camera, controles, carregadores, materiais prontos).
- **p5 2.3**: desenho procedural em canvas (campo de fluxo, particula, ruido, padrao), melhor como gerador de arte que depois vira SVG ou imagem do que como runtime de producao.
- **matter-js 0.20** + **@types/matter-js 0.20**: fisica 2D de corpo rigido (gravidade, colisao, restricao, empilhamento, arrasto), motor sem renderer proprio, entao o desenho sai em SVG, canvas ou DOM sob o controle da peca.
- **@use-gesture/react 10.3**: gestos de ponteiro, toque e roda normalizados (arrastar, girar, pincar, roda), casa direto com o motion e com o fiber; ja vinha como dependencia do drei e agora e direta, deduplicada na mesma versao.
- **svgo 4.1** (dev): otimiza SVG por script, util depois de exportar caminho novo; nao passar a marca por ele sem conferir, porque `brand-mark.tsx` e `scripts/gerar-marca.py` dependem de coordenadas medidas.
- **@playwright/test 1.63** (dev): runner de browser para QA visual por faixa e para conferir quebra escrita, instalado sem `playwright.config`, sem `*.spec` e sem script de teste no `package.json`.
- **storybook**: NAO esta instalado, apesar de constar na lista pedida. Nao aparece no `package.json` nem no `package-lock.json`, nao ha pasta `.storybook/` e nao ha nada em `node_modules/@storybook`. Se for para existir, precisa de uma instalacao propria.

### Recursos nativos do navegador

Nao aparecem no `package.json` e por isso somem do radar, mas resolvem sozinhos
boa parte do que se pediria a uma biblioteca.

- **SVG filters**: `feTurbulence` para grao e ruido gerados (sem imagem de textura), `feDisplacementMap` para distorcao organica de forma e de texto; combinados dao superficie e imperfeicao sem custo de bundle.
- **mix-blend-mode e background-blend-mode**: composicao entre camadas (multiply, screen, overlay, difference), o jeito de fazer tinta interagir com foto e com fundo em vez de so empilhar opacidade.
- **CSS masks e clip-path**: recortar por forma, por gradiente ou por SVG; `mask` com gradiente e o que faz esvanecer borda e revelar conteudo sem sobrepor retangulo de fundo.
- **View Transitions API**: transicao entre paginas e entre estados com continuidade de elemento, incluindo a forma por documento do App Router; degrada para corte seco onde nao houver suporte.
- **Scroll-driven animations**: `animation-timeline: view()` e `scroll()` ligam animacao CSS ao scroll sem JS, sem listener e sem `IntersectionObserver`; onde couber, e mais barato e mais suave que qualquer alternativa.
- **Container queries e subgrid**: componente que responde a largura do proprio contentor, e alinhamento de filho a grade do avo; resolvem o que hoje se resolve com breakpoint de janela e com medida repetida a mao.
- **text-wrap: balance e pretty**: equilibram titulo e evitam orfao. Ressalva que ja custou caro aqui: a quebra sai por heuristica do navegador, varia entre maquinas e versoes, e portanto NAO serve onde a quebra precisa ser deterministica. Nos dois lugares em que a forma do bloco e medida (o titulo do hero e a abertura de `tratamento-da-dor`) a quebra e escrita e o balance sai de cena; ver `hero.tsx` e `lib/abertura.ts`.

### Shaders

GLSL roda dentro do three via `ShaderMaterial` e `RawShaderMaterial`, sem
dependencia adicional: vertex e fragment shader entram como string, e
uniforms levam tempo, ponteiro e resolucao para dentro. E o caminho para
gradiente vivo, ruido animado e deformacao continua que nao cabem em SVG
filter. O hero ja teve um plano deformado por ruido em WebGL e ele foi
removido em 2026-09-06 (`fundo-ondulado.tsx`, esta no historico do git):
ler por que saiu antes de trazer de volta.

### Regras que valem para qualquer um deles

- `prefers-reduced-motion` sempre, resolvido por CSS, nao ramificando o `initial` no React (ver o vault: reduced-motion com Framer e SSR).
- Um `transform` por no quando entrada e movimento continuo convivem.
- Carga dinamica com `ssr: false` para o que for pesado, e caminho alternativo sem WebGL. O LCP da home e a foto do hero.
- Movimento representa alguma coisa do produto. Decoracao nao entra.
