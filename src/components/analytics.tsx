"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Medicao de visitas do site (Vercel Web Analytics).
 *
 * Sem cookie: a visitante vira um resumo da requisicao que a Vercel descarta
 * em 24 horas. E o que permite a pagina de privacidade dizer que ninguem e
 * identificado, e dispensa aviso de consentimento.
 *
 * Arquivo de cliente por causa de `beforeSend`: funcao nao atravessa de um
 * componente de servidor (o layout) para um de cliente.
 */

/** O painel fica de fora: e trabalho da clinica, nao leitura do site. */
function descartarPainel(evento: BeforeSendEvent): BeforeSendEvent | null {
  let caminho: string;
  try {
    caminho = new URL(evento.url, "https://podoposture.invalido").pathname;
  } catch {
    // Endereco ilegivel nao da para classificar; na duvida, nao mede —
    // medir o painel por engano e pior do que perder uma visita.
    return null;
  }
  return caminho === "/publicar" || caminho.startsWith("/publicar/") ? null : evento;
}

export function AnalyticsDoSite() {
  return <Analytics beforeSend={descartarPainel} />;
}
