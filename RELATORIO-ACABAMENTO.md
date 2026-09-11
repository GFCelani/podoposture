# Relatorio do acabamento das paginas internas

Trabalho de 2026-09-04 sobre as 88 rotas fora da home. Copy verbatim: nenhuma
palavra do texto da cliente mudou; o que mudou e' a marcacao em volta dela.
Este documento e' o registro do que foi feito, do que ficou pendente da
cliente (fotos) e das decisoes tomadas sem especificacao previa.

## 1. Inventario

88 rotas: home, indice do blog, 18 paginas de conteudo, 68 posts. Palavras e
contagem de titulos (h2/h3) vem do HTML extraido em `src/content/`. "Imagem
hoje" e' o estado ANTES deste trabalho.

| # | URL | Título | Palavras | h2/h3 | Imagem hoje | Tipo | Renderiza |
|---|---|---|---|---|---|---|---|
| 0 | `/` | Home | - | - | hero + 9 fotos | home | `app/page.tsx` |
| 1 | `/acupuntura` | Acupuntura | 587 | 2/8 | foto real (galeria) | tratamento | `app/[slug]/page.tsx` |
| 2 | `/acupuntura-clínica` | Volte a viver sem dor com a Acupuntura Clínica na PodoPosture | 331 | 5/2 | foto real (galeria) | tratamento | `app/[slug]/page.tsx` |
| 3 | `/baropodometria` | EXAME DE BAROPODOMETRIA / AVALIAÇÃO TRIDIMENSIONAL DO MOVIMENTO | 518 | 1/8 | foto real (galeria) | tratamento | `app/[slug]/page.tsx` |
| 4 | `/contato` | Contato | 18 | 3/0 | seção Contact | institucional | `app/[slug]/page.tsx` |
| 5 | `/currículo-profissional` | Claudia Meirelles | 369 | 7/0 | nenhuma | institucional | `app/[slug]/page.tsx` |
| 6 | `/dor-lombar-crônica` | Dor lombar que não melhora? | 449 | 7/1 | nenhuma | tratamento | `app/[slug]/page.tsx` |
| 7 | `/flexo-distração` | FLEXO-DISTRAÇÃO: Uma Abordagem Completa para o Tratamento de Dores na Coluna | 500 | 6/0 | foto real (galeria) | tratamento | `app/[slug]/page.tsx` |
| 8 | `/método-posture+` | POSTURE+ : Método de Reorganização Neurofuncional da Dor | 644 | 8/0 | foto real (galeria) | tratamento | `app/[slug]/page.tsx` |
| 9 | `/neuromodulação` | NEUROMODULAÇÃO NÃO-INVASIVA | 456 | 6/4 | nenhuma | tratamento | `app/[slug]/page.tsx` |
| 10 | `/nosso-blog` | Nosso Blog (índice) | 0 | - | 68 capas | índice | `app/nosso-blog/page.tsx` |
| 11 | `/osteopatia` | Osteopatia | 672 | 1/7 | foto real (galeria) | tratamento | `app/[slug]/page.tsx` |
| 12 | `/palmilhas-personalizadas` | Palmilhas e Chinelos Personalizados | 444 | 3/8 | foto real (galeria) | tratamento | `app/[slug]/page.tsx` |
| 13 | `/posturologia` | Posturologia | 549 | 10/0 | foto real (galeria) | tratamento | `app/[slug]/page.tsx` |
| 14 | `/quem-somos` | Quem Somos | 110 | 2/0 | foto real (galeria) | institucional | `app/[slug]/page.tsx` |
| 15 | `/responsável-técnica` | Responsável Técnica | 286 | 1/3 | foto real (galeria) | institucional | `app/[slug]/page.tsx` |
| 16 | `/rpg` | RPG/RPM | 110 | 0/0 | nenhuma | tratamento | `app/[slug]/page.tsx` |
| 17 | `/tratamento-da-dor` | Quando a Dor Persiste, é Preciso ir Além dos Sintomas | 546 | 5/14 | nenhuma | tratamento | `app/[slug]/page.tsx` |
| 18 | `/tratamento-da-dtm` | Disfunções da ATM e Outras condições Crâniomandibulares | 885 | 4/12 | nenhuma | tratamento | `app/[slug]/page.tsx` |
| 19 | `/tratamento-do-zumbido` | Tratamento do Zumbido Somatossensorial | 673 | 5/2 | nenhuma | tratamento | `app/[slug]/page.tsx` |
| 20 | `/home/f/neuralgia-occipital-ou-de-arnold` | Neuralgia occipital ou de Arnold: | 1002 | 8/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 21 | `/home/f/bruxismo-sem-desgaste-dos-dentes` | Bruxismo sem desgaste dos dentes: | 1999 | 1/51 | capa | post | `app/home/f/[slug]/page.tsx` |
| 22 | `/home/f/o-melhor-tratamento-para-zumbido-não-é-uma-técnica` | O melhor tratamento para zumbido não é uma técnica. | 1460 | 11/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 23 | `/home/f/tratamento-para-zumbido-como-a-neuromodulação-pode-ajudar` | Tratamento para Zumbido: Como a Neuromodulação Pode Ajudar | 774 | 7/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 24 | `/home/f/dor-crônica-default-mode-e-medicina-bioelétrica-adaptativa` | Dor Crônica, Default Mode e Medicina Bioelétrica Adaptativa | 902 | 9/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 25 | `/home/f/bruxismo-refluxo-e-sistema-nervoso` | Bruxismo, Refluxo e Sistema Nervoso: | 581 | 8/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 26 | `/home/f/o-que-a-ciência-está-revelando-sobre-o-nervo-vago` | O que a ciência está revelando sobre o nervo vago | 821 | 6/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 27 | `/home/f/diretrizes-brasileiras-2026-para-fibromialgia` | Diretrizes Brasileiras 2026 para Fibromialgia: | 780 | 14/1 | capa | post | `app/home/f/[slug]/page.tsx` |
| 28 | `/home/f/tensão-interna-crônica-ansiedade-silenciosa-e-fadiga-ocular` | Tensão interna crônica, ansiedade silenciosa e fadiga ocular | 549 | 0/9 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 29 | `/home/f/o-que-faz-uma-dor-comum-se-tornar-dor-crônica` | O que faz uma dor comum se tornar dor crônica? | 716 | 6/1 | capa | post | `app/home/f/[slug]/page.tsx` |
| 30 | `/home/f/estimulação-transcraniana-por-corrente-contínua-tdcs` | Estimulação Transcraniana por Corrente Contínua (tDCS) | 658 | 5/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 31 | `/home/f/tratamento-integrado-da-dor-crônica` | Tratamento Integrado da Dor Crônica | 825 | 9/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 32 | `/home/f/2026-escolhas-de-hoje-qualidade-de-vida-amanhã` | 2026: escolhas de hoje, qualidade de vida amanhã | 513 | 8/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 33 | `/home/f/migrânea-vestibular-tontura-e-cervical-qual-é-a-relação` | Migrânea Vestibular, Tontura e Cervical: qual é a relação? | 1004 | 8/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 34 | `/home/f/tontura-pressão-na-cabeça-e-sensação-de-alerta` | Tontura, pressão na cabeça e sensação de alerta: | 683 | 6/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 35 | `/home/f/enxaqueca-intestino-e-atm-por-que-esses-caminham-juntos` | Enxaqueca, Intestino e ATM: Por que caminham juntos? | 707 | 12/3 | capa | post | `app/home/f/[slug]/page.tsx` |
| 36 | `/home/f/a-dor-lombar-que-não-aparece-na-ressonância` | A dor lombar que não aparece na ressonância | 716 | 5/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 37 | `/home/f/síndrome-de-takotsubo-quando-emoção-vira-doença-cardíaca-real` | Síndrome de Takotsubo: quando emoção vira doença cardíaca real | 544 | 1/1 | capa | post | `app/home/f/[slug]/page.tsx` |
| 38 | `/home/f/posture-neurospine` | POSTURE+ NeuroSpine: | 391 | 4/1 | capa | post | `app/home/f/[slug]/page.tsx` |
| 39 | `/home/f/a-dor-desaparece-quando-você-viaja-o-que-acontece-com-o-cérebro` | A dor desaparece quando você viaja? O que acontece com o cérebro? | 651 | 5/0 | capa + 2 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 40 | `/home/f/do-alerta-ao-esgotamento-o-que-o-estresse-crônico-faz-com-você` | Do alerta ao esgotamento: o que o estresse crônico faz com você | 578 | 3/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 41 | `/home/f/tavns-uma-alternativa-promissora-na-dor-de-cabeça-crônica` | tAVNS: uma alternativa promissora na dor de cabeça crônica | 871 | 5/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 42 | `/home/f/tecnologia-de-ponta-que-mapeia-a-atividade-cerebral-em-tempo-real` | Tecnologia de ponta que mapeia a atividade cerebral em tempo real | 443 | 5/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 43 | `/home/f/primavera-fígado-e-torcicolo-na-medicina-tradicional-chinesa` | Primavera, Fígado e Torcicolo na Medicina Tradicional Chinesa | 458 | 1/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 44 | `/home/f/a-importância-das-reavaliações-no-tratamento-com-palmilhas` | A importância das Reavaliações no tratamento com Palmilhas | 208 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 45 | `/home/f/melhorando-a-postura-por-meio-da-fisioterapia` | Melhorando a postura por meio da Fisioterapia | 918 | 26/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 46 | `/home/f/fibromialgiacomo-o-tdcs-pode-ajudar-no-tratamento-da-dor-crônica` | Fibromialgia:como o tDCS pode ajudar no tratamento da dor crônica | 530 | 6/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 47 | `/home/f/acordo-sempre-às-3h-da-manhã-o-que-o-meu-corpo-quer-me-dizer` | Acordo sempre às 3h da manhã. O que o meu corpo quer me dizer? | 751 | 5/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 48 | `/home/f/o-zumbido-e-o-frio-o-estresse-e-outras-causas-pouco-comentadas` | O zumbido e o Frio, o Estresse e outras causas pouco comentadas | 607 | 0/9 | capa | post | `app/home/f/[slug]/page.tsx` |
| 49 | `/home/f/cortisol-insônia-e-dor-o-ciclo-silencioso-que-sabota-sua-saúde` | Cortisol, insônia e dor: o ciclo silencioso que sabota sua saúde | 625 | 4/1 | capa | post | `app/home/f/[slug]/page.tsx` |
| 50 | `/home/f/dismorfismo-podal-você-já-ouviu-falar` | DISMORFISMO PODAL: você já ouviu falar? | 214 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 51 | `/home/f/sente-uma-dor-na-lateral-da-coxa-que-parece-não-ter-explicação` | Sente uma dor na lateral da coxa que parece não ter explicação? bursite trocânterica bursite do quadril | 718 | 2/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 52 | `/home/f/dor-crônica-e-disfunção-autonômica` | Dor crônica e disfunção autonômica: | 503 | 10/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 53 | `/home/f/neurociência-da-dor-e-a-lombalgia-inespecífica` | Neurociência da Dor e a lombalgia inespecífica | 476 | 7/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 54 | `/home/f/você-sente-o-ouvido-tampado-estalos-ou-zumbido` | Você sente o ouvido "tampado", estalos ou zumbido? | 541 | 0/15 | capa | post | `app/home/f/[slug]/page.tsx` |
| 55 | `/home/f/22-de-junho-—-dia-mundial-da-osteopatia` | 22 de Junho — Dia Mundial da Osteopatia | 175 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 56 | `/home/f/dor-na-atm-bruxismo-e-o-distúrbios-intestinais` | Dor na ATM, bruxismo... e o distúrbios intestinais? | 590 | 5/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 57 | `/home/f/a-história-por-trás-da-neurosynapse` | A história por trás da NeuroSynapse | 274 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 58 | `/home/f/você-já-ouviu-falar-em-ondas-binaurais` | Você já ouviu falar em Ondas Binaurais? | 281 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 59 | `/home/f/zumbido-o-que-é-por-que-acontece-e-como-tratar` | Zumbido: o que é, porque acontece e como tratar | 486 | 8/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 60 | `/home/f/eletroacupuntura-tdcs-o-cérebro-aprende-a-não-sentir-tanta-dor` | Eletroacupuntura + tDCS: o cérebro aprende a não sentir tanta dor | 270 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 61 | `/home/f/osteopatia-e-disfunções-do-fígado-o-fígado-realmente-dói` | Osteopatia e Disfunções do Fígado: O Fígado Realmente Dói? | 669 | 6/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 62 | `/home/f/relação-entre-o-ângulo-q-a-largura-do-quadril-e-os-joelhos` | Relação entre o Ângulo Q, a Largura do Quadril e os Joelhos | 530 | 5/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 63 | `/home/f/como-a-biomecânica-dos-pés-pode-afetar-a-sua-coluna` | Como a Biomecânica dos Pés Pode Afetar a Sua Coluna | 766 | 6/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 64 | `/home/f/como-a-osteopatia-pode-aliviar-os-sintomas-da-neuralgia-de-arnold` | Como a Osteopatia Pode Aliviar os Sintomas da NEURALGIA DE ARNOLD | 602 | 4/5 | capa | post | `app/home/f/[slug]/page.tsx` |
| 65 | `/home/f/zumbido-somatossensorial` | Zumbido Somatossensorial: | 464 | 6/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 66 | `/home/f/afinal-para-que-serve-o-exame-de-baropodometria` | Afinal, para que serve o Exame de  BAROPODOMETRIA? | 522 | 6/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 67 | `/home/f/chinelos-100%-personalizados-para-fascite-plantar` | Chinelos 100% personalizados para FASCITE PLANTAR! | 304 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 68 | `/home/f/já-ouviu-falar-em-notalgia-parestésica` | Já ouviu falar em NOTALGIA PARESTÉSICA? | 475 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 69 | `/home/f/mecanismo-de-windlass` | Mecanismo de WINDLASS | 138 | 0/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 70 | `/home/f/neuromodulação-auricular-vagal-tratamento-inovador-para-zumbido` | NEUROMODULAÇÃO AURICULAR VAGAL: Tratamento Inovador para Zumbido | 738 | 9/1 | capa | post | `app/home/f/[slug]/page.tsx` |
| 71 | `/home/f/você-sabe-o-que-é-trismo` | Você sabe o que é Trismo? | 511 | 7/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 72 | `/home/f/você-sabe-todos-os-sintomas-que-podem-estar-associados-à-dtm` | Você sabe todos os sintomas que podem estar associados à DTM? | 353 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 73 | `/home/f/entenda-sua-pisada-com-a-baropodometria` | Entenda sua pisada com a BAROPODOMETRIA! | 267 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 74 | `/home/f/neuralgia-do-auriculotemporal` | Neuralgia do Auriculotemporal | 192 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 75 | `/home/f/posturologia-e-as-emoções` | POSTUROLOGIA e as emoções | 379 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 76 | `/home/f/relação-entre-dor-no-ombro-direito-e-o-fígado` | Relação entre DOR NO OMBRO DIREITO e o FÍGADO | 395 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 77 | `/home/f/a-acupuntura-funciona-para-dores-crônicas` | A ACUPUNTURA funciona para dores crônicas? | 967 | 5/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 78 | `/home/f/importância-das-palmilhas-posturais-nas-dores-da-coluna-e-hérnia` | Importância das PALMILHAS POSTURAIS nas dores da coluna e Hérnia | 540 | 4/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 79 | `/home/f/palmilhas-personalizadas-para-pés-diabéticos` | Palmilhas Personalizadas para PÉS DIABÉTICOS | 370 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 80 | `/home/f/descubra-o-conforto-e-benefícios-das-palmilhas-personalizadas` | Descubra o Conforto e Benefícios das PALMILHAS PERSONALIZADAS | 323 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 81 | `/home/f/neuromodulação-auricular-no-tratamento-do-zumbido` | Neuromodulação Auricular no Tratamento do ZUMBIDO | 106 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 82 | `/home/f/quando-usar-uma-palmilha-postural-personalizada` | Quando usar uma PALMILHA POSTURAL Personalizada? | 286 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 83 | `/home/f/4-motivos-para-o-uso-da-flexo-distração-nas-patologias-discais` | 4 MOTIVOS para o uso da FLEXO-DISTRAÇÃO nas patologias discais. | 241 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 84 | `/home/f/tendinite-do-calcâneo---causa-ou-consequência` | Tendinite do Calcâneo - Causa ou Consequência? | 156 | 0/0 | capa | post | `app/home/f/[slug]/page.tsx` |
| 85 | `/home/f/exercícios-respiratórios-por-5-minutos-melhoram-humor-e-ansiedade` | Exercícios respiratórios por 5 minutos melhoram humor e ansiedade | 387 | 0/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 86 | `/home/f/período-de-adaptação-ao-uso-das-palmilhas-posturais` | Período de Adaptação ao uso das Palmilhas Posturais | 125 | 0/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |
| 87 | `/home/f/cefaleia-cervicogênica-e-osteopatia` | Cefaleia Cervicogênica e Osteopatia | 134 | 0/0 | capa + 1 no corpo | post | `app/home/f/[slug]/page.tsx` |


## 2. Padroes definidos

Documentados em comentario no topo de `src/components/page-shell.tsx`; este
e' o resumo.

### 2.1 Tres layouts

| Tipo | Rotas | Hero | Corpo | Fecho |
|---|---|---|---|---|
| `tratamento` | 14 paginas de tratamento, tecnica e avaliacao | duas colunas: trilha, glifo, titulo, descricao; a direita a foto da pagina (ou placeholder) em moldura, com linhas de referencia e ponto de sonar | secoes numeradas (01, 02...) com numeral fixo numa coluna a esquerda; sumario ancorado em `bg-surface` com corte diagonal depois da abertura, quando ha 3+ secoes | paginas vizinhas do grupo do menu; convite |
| `institucional` | quem somos, responsavel tecnica, curriculo, contato, indice do blog | o mesmo hero de duas colunas quando ha midia | corrido, sem numeral; cada secao abre com fio fino | vizinhas do grupo "A Clinica"; convite |
| `post` | 68 artigos | coluna unica: trilha, data e tema em mono, titulo, resumo; a capa em moldura larga atravessa a costura do hero com o corpo | corrido, centrado na medida de leitura, fio fino por secao | "Leia tambem" (3 posts da mesma categoria); convite |

### 2.2 Ritmo vertical

hero (`surface`) > abertura (`paper`, primeiro paragrafo em corpo maior) >
[sumario em `surface`, so tratamento] > secoes (`paper`, respiro fixo entre
elas) > relacionadas (`paper`, fio acima) > convite (`surface`) > costura >
faixa social > rodape.

O corte das secoes e' o do proprio texto: a cada `<h2>` quando ha dois ou
mais; senao a cada `<h3>` quando ha dois ou mais (7 documentos: osteopatia,
baropodometria, responsavel-tecnica e 4 posts); senao nao ha corte. Nenhuma
divisao foi inventada. Conferido nos 88 documentos: o texto sem tags e'
byte a byte o mesmo antes e depois.

### 2.3 Detalhe grafico

Acento, nao moldura. Numeral mono com filete abre secao; fio de 1px separa
bandas; linhas de referencia e ponto de sonar so no hero; a pull quote leva
fio vertical em accent. Nada mais e' desenhado por cima do texto.

Pull quote: e' a primeira frase do documento que a autora escreveu inteira
em negrito, com 40 a 220 caracteres, terminando em ponto e sem chamada de
agenda. Nao sai do lugar; muda o tratamento (display, corpo maior, fio).
Ocorre em 6 documentos: `/neuromodulacao` e os posts neuralgia-occipital,
bruxismo-sem-desgaste, o-melhor-tratamento-para-zumbido,
tratamento-para-zumbido-como-a-neuromodulacao e dor-na-atm-bruxismo.

### 2.4 Movimento

Um so: `Reveal` (opacidade 0 para 1, 14px de subida, 750ms, curva de saida
do site) por bloco, variante cortina para titulos. So `transform` e
`opacity`. O repouso de movimento reduzido vive em CSS (`[data-motion]`, em
globals.css), vale no primeiro quadro e nao depende do observer: com
`prefers-reduced-motion: reduce` tudo nasce visivel.

### 2.5 Medida de linha

`.prosa`: 66ch no telefone, 68ch a partir de 768px, corpo 18/19px. Da
entre 62 e 72 caracteres por linha. Nas paginas numeradas o texto ocupa 8
das 12 colunas e encosta a esquerda, ao lado do numeral.

## 3. Placeholders: o pedido de fotos para a cliente

Sete paginas nao tem cena honesta no acervo (AUDITORIA.md, itens 7 e 8).
Cada uma mostra, no lugar da foto do hero, uma placa na moldura do tema com
o rotulo abaixo. Quando a foto chegar, entra em `FOTOS` e o rotulo sai de
`PLACEHOLDERS`, os dois em `src/lib/ilustracao-da-pagina.ts`. Fotos em
retrato (4:5), como as demais da galeria.

| Pagina | O que falta fotografar |
|---|---|
| `/curriculo-profissional` | retrato da responsavel tecnica |
| `/dor-lombar-cronica` | atendimento de dor lombar na maca |
| `/neuromodulacao` | sessao de neuromodulacao com o aparelho |
| `/rpg` | sessao de RPG na sala de exame |
| `/tratamento-da-dor` | avaliacao clinica da dor em consulta |
| `/tratamento-da-dtm` | avaliacao da ATM em consulta |
| `/tratamento-do-zumbido` | aplicacao de neuromodulacao auricular |

As outras 10 paginas de conteudo usam fotos reais da galeria, mapeadas por
assunto (plataforma de pressao em baropodometria, materiais de acupuntura em
acupuntura, corredor de marcha em palmilhas, e assim por diante). Os 68
posts usam a propria capa. `/contato` tem a secao de contato com mapa.

## 4. Paginas em que o texto nao permitiu hierarquia

Sem dois titulos do mesmo nivel nao ha o que dividir, e dividir por
paragrafo seria inventar secao. Estas rotas ficam com a abertura inteira num
bloco so (primeiro paragrafo em corpo maior, entrada por scroll, fio de
abertura), sem sumario nem numeral. Se a cliente quiser ritmo nelas, e'
decisao editorial: subtitulos novos, escritos por ela.

- `/rpg` (110 palavras, 0 titulos)
- `/home/f/síndrome-de-takotsubo-quando-emoção-vira-doença-cardíaca-real` (544 palavras, 1 h2, 1 h3)
- `/home/f/primavera-fígado-e-torcicolo-na-medicina-tradicional-chinesa` (458 palavras, 1 h2, 0 h3)
- `/home/f/a-importância-das-reavaliações-no-tratamento-com-palmilhas` (208 palavras, 0 h2, 0 h3)
- `/home/f/dismorfismo-podal-você-já-ouviu-falar` (214 palavras, 0 h2, 0 h3)
- `/home/f/22-de-junho-—-dia-mundial-da-osteopatia` (175 palavras, 0 h2, 0 h3)
- `/home/f/a-história-por-trás-da-neurosynapse` (274 palavras, 0 h2, 0 h3)
- `/home/f/você-já-ouviu-falar-em-ondas-binaurais` (281 palavras, 0 h2, 0 h3)
- `/home/f/eletroacupuntura-tdcs-o-cérebro-aprende-a-não-sentir-tanta-dor` (270 palavras, 0 h2, 0 h3)
- `/home/f/chinelos-100%-personalizados-para-fascite-plantar` (304 palavras, 0 h2, 0 h3)
- `/home/f/já-ouviu-falar-em-notalgia-parestésica` (475 palavras, 0 h2, 0 h3)
- `/home/f/mecanismo-de-windlass` (138 palavras, 0 h2, 0 h3)
- `/home/f/você-sabe-todos-os-sintomas-que-podem-estar-associados-à-dtm` (353 palavras, 0 h2, 0 h3)
- `/home/f/entenda-sua-pisada-com-a-baropodometria` (267 palavras, 0 h2, 0 h3)
- `/home/f/neuralgia-do-auriculotemporal` (192 palavras, 0 h2, 0 h3)
- `/home/f/posturologia-e-as-emoções` (379 palavras, 0 h2, 0 h3)
- `/home/f/relação-entre-dor-no-ombro-direito-e-o-fígado` (395 palavras, 0 h2, 0 h3)
- `/home/f/palmilhas-personalizadas-para-pés-diabéticos` (370 palavras, 0 h2, 0 h3)
- `/home/f/descubra-o-conforto-e-benefícios-das-palmilhas-personalizadas` (323 palavras, 0 h2, 0 h3)
- `/home/f/neuromodulação-auricular-no-tratamento-do-zumbido` (106 palavras, 0 h2, 0 h3)
- `/home/f/quando-usar-uma-palmilha-postural-personalizada` (286 palavras, 0 h2, 0 h3)
- `/home/f/4-motivos-para-o-uso-da-flexo-distração-nas-patologias-discais` (241 palavras, 0 h2, 0 h3)
- `/home/f/tendinite-do-calcâneo---causa-ou-consequência` (156 palavras, 0 h2, 0 h3)
- `/home/f/exercícios-respiratórios-por-5-minutos-melhoram-humor-e-ansiedade` (387 palavras, 0 h2, 0 h3)
- `/home/f/período-de-adaptação-ao-uso-das-palmilhas-posturais` (125 palavras, 0 h2, 0 h3)
- `/home/f/cefaleia-cervicogênica-e-osteopatia` (134 palavras, 0 h2, 0 h3)

Total: 1 pagina e 25 posts.

## 5. Decisoes tomadas sem especificacao previa

1. **A foto mora no hero, nao no meio do texto.** O briefing pedia a imagem
   "onde o texto pede". A tabela de fotos ja casava assunto com pagina
   (plataforma de pressao em baropodometria, e assim por diante); o lugar
   escolhido foi a coluna direita do hero, porque e' onde a leitora decide
   ficar, e porque uma so foto por pagina nao pode estar em dois lugares.
   `SecoesDeConteudo` aceita um `intervalo` para inserir um bloco depois da
   secao "como funciona" (`indiceParaImagem`), pronto para uma segunda foto
   quando houver.
2. **Sumario de secoes** como o bloco de fundo diferente das paginas de
   tratamento. Precisava haver um bloco em `surface` no meio do `paper` para
   o ritmo alternar; em vez de decoracao, entrou algo com funcao: os titulos
   do texto, ancorados. So quando ha tres ou mais secoes.
3. **Corte em h3** quando o texto tem um h2 de abertura e a estrutura em h3
   (osteopatia, baropodometria, responsavel-tecnica, 4 posts). Cortar so em
   h2 deixaria essas paginas num bloco de 600 palavras.
4. **Pull quote so do que a autora ja destacou**: paragrafo inteiro em
   negrito, terminando em ponto, sem "agende"/"entre em contato". Perguntas
   de FAQ e chamadas de agenda ficaram de fora porque nao sao sintese. Sem
   essa regra, "Sua jornada para o alivio da dor comeca aqui!" viraria pull
   quote.
5. **Convite nos posts.** O ConviteConsulta existia so nas 18 paginas; os 68
   posts terminavam no "Leia tambem". E' texto que ja estava no site, nao
   texto novo.
6. **Capa do post com `fill` em caixa 16:10**, porque o JSON nao traz as
   medidas da capa e `next/image` exige dimensao ou caixa. A caixa reserva o
   espaco: CLS zero. Alt vazio de proposito: as capas sao pecas graficas com
   o titulo do post embutido, e o titulo ja esta no h1.
7. **"Saiba Mais" e o rotulo do grupo do menu** como unico texto das
   relacionadas: os dois ja existem no site (12 "Saiba Mais" na home, os 4
   grupos em nav.ts). Nenhum "veja tambem" foi escrito.
8. **Faixa social sem o numeral "11"** nas internas: a sequencia 01 a 11 e'
   da home; num documento com a propria numeracao o 11 solto nao contava
   nada. A home continua com ele.
9. **Cabecalho fixo compensado em `PageShell`** (respiro superior de 128 /
   144 / 176px): consequencia do commit anterior que tirou o header do fluxo.
10. **Saiu `foto-da-pagina.tsx` e `prose.tsx`**: a foto passou para o hero e
    o texto para `secoes-de-conteudo.tsx`. Nada mais os importava.

### Nao mudou (e precisa continuar assim)

Rotas dinamicas, `middleware.ts`, `rotas.json` e o `prebuild`, `sitemap.ts`,
`robots.ts`, os quatro JSON-LD. Todo o trabalho e' em componentes.

## 6. Pendencias da cliente

Duas, e as duas bloqueiam parte do acabamento. Nenhuma e' regressao deste
trabalho.

### 6.1 As sete fotografias

A lista esta na secao 3. Enquanto elas nao chegam, as sete paginas mostram a
placa de placeholder com o rotulo do que falta. O site nao parece quebrado,
mas tambem nao mostra a clinica onde deveria.

### 6.2 `/metodo-posture+` virou `/metodo-regulador` na origem

Ao rodar `verificar_urls.py` contra o site em producao hoje (2026-09-04), a
pagina `/metodo-posture+` **nao existe mais no GoDaddy**, e no lugar dela
aparece `/metodo-regulador`. Sao 88 URLs la e 88 aqui; uma e' diferente.

O conteudo local e' o da extracao de setembro, entao nao ha regressao: o que
mudou foi a origem, depois que o conteudo foi copiado. O gate acusa isso como
"1 com problema" e vai continuar acusando ate a decisao ser tomada.

**Aguardando confirmacao da Claudia** sobre qual e' o nome atual da pagina,
antes de o site ir ao dominio. Depois da resposta, o caminho e':

1. `python scripts/extrair_paginas.py` para trazer o slug novo e o texto atual;
2. `npm run rotas` (ou o `prebuild`) para regenerar `rotas.json`;
3. decidir se `/metodo-posture+`, que e' a URL que o Google ja conhecia, vira
   redirect 301 para a nova em `next.config.ts` — recomendado, porque e' o
   unico jeito de a autoridade da URL antiga passar para a nova;
4. rodar o gate de novo e exigir 88/88.

Ate la o site serve `/metodo-posture+` com o texto de setembro, que e'
exatamente o que ele fazia antes deste trabalho.

## 7. Verificacao

Tudo abaixo rodou contra o **build de producao** (`npm run build` +
`next start`), nao contra o servidor de desenvolvimento.

### 7.1 Varredura automatizada

92 rotas (as 88 do site, mais tres paginas do indice e uma URL inexistente
para conferir o 404) em 6 larguras: **552 verificacoes**. Por rota e largura:
rolagem completa da pagina, depois medida de rolagem horizontal, ancoras,
blocos de entrada pendentes, imagens sem dimensao, CLS e erros de console.

| Criterio | Resultado |
|---|---|
| Rolagem horizontal em 320 / 390 / 768 / 1024 / 1280 / 1440 | 0 rotas |
| CLS acima de 0,02 | 0 rotas |
| Imagens sem dimensao ou caixa de proporcao | 0 |
| Blocos de entrada que nao apareceram apos rolar | 0 |
| Ancoras do sumario sem destino | 0 |
| Links internos unicos conferidos | 75, **0 quebrados** |
| Contraste abaixo de AA (amostra de 8 rotas, todo texto visivel) | 0 |
| `prefers-reduced-motion: reduce`: elementos invisiveis sem rolar | 0 |
| Erros de console | 0, fora dos dois casos abaixo |

Dois apontamentos, os dois esperados:

- `/home/f/chinelos-100%-personalizados-para-fascite-plantar` responde 500,
  **aqui e na origem**: o `%` solto no slug nao e' escape valido. A forma
  escapada, que e' a que o Google indexa, responde 200. Ja documentado no
  README antes deste trabalho.
- `/nao-existe-404` registra erro de console por ser 404 — que e' o
  comportamento pedido no teste.

### 7.2 Build e tipos

`npm run build`: 94 paginas geradas, sem erro. `tsc --noEmit`: limpo.
`eslint src`: limpo. O unico aviso do build e' a depreciacao de `middleware`,
anterior a este trabalho e explicada em `src/middleware.ts`.

### 7.3 Gate de migracao

`python scripts/verificar_urls.py --alvo http://localhost:3001`, que percorre
as 88 URLs do site antigo e compara o conteudo renderizado: **86/88 em 200**,
1 com o mesmo comportamento da origem (o `%` acima) e 1 divergencia de
estrutura da origem (`/metodo-regulador`, secao 6.2). Nenhuma pagina perdeu
texto: a contagem de palavras subiu em todas, porque a casca passou a
declarar trilha, sumario e navegacao relacionada.

### 7.4 O que a verificacao NAO cobre

- Lighthouse nao foi rodado neste trabalho. Os numeros de desempenho e
  acessibilidade do `RELATORIO-CLIENTE.md` sao de 2026-09-03 e precisam ser
  refeitos antes de virarem argumento comercial de novo.
- O contraste foi medido em 8 rotas, nao nas 88: a paleta e' a mesma em todas
  e o texto vem do mesmo componente, mas a amostra e' amostra.
- Leitor de tela nao foi testado com software real, so a estrutura
  (marcos, hierarquia de titulos, `aria-label`, trilha).
