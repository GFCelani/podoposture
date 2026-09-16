/**
 * Vagas para ler o corpo do pedido de entrada no painel.
 *
 * A leitura do corpo fica fora da vaga do `scrypt` (ver a rota de entrada), e
 * cada leitura pendurada segura um buffer e um temporizador. Um teto global
 * unico resolvia a memoria, mas devolvia o bloqueio barato: 50 conexoes lentas
 * de um script qualquer ocupavam todas as vagas, e a dona clicando em Entrar
 * levava "Muitas tentativas ao mesmo tempo" sem ter errado senha nenhuma.
 *
 * Por isso a decisao olha a origem:
 *
 * - **Origem conhecida acima do proprio teto**: recusada. So ela; as outras
 *   origens seguem lendo normalmente.
 * - **Total da instancia cheio, ou origem desconhecida acima do teto**: nao
 *   recusa, le com prazo curto. Um corpo de 4 KB de quem esta de fato entrando
 *   chega em milissegundos; quem manda um byte de vez em quando cai no prazo e
 *   libera a vaga logo. Sem origem conhecida (sem proxy configurado) nao ha como
 *   separar a dona de quem ataca, entao recusar ali seria bloquear ela tambem.
 * - **Acima do teto absoluto**: le so quem ja entrou nesta instancia, com prazo
 *   curto e dentro de uma reserva propria; o resto e recusado. Sem teto nenhum,
 *   um bloco de enderecos (um /64 de IPv6 tem enderecos de sobra) abria leituras
 *   curtas sem limite, cada uma com seu buffer e seu temporizador.
 *
 * Por que a reserva e por "ja entrou", e nao por "tem poucas leituras": quem
 * ataca de um /64 tem origem nova a vontade, e toda origem nova tem zero
 * leituras — preferir quem tem poucas seria preferir justamente ele. Acertar a
 * senha, nao. A reserva cabe em `origensLembradas * maximoPorOrigem` leituras, e
 * o teto duro (`maximoAbsoluto` mais a reserva) segue limitando a memoria.
 *
 * O que esta reserva NAO cobre, e fica dito: numa instancia nova, em que a dona
 * ainda nao entrou nenhuma vez, um flood que passe do teto absoluto ainda a
 * recusa. E o preco de a memoria ser por instancia; depois do primeiro login
 * naquela instancia ela tem vaga garantida, venha o trafego de quem vier.
 *
 * Modulo puro, sem Next, para ser testado sem subir servidor.
 */

export type ModoDeLeitura = "normal" | "curto" | "recusado";

export type VagasDeLeitura = {
  /** Decide e, se nao for recusa, ocupa a vaga. Toda vaga ocupada precisa de `liberar`. */
  ocupar(origem: string | null): ModoDeLeitura;
  liberar(origem: string | null): void;
  /**
   * Guarda a origem que acertou a senha. So ela entra acima do teto absoluto,
   * e por isso a lista fica curta: e a reserva inteira que ela dimensiona.
   */
  lembrarOrigem(origem: string | null): void;
  /**
   * Se esta origem ja acertou a senha nesta instancia. A rota de entrada
   * consulta isto para dar a ela a vaga reservada de `scrypt`, que e o outro
   * lugar onde um flood de terceiro conseguia recusa-la.
   */
  lembra(origem: string | null): boolean;
  total(): number;
};

export function criarVagasDeLeitura(opcoes: {
  maximoPorOrigem: number;
  /** A partir daqui a leitura corre com prazo curto. */
  maximoTotal: number;
  /** A partir daqui so le quem ja entrou. Precisa ser maior que `maximoTotal`. */
  maximoAbsoluto: number;
  /** Quantas origens que ja entraram ficam lembradas; o resto da fila sai pela ponta antiga. */
  origensLembradas: number;
}): VagasDeLeitura {
  const porOrigem = new Map<string, number>();
  let total = 0;
  // Origem desconhecida vira uma chave que nenhum IP produz. Escrita com
  // escape, e nao com o caractere nulo literal: com ele o git tratava o arquivo
  // como binario e o diff desta logica nao aparecia para quem revisa.
  const chave = (origem: string | null) => origem ?? "\u0000sem-origem";
  // Quem ja acertou a senha nesta instancia, da mais antiga para a mais nova.
  const lembradas = new Set<string>();
  // O teto que de fato limita a memoria: nem quem ja entrou passa daqui.
  const tetoDuro = opcoes.maximoAbsoluto + opcoes.origensLembradas * opcoes.maximoPorOrigem;

  return {
    ocupar(origem) {
      const k = chave(origem);
      const daOrigem = porOrigem.get(k) ?? 0;
      if (total >= opcoes.maximoAbsoluto) {
        // A reserva de quem ja entrou. O prazo curto vale aqui de qualquer
        // jeito: com a instancia nesse estado, esperar 5 s por um corpo e o que
        // nao da para oferecer a ninguem.
        const reservada =
          origem !== null && lembradas.has(origem) && daOrigem < opcoes.maximoPorOrigem && total < tetoDuro;
        if (!reservada) return "recusado";
        porOrigem.set(k, daOrigem + 1);
        total += 1;
        return "curto";
      }
      let modo: ModoDeLeitura = "normal";
      if (daOrigem >= opcoes.maximoPorOrigem) {
        if (origem !== null) return "recusado";
        modo = "curto";
      }
      if (total >= opcoes.maximoTotal) modo = "curto";
      porOrigem.set(k, daOrigem + 1);
      total += 1;
      return modo;
    },
    liberar(origem) {
      const k = chave(origem);
      const daOrigem = porOrigem.get(k) ?? 0;
      if (daOrigem <= 0) return;
      // Chave zerada sai do mapa: senao cada IP que passou uma vez ficaria
      // guardado para sempre.
      if (daOrigem === 1) porOrigem.delete(k);
      else porOrigem.set(k, daOrigem - 1);
      total -= 1;
    },
    lembrarOrigem(origem) {
      if (origem === null) return;
      // Reinserir poe a origem no fim da fila: quem entrou ha pouco e a ultima a
      // sair. Sem isso, a dona saia da lista por causa de logins mais novos.
      lembradas.delete(origem);
      lembradas.add(origem);
      if (lembradas.size > opcoes.origensLembradas) {
        const maisAntiga = lembradas.values().next().value;
        if (maisAntiga !== undefined) lembradas.delete(maisAntiga);
      }
    },
    lembra: (origem) => origem !== null && lembradas.has(origem),
    total: () => total,
  };
}
