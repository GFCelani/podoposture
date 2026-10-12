/**
 * As fotos de public/img que o conteudo padrao e as paginas usam, com a
 * medida real de cada arquivo. Uma imagem so pode ser uma destas ou uma enviada pelo painel: um
 * `src` livre deixaria apontar para qualquer endereco, e largura/altura
 * erradas voltariam a fazer a pagina pular quando a foto carrega.
 */
export const IMAGENS_DO_SITE: Readonly<Record<string, { largura: number; altura: number }>> = {
  "/img/galeria/recepcao.webp": { largura: 827, altura: 1033 },
  "/img/galeria/avaliacao-postural.webp": { largura: 857, altura: 1072 },
  "/img/baropodometria.webp": { largura: 1080, altura: 816 },
  "/img/card-dor-lombar.webp": { largura: 1024, altura: 1280 },
  "/img/card-dor-cronica.webp": { largura: 1024, altura: 1280 },
  "/img/card-zumbido.webp": { largura: 819, altura: 1024 },
  "/img/galeria/palmilhas.webp": { largura: 960, altura: 1200 },
  "/img/galeria/sala-de-atendimento.webp": { largura: 960, altura: 1200 },
  "/img/galeria/sala-de-flexo-distracao.webp": { largura: 960, altura: 1200 },
  "/img/galeria/escritorio.webp": { largura: 869, altura: 1086 },
  "/img/galeria/corredor-de-marcha.webp": { largura: 1086, altura: 1357 },
  "/img/galeria/acupuntura.webp": { largura: 1024, altura: 1280 },
  "/img/galeria/plataforma-de-pressao.webp": { largura: 864, altura: 1080 },
  "/img/galeria/consultorio.webp": { largura: 869, altura: 1086 },
  "/img/galeria/retrato-responsavel-tecnica.webp": { largura: 1024, altura: 1280 },
  "/img/galeria/neuromodulacao-auricular.webp": { largura: 712, altura: 890 },
  "/img/galeria/neuromodulacao-auricular-dupla.webp": { largura: 704, altura: 880 },
  "/img/palpacao-lombar.webp": { largura: 1200, altura: 1500 },
  "/img/avaliacao-da-coluna.webp": { largura: 1200, altura: 1500 },
  "/img/conducao-da-perna-na-maca.webp": { largura: 1200, altura: 1500 },
  "/img/palpacao-da-mandibula.webp": { largura: 1200, altura: 1500 },
  "/img/agulhamento-no-trapezio.webp": { largura: 1200, altura: 1500 },
  "/img/osteopatia-decubito-lateral.webp": { largura: 640, altura: 800 },
  "/img/terapia-manual-na-base-do-cranio.webp": { largura: 1600, altura: 1000 },
  "/img/galeria/bancada-do-consultorio.webp": { largura: 960, altura: 1200 },
  "/img/galeria/mesa-da-consulta.webp": { largura: 1200, altura: 750 },
  "/img/galeria/corredor-com-espelho.webp": { largura: 960, altura: 1200 },
  "/img/galeria/palmilhas-na-bancada.webp": { largura: 960, altura: 1200 },
  "/img/galeria/baropodometria-na-tela.webp": { largura: 1100, altura: 688 },
  "/img/clinica-podoposture-5.webp": { largura: 2560, altura: 1155 },
  "/og.png": { largura: 1200, altura: 630 },
};
