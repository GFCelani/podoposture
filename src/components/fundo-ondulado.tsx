"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo do hero: um plano deformado por ruido Perlin, colorido por tres cores
 * ao longo do relevo. E' a tecnica do hero do Vinclo (ShaderGradient sobre
 * Three.js), reproduzida em WebGL cru para nao carregar 600 KB de biblioteca
 * por um gradiente.
 *
 * A receita, lida do shader deles em runtime (2026-09-04):
 *   - plano 10 x 10 de frente para a camera, a 1,5 de distancia, fov 45;
 *   - a projecao assume um aspecto muito maior que o do canvas, e e' esse
 *     esticamento vertical que alonga as ondas. Aqui o esticamento e'
 *     mantido constante (ESTICAMENTO), entao o desenho tem a mesma proporcao
 *     em qualquer janela em vez de depender de um canvas de 1440 x 1280;
 *   - vertice: z = 0.75 * cnoise(0.43 * pos * densidade + t) * forca, com
 *     t = tempo * velocidade e a forca subindo de 0 a 1 no carregamento;
 *   - cor: mix(mix(c1, c2, smoothstep(-3, 3, x)), c3, z). c1 -> c2 ao longo
 *     do x; c3 entra nas cristas. La so ha luz ambiente, entao o relevo
 *     tonal vem inteiro do z e a iluminacao fisica foi dispensada.
 *
 * Adaptacoes, todas por contraste:
 *   - c1 (esquerda, sob o texto) e' o petroleo, c2 (direita) o azul profundo,
 *     c3 (cristas) o azul de acento. O acento e' a cor mais clara possivel em
 *     qualquer pixel, e papel sobre acento da 4,94: AA para corpo de texto.
 *   - o peso das cristas e' atenuado do lado esquerdo (peso, no fragment),
 *     para o texto mono em on-deep-muted continuar AA onde ele mora;
 *   - o mix e' feito em espaco linear e devolvido em sRGB, como o Three faz;
 *     misturar em sRGB direto encardiria os meios-tons;
 *   - z negativo (vales) fica na cor base: no Vinclo ele extrapola alem da
 *     paleta e clareia; aqui extrapolar tiraria azul e puxaria para um
 *     escuro esverdeado, cor que nao e' do fundo.
 *
 * O canvas nasce transparente sobre um gradiente CSS nas mesmas cores (ver
 * hero.tsx) e aparece em 600ms quando o primeiro quadro sai: e' a "capa" do
 * Vinclo, sem elemento extra. Sem WebGL, o gradiente CSS e' o fundo.
 *
 * Movimento reduzido: um quadro so, num instante fixo, e nada anima. O
 * quadro e' o repouso, e existe sem depender de rAF. Fora da tela ou com a
 * aba oculta o laco para; ao voltar, retoma de onde estava.
 */

const VELOCIDADE = 0.3;
const DENSIDADE = 1.5;
const FORCA = 1.2;
/** Aspecto assumido pela projecao / aspecto real do canvas. Medido no Vinclo: 4,43 / (1440/1280) = 3,94. */
const ESTICAMENTO = 3.94;
const SEGMENTOS = 96;
const DPR_MAXIMO = 1.5;
/** Instante do quadro unico de movimento reduzido. */
const INSTANTE_PARADO = 2.1;

/* Paleta do hero. sRGB em hex, convertida para linear no envio. */
const C1 = "#0d2536"; // petroleo: esquerda, sob o texto
const C2 = "#1e3d56"; // azul profundo: direita
const C3 = "#0e71b4"; // acento: cristas

const VERTEX = /* glsl */ `
precision highp float;
attribute vec3 position;
uniform mat4 uProj;
uniform mat4 uMV;
uniform float uTime;
uniform float uSpeed;
uniform float uDensity;
uniform float uStrength;
uniform float uLoad;
varying vec3 vPos;
varying float vTelaX;

// Ruido Perlin classico 3D, de glsl-noise (MIT), o mesmo do ShaderGradient.
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
  vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
  vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
  vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
  vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
  vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
  vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
  vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);
  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

void main() {
  float t = uTime * uSpeed;
  float distortion = 0.75 * cnoise(0.43 * position * uDensity + t);
  vec3 pos = position + vec3(0.0, 0.0, 1.0) * distortion * uStrength * uLoad;
  vPos = pos;
  gl_Position = uProj * uMV * vec4(pos, 1.0);
  // x em coordenadas de tela (-1 a 1), para o fragment atenuar as cristas
  // onde o TEXTO esta, e nao onde o plano esta: com o relevo a 0,9 numa
  // camera a 1,5, dobras de x positivo caem na esquerda da janela.
  vTelaX = gl_Position.x / gl_Position.w;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vPos;
varying float vTelaX;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;

void main() {
  vec3 base = mix(uC1, uC2, smoothstep(-3.0, 3.0, vPos.x));
  // As cristas puxam para o acento, com menos peso na faixa da janela onde
  // o texto mora (esquerda). A rampa e' por posicao na TELA, nao no plano:
  // atenuando por x do plano, uma dobra de x positivo trazida pela
  // perspectiva ainda chegava a 3,6 de contraste sob o numeral mono em 1440.
  // O piso de 0,20 e o inicio da rampa em -0,2 sao medidos: com 0,25 o
  // on-deep-muted ficava em 4,55 no pior quadro, margem fina demais para uma
  // animacao que nao repete; com 0,20 fica em ~5. Vales ficam na cor base:
  // extrapolar para baixo de zero (como o Vinclo faz para cima) subtrai azul
  // e sai da paleta, num escuro esverdeado.
  float peso = 0.20 + 0.80 * smoothstep(-0.2, 0.6, vTelaX);
  float t = clamp(vPos.z, 0.0, 1.0) * peso;
  vec3 cor = mix(base, uC3, t);
  // volta para sRGB: o mix acima e' em linear, como no Three
  gl_FragColor = vec4(pow(max(cor, 0.0), vec3(1.0 / 2.2)), 1.0);
}
`;

function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return [c[0], c[1], c[2]];
}

function compilar(gl: WebGLRenderingContext, tipo: number, fonte: string) {
  const sh = gl.createShader(tipo);
  if (!sh) return null;
  gl.shaderSource(sh, fonte);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** Perspectiva de fov vertical 45, como a camera do Vinclo. */
function projecao(aspecto: number): Float32Array {
  const f = 1 / Math.tan((45 * Math.PI) / 360);
  const near = 0.1;
  const far = 1000;
  return new Float32Array([
    f / aspecto, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

/* Camera a 1,5 do plano, olhando para a origem; a matriz e' a capturada. */
const MODEL_VIEW = new Float32Array([
  -1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, -1, 0,
  0, 0, -1.5, 1,
]);

export function FundoOndulado({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      // Com profundidade, como o Three: o deslocamento chega a 0,9 numa
      // camera a 1,5, e o plano se dobra sobre si mesmo em perspectiva. Sem
      // o teste, os triangulos de tras pintam por cima em ordem arbitraria
      // e as dobras saem com borda dura; com ele, a superficie mais proxima
      // vence e a dobra fica macia.
      depth: true,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // fica o gradiente CSS

    const vs = compilar(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Plano 10 x 10 em SEGMENTOS x SEGMENTOS, indexado.
    const n = SEGMENTOS + 1;
    const posicoes = new Float32Array(n * n * 3);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const k = (j * n + i) * 3;
        posicoes[k] = (i / SEGMENTOS) * 10 - 5;
        posicoes[k + 1] = (j / SEGMENTOS) * 10 - 5;
        posicoes[k + 2] = 0;
      }
    }
    const indices = new Uint16Array(SEGMENTOS * SEGMENTOS * 6);
    for (let j = 0, k = 0; j < SEGMENTOS; j++) {
      for (let i = 0; i < SEGMENTOS; i++) {
        const a = j * n + i;
        const b = a + 1;
        const c = a + n;
        const d = c + 1;
        indices[k++] = a; indices[k++] = c; indices[k++] = b;
        indices[k++] = b; indices[k++] = c; indices[k++] = d;
      }
    }

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, posicoes, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const u = (nome: string) => gl.getUniformLocation(prog, nome);
    gl.uniformMatrix4fv(u("uMV"), false, MODEL_VIEW);
    gl.uniform1f(u("uSpeed"), VELOCIDADE);
    gl.uniform1f(u("uDensity"), DENSIDADE);
    gl.uniform1f(u("uStrength"), FORCA);
    gl.uniform3fv(u("uC1"), linear(C1));
    gl.uniform3fv(u("uC2"), linear(C2));
    gl.uniform3fv(u("uC3"), linear(C3));
    const uTime = u("uTime");
    const uLoad = u("uLoad");
    const uProj = u("uProj");

    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)");

    const redimensionar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAXIMO);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      // Aspecto assumido = aspecto real x ESTICAMENTO: as ondas ficam
      // alongadas na mesma proporcao em qualquer janela.
      gl.uniformMatrix4fv(uProj, false, projecao((w / h) * ESTICAMENTO));
    };

    let pedido = 0;
    let visivel = true;
    let inicio = 0;
    let pausadoEm = 0;
    let acumulado = 0;
    let primeiro = true;

    const desenhar = (tempo: number, carga: number) => {
      gl.uniform1f(uTime, tempo);
      gl.uniform1f(uLoad, carga);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      if (primeiro) {
        primeiro = false;
        canvas.dataset.pronto = "";
      }
    };

    const quadro = (agora: number) => {
      pedido = 0;
      if (!inicio) inicio = agora;
      const t = acumulado + (agora - inicio) / 1000;
      // a forca sobe de 0 a 1 em 1,4s, como o uLoadingTime do Vinclo:
      // o plano nasce liso e ondula
      const carga = Math.min(1, t / 1.4);
      const eased = 1 - Math.pow(1 - carga, 3);
      desenhar(t, eased);
      if (visivel && !document.hidden) pedido = requestAnimationFrame(quadro);
    };

    const parar = () => {
      if (pedido) cancelAnimationFrame(pedido);
      pedido = 0;
      if (inicio) {
        pausadoEm = performance.now();
        acumulado += (pausadoEm - inicio) / 1000;
        inicio = 0;
      }
    };

    const seguir = () => {
      if (reduzido.matches) {
        desenhar(INSTANTE_PARADO, 1);
        return;
      }
      if (!pedido && visivel && !document.hidden) {
        pedido = requestAnimationFrame(quadro);
      }
    };

    redimensionar();
    seguir();

    const ro = new ResizeObserver(() => {
      redimensionar();
      if (reduzido.matches) desenhar(INSTANTE_PARADO, 1);
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) seguir();
      else parar();
    });
    io.observe(canvas);

    const aoOcultar = () => {
      if (document.hidden) parar();
      else seguir();
    };
    document.addEventListener("visibilitychange", aoOcultar);

    const aoMudarPreferencia = () => {
      parar();
      seguir();
    };
    reduzido.addEventListener("change", aoMudarPreferencia);

    return () => {
      parar();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", aoOcultar);
      reduzido.removeEventListener("change", aoMudarPreferencia);
      // Sem loseContext() aqui, de proposito. O React em desenvolvimento
      // roda o efeito duas vezes no mesmo canvas; um contexto perdido na
      // primeira limpeza e' o que getContext devolve na segunda montagem,
      // e nada mais desenha (getError = CONTEXT_LOST_WEBGL). O navegador
      // libera o contexto junto com o no' quando ele sai do DOM.
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`fundo-ondulado block h-full w-full ${className}`}
    />
  );
}
