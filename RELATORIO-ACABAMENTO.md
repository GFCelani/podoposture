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

