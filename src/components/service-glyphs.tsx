import type { ReactElement } from "react";

/**
 * Glifos dos 12 servicos, desenhados a mao no idioma de prancheta clinica
 * do site: traco continuo 1.6, detalhe fino com opacidade, ponto cheio de
 * marcacao. Sem cor propria: herdam currentColor do contexto.
 * Chaves = href de src/lib/services.ts. Gerador na sessao; fonte unica
 * dos paths e do preview de conferencia.
 */

function GlifoOsteopatia({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx={24} cy={16.5} rx={8.5} ry={6} strokeWidth={1.6} fill="currentColor" fillOpacity={0.12} />
      <path d="M 16.5 19 C 16.5 25.5 20.5 27.5 24 27.5 C 27.5 27.5 31.5 25.5 31.5 19" strokeWidth={1.6} />
      <path d="M 16.5 21 L 10.5 23" strokeWidth={1.6} />
      <path d="M 31.5 21 L 37.5 23" strokeWidth={1.6} />
      <path d="M 24 27.5 L 24 34" strokeWidth={1.6} />
      <path d="M 8.5 13 A 15 15 0 0 0 8.5 31" strokeWidth={1.2} strokeOpacity={0.65} />
      <path d="M 39.5 13 A 15 15 0 0 1 39.5 31" strokeWidth={1.2} strokeOpacity={0.65} />
    </svg>
  );
}

function GlifoFlexo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 13 9 H 25 A 2.5 2.5 0 0 1 27.5 11.5 V 14.5 A 2.5 2.5 0 0 1 25 17 H 13 A 2.5 2.5 0 0 1 10.5 14.5 V 11.5 A 2.5 2.5 0 0 1 13 9 Z" strokeWidth={1.6} />
      <path d="M 27.5 11.5 L 33.5 9.5" strokeWidth={1.6} />
      <path d="M 13 31 H 25 A 2.5 2.5 0 0 1 27.5 33.5 V 36.5 A 2.5 2.5 0 0 1 25 39 H 13 A 2.5 2.5 0 0 1 10.5 36.5 V 33.5 A 2.5 2.5 0 0 1 13 31 Z" strokeWidth={1.6} />
      <path d="M 27.5 36.5 L 33.5 38.5" strokeWidth={1.6} />
      <ellipse cx={19} cy={24} rx={7} ry={2.8} strokeWidth={1.6} fill="currentColor" fillOpacity={0.15} />
      <path d="M 39 19.5 V 12.5 M 39 12.5 L 36.2 15.3 M 39 12.5 L 41.8 15.3" strokeWidth={1.4} />
      <path d="M 39 28.5 V 35.5 M 39 35.5 L 36.2 32.7 M 39 35.5 L 41.8 32.7" strokeWidth={1.4} />
    </svg>
  );
}

function GlifoPosturologia({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1={24} y1={2} x2={24} y2={46} strokeWidth={1.1} strokeOpacity={0.5} strokeDasharray="1.6 3.4" />
      <circle cx={24} cy={9.5} r={4.6} strokeWidth={1.6} />
      <path d="M 18 18.6 C 21 16.6 27 16.6 30 18.6" strokeWidth={1.6} />
      <path d="M 18 18.6 L 17.4 26.8 C 19.4 28.9 28.6 28.9 30.6 26.8 L 30 18.6" strokeWidth={1.6} />
      <path d="M 20.6 29.3 L 20.1 41.3 L 17 42.1" strokeWidth={1.6} />
      <path d="M 27.4 29.3 L 27.9 41.3 L 31 42.1" strokeWidth={1.6} />
      <circle cx={27} cy={8.2} r={1.4} fill="currentColor" stroke="none" />
      <path d="M 28.2 7.4 L 32.6 5.4" strokeWidth={1} strokeOpacity={0.6} />
      <circle cx={20.4} cy={9.8} r={1.4} fill="currentColor" stroke="none" />
      <path d="M 19.1 9.6 L 14.4 8.6" strokeWidth={1} strokeOpacity={0.6} />
      <circle cx={24.6} cy={13.4} r={1.4} fill="currentColor" stroke="none" />
      <path d="M 25.8 14.2 L 30.4 16.2" strokeWidth={1} strokeOpacity={0.6} />
      <circle cx={18.6} cy={41.7} r={1.4} fill="currentColor" stroke="none" />
      <path d="M 17.2 41.1 L 12.8 39.4" strokeWidth={1} strokeOpacity={0.6} />
    </svg>
  );
}

function GlifoAvaliacaoDor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 13 9.5 H 35 V 41 H 13 Z" strokeWidth={1.6} />
      <path d="M 19.5 6 H 28.5 A 2 2 0 0 1 30.5 8 V 11.5 H 17.5 V 8 A 2 2 0 0 1 19.5 6 Z" fill="currentColor" fillOpacity={0.12} strokeWidth={1.6} />
      <path d="M 16.5 27 H 20 L 23 19.5 L 26.5 33.5 L 29 25.5 L 31.5 25.5" strokeWidth={1.5} />
      <path d="M 16.5 36.5 H 26" strokeWidth={1.1} strokeOpacity={0.55} />
    </svg>
  );
}

function GlifoAcupuntura({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 19.5 28 L 33.5 8.5" strokeWidth={1.5} />
      <path d="M 31.2 6.8 L 35.7 11.3 M 32.9 5.4 L 37.2 9.8 M 34.7 4.2 L 38.5 8" strokeWidth={1.3} />
      <circle cx={19} cy={29.5} r={2} fill="currentColor" stroke="none" />
      <path d="M 12.5 25 A 8.5 8.5 0 0 0 23 37" strokeWidth={1.2} strokeOpacity={0.6} />
      <path d="M 8.6 22.2 A 13.5 13.5 0 0 0 25.5 41.4" strokeWidth={1.2} strokeOpacity={0.35} />
    </svg>
  );
}

function GlifoPalmilhas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 21 4.5 C 27 4.5 30 9 29.7 15 C 29.4 20.5 26.6 25.5 26.6 30.5 C 26.6 36.5 25 42.5 20.5 43 C 15.5 43.5 13 38.5 13.4 32.5 C 13.7 27.5 12.4 20.5 13.2 14 C 14 8 16 4.5 21 4.5 Z" strokeWidth={1.6} />
      <path d="M 14.5 18.5 C 18.5 21.5 19.5 26.5 17.5 31" strokeWidth={1.2} strokeOpacity={0.6} />
      <circle cx={19.5} cy={11.5} r={1.8} fill="currentColor" stroke="none" />
      <circle cx={25.4} cy={14.5} r={1.8} fill="currentColor" stroke="none" />
      <circle cx={20} cy={37.5} r={1.8} fill="currentColor" stroke="none" />
    </svg>
  );
}

function GlifoNeuromodulacao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 28.5 5 C 21 5 15.8 10 15.3 16.5 C 15 20 16.4 22.7 14.6 25.7 L 13 28.3 L 16.2 29 L 16.2 32.6 C 16.2 34.7 17.8 35.7 20.4 35.2 L 23.8 34.5 L 23.8 42" strokeWidth={1.6} />
      <circle cx={25.5} cy={15.5} r={2} fill="currentColor" stroke="none" />
      <path d="M 25.5 15.5 L 30.8 15.5 M 25.5 15.5 L 22.6 19.6" strokeWidth={1.2} strokeOpacity={0.7} />
      <path d="M 32.5 9.5 A 8.5 8.5 0 0 1 34.6 18.5" strokeWidth={1.2} strokeOpacity={0.65} />
      <path d="M 36 6.8 A 13 13 0 0 1 39.2 20.6" strokeWidth={1.2} strokeOpacity={0.4} />
    </svg>
  );
}

function GlifoBaropodometria({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 6.5 40 H 41" strokeWidth={1.6} />
      <path d="M 9 43.2 H 24" strokeWidth={1.1} strokeOpacity={0.5} />
      <path d="M 9.5 40 C 9 35.2 10.4 31 13.4 29.6 C 16.4 28.2 18.8 30 20.2 33 C 21.4 35.6 23.6 37 26.2 37.4 C 27.8 37.6 28.6 38.6 28.4 40 Z" fill="currentColor" fillOpacity={0.1} strokeWidth={1.6} />
      <line x1={33.5} y1={40} x2={33.5} y2={33.5} strokeWidth={1.6} />
      <line x1={36.8} y1={40} x2={36.8} y2={28.5} strokeWidth={1.6} />
      <line x1={40.1} y1={40} x2={40.1} y2={23.5} strokeWidth={1.6} />
      {/* pontos de pressao sob a planta: o que a plataforma le */}
      <circle cx={12.5} cy={38.2} r={1.4} fill="currentColor" stroke="none" />
      <circle cx={21} cy={38.2} r={1.7} fill="currentColor" stroke="none" />
      <circle cx={26.6} cy={38.6} r={1.2} fill="currentColor" stroke="none" />
    </svg>
  );
}

function GlifoZumbido({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 27.5 8 C 33.5 7.6 37.2 12.5 36.8 17.8 C 36.4 22.8 33.4 25.2 31.2 28.2 C 29.5 30.7 29.2 34.2 25.7 35.3 C 22.2 36.4 19.5 33.8 20 30.5" strokeWidth={1.6} />
      <path d="M 27.8 13 C 31.3 13.4 33 16.8 32 20.3" strokeWidth={1.4} />
      <path d="M 20.5 17.5 A 3.6 3.6 0 0 0 20.5 22.7" strokeWidth={1.2} strokeOpacity={0.75} />
      <path d="M 16.6 14.8 A 7.2 7.2 0 0 0 16.6 25.4" strokeWidth={1.2} strokeOpacity={0.5} />
      <path d="M 12.8 12.2 A 11 11 0 0 0 12.8 28" strokeWidth={1.2} strokeOpacity={0.3} />
    </svg>
  );
}

function GlifoDtm({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 11 17.5 C 11 9.5 17 5.5 22.5 5.5 C 28 5.5 34 9.5 34 17.5" strokeWidth={1.6} />
      <path d="M 15.5 13.2 V 17 M 20.2 11.4 V 15.6 M 24.8 11.4 V 15.6 M 29.5 13.2 V 17" strokeWidth={1.2} strokeOpacity={0.65} />
      <path d="M 11 30.5 C 11 38.5 17 42.5 22.5 42.5 C 28 42.5 34 38.5 34 30.5" strokeWidth={1.6} />
      <path d="M 15.5 34.8 V 31 M 20.2 36.6 V 32.4 M 24.8 36.6 V 32.4 M 29.5 34.8 V 31" strokeWidth={1.2} strokeOpacity={0.65} />
      <circle cx={39.5} cy={24} r={1.6} fill="currentColor" stroke="none" />
      <circle cx={39.5} cy={24} r={3.6} strokeWidth={1.2} />
      <path d="M 39.5 17.2 V 14.4 M 39.5 30.8 V 33.6 M 44.6 24 H 47 M 34.4 24 H 36.2" strokeWidth={1.1} strokeOpacity={0.6} />
    </svg>
  );
}

function GlifoRpg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1={36.5} y1={4} x2={36.5} y2={44} strokeWidth={1.2} strokeOpacity={0.6} />
      <line x1={8} y1={44} x2={36.5} y2={44} strokeWidth={1.2} strokeOpacity={0.6} />
      <path d="M 12 24 Q 14 14.5 22 10.5" fill="none" strokeWidth={1.1} strokeOpacity={0.55} strokeDasharray="2 4" />
      <circle cx={25.5} cy={10} r={3.6} strokeWidth={1.6} />
      <path d="M 27.8 13 C 31 10.8 33.5 9.3 36.5 8.3" strokeWidth={1.5} />
      <path d="M 26.5 13.5 C 25.2 19.5 24.8 24.5 24.3 29" strokeWidth={1.6} />
      <path d="M 24.3 29 L 20.2 41.6 L 17 42.2" strokeWidth={1.6} />
      <path d="M 24.3 29 C 26.4 33.8 27.4 37.4 28.3 41.6 L 31.5 42.2" strokeWidth={1.6} />
    </svg>
  );
}

function GlifoCurriculo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 15 6 H 28.5 L 34.5 12 V 42 H 15 Z" strokeWidth={1.6} />
      <path d="M 28.5 6 V 12 H 34.5" strokeWidth={1.3} />
      <path d="M 19.5 19 H 30 M 19.5 24 H 30 M 19.5 29 H 25.5" strokeWidth={1.2} strokeOpacity={0.65} />
      <circle cx={28.8} cy={35.2} r={3.2} strokeWidth={1.3} />
      <path d="M 27.4 38 L 26.4 41.6 M 30.2 38 L 31.2 41.6" strokeWidth={1.2} />
    </svg>
  );
}

export const GLYPHS: Record<string, (p: { className?: string }) => ReactElement> = {
  "/osteopatia": GlifoOsteopatia,
  "/flexo-distração": GlifoFlexo,
  "/posturologia": GlifoPosturologia,
  "/tratamento-da-dor": GlifoAvaliacaoDor,
  "/acupuntura": GlifoAcupuntura,
  "/palmilhas-personalizadas": GlifoPalmilhas,
  "/neuromodulação": GlifoNeuromodulacao,
  "/baropodometria": GlifoBaropodometria,
  "/tratamento-do-zumbido": GlifoZumbido,
  "/tratamento-da-dtm": GlifoDtm,
  "/rpg": GlifoRpg,
  "/currículo-profissional": GlifoCurriculo,
};
