"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { NAV_BLOG, NAV_GROUPS, NAV_HOME } from "@/lib/nav";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [rolou, setRolou] = useState(false);
  const [accordion, setAccordion] = useState<string | null>(NAV_GROUPS[0].label);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progresso = useRef<HTMLSpanElement>(null);
  const botaoDrawer = useRef<HTMLButtonElement>(null);
  const painelDrawer = useRef<HTMLDivElement>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  }, [cancelClose]);

  // Compactacao e regua de progresso na mesma leitura de scroll, em rAF.
  // O alcance rolavel fica em cache: scrollHeight e innerHeight so mudam
  // quando o layout muda, mas le-los dentro do rAF obrigava o navegador a
  // recalcular layout em TODO frame de scroll. O ResizeObserver cobre o
  // conteudo que cresce (imagem que chega, acordeao que abre) e o resize
  // cobre a janela; o comportamento visual e' o mesmo.
  useEffect(() => {
    let pedido = 0;
    let alcance = 0;
    const medir = () => {
      alcance = document.documentElement.scrollHeight - window.innerHeight;
    };
    const ler = () => {
      pedido = 0;
      const y = window.scrollY;
      setRolou(y > 24);
      const p = alcance > 0 ? Math.min(1, y / alcance) : 0;
      if (progresso.current) {
        progresso.current.style.transform = `scaleX(${p.toFixed(4)})`;
      }
    };
    const agendar = () => {
      if (!pedido) pedido = requestAnimationFrame(ler);
    };
    const remedir = () => {
      medir();
      agendar();
    };
    medir();
    ler();
    const observador = new ResizeObserver(remedir);
    observador.observe(document.documentElement);
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", remedir);
    return () => {
      observador.disconnect();
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", remedir);
      if (pedido) cancelAnimationFrame(pedido);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawer]);

  // Com o drawer aberto ele passa a ser o unico conteudo alcancavel. Sem
  // isso o Tab escapa do menu e passeia pela pagina que ficou atras: coberta
  // para o mouse, mas viva para o teclado e para o leitor de tela.
  useEffect(() => {
    if (!drawer) return;
    const painel = painelDrawer.current;
    if (!painel) return;
    // capturado agora, e nao lido no cleanup: a ref pode ja ter sido
    // desmontada quando a limpeza roda, e ai o foco nao voltaria para lugar nenhum
    const gatilho = botaoDrawer.current;

    // Fica de fora o ramo que contem o proprio drawer — a comparacao e' por
    // contains, e nao pela tag do header, para o inert nao se voltar contra o
    // menu se alguma pagina envolver o cabecalho num wrapper. O portal do
    // Next tambem escapa, senao o overlay de erro do dev pararia de responder.
    const fundo = Array.from(document.body.children).filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement &&
        !el.contains(painel) &&
        el.tagName.toLowerCase() !== "nextjs-portal",
    );
    fundo.forEach((el) => el.setAttribute("inert", ""));

    // Foco no painel, nao no primeiro link: quem abriu o menu ainda esta
    // escolhendo para onde ir, e o leitor de tela anuncia o dialogo inteiro.
    painel.focus();

    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const lista = Array.from(
        painel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      );
      if (lista.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const ativo = document.activeElement;
      if (!painel.contains(ativo)) {
        e.preventDefault();
        (e.shiftKey ? ultimo : primeiro).focus();
      } else if (e.shiftKey && ativo === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", onTab);

    return () => {
      document.removeEventListener("keydown", onTab);
      fundo.forEach((el) => el.removeAttribute("inert"));
      // O foco volta para o hamburguer porque foi dele que o drawer saiu:
      // fechando por Esc o foco cairia no <body> e a navegacao por teclado
      // recomecaria do topo da pagina, longe de onde a pessoa estava.
      gatilho?.focus();
    };
  }, [drawer]);

  const activeGroup = NAV_GROUPS.find((g) => g.label === open) ?? null;
  const activeIndex = activeGroup ? NAV_GROUPS.indexOf(activeGroup) : -1;

  return (
    // Sem backdrop-filter: ele tornaria o header bloco contentor dos
    // descendentes fixed e o drawer mobile nasceria com altura zero.
    <header
      className="fixed inset-x-0 top-0 z-50 px-3 pt-4 lg:px-6 lg:pt-6"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      {/* Sem grade aqui de proposito. A grade e' camada de fundo: o cabecalho
          e' chapa opaca por cima dela, nao superficie que ela atravessa. Com a
          camada dentro do header os fios passavam sobre o logo e o menu, ja
          que logo e nav sao estaticos e camada absoluta pinta depois. */}
      <div
        className={`relative mx-auto flex h-16 max-w-none items-center justify-between rounded-[14px] border bg-paper px-5 transition-[max-width,border-color,box-shadow] duration-[420ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] md:px-7 lg:grid lg:h-[74px] lg:grid-cols-[1fr_auto_1fr] lg:px-7 ${
          rolou
            ? "border-rule shadow-lift lg:max-w-[1160px]"
            : "border-rule/60 shadow-plate lg:max-w-[1359px]"
        }`}
      >
        <Link
          href="/home"
          className="shrink-0 rounded-sm lg:justify-self-start"
          aria-label="Podoposture"
        >
          {/* A marca cresceu de 36/40/42 para 44/48/54 (2026-09-05). O teto nao
              e' o cabecalho, e' a largura de 1024: la o menu completo ocupa
              577px, o CTA 159, e o contentor da' 905. Com 48 de altura a marca
              mede 145 de largura e sobram 31px de folga entre as tres pecas;
              com 54 sobrariam 13, e com 58 o menu encostaria. Em 1280 a folga
              com 54 e' de 92px. Se o menu ganhar item ou o CTA mudar de
              rotulo, e' o numero de 1024 que tem de ser remedido antes de
              crescer mais. */}
          <BrandMark className="h-11 w-auto lg:h-12 xl:h-[54px]" />
        </Link>

        {/* Desktop */}
        <nav
          aria-label="Principal"
          className="hidden lg:block lg:justify-self-center"
        >
          <ul className="flex items-center gap-0 xl:gap-1">
            <li>
              <Link
                href={NAV_HOME.href}
                className="sublinha block rounded-sm px-1.5 py-2 text-[0.875rem] xl:px-3 xl:text-[1rem] text-ink transition-colors duration-[160ms] hover:text-accent"
                onMouseEnter={() => setOpen(null)}
              >
                {NAV_HOME.label}
              </Link>
            </li>

            {NAV_GROUPS.map((group, i) => {
              const isOpen = open === group.label;
              return (
                <li key={group.label} className={isOpen ? "grupo-aberto" : ""}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`mega-menu-${i}`}
                    onMouseEnter={() => {
                      cancelClose();
                      setOpen(group.label);
                    }}
                    onFocus={() => setOpen(group.label)}
                    onClick={() => setOpen(isOpen ? null : group.label)}
                    className={`sublinha flex items-center gap-1.5 rounded-sm px-1.5 py-2 text-[0.875rem] xl:px-3 xl:text-[1rem] transition-colors duration-[160ms] ${
                      isOpen ? "text-accent" : "text-ink hover:text-accent"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-[0.5625rem] tracking-[0.16em] xl:text-[0.625rem] transition-colors duration-[160ms] ${
                        isOpen ? "text-accent" : "text-muted"
                      }`}
                      style={{ fontFamily: "var(--mono)" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {group.label}
                    <svg
                      width="9"
                      height="6"
                      viewBox="0 0 9 6"
                      aria-hidden="true"
                      className={`transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path
                        d="M1 1.2 4.5 4.6 8 1.2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}

            <li>
              <Link
                href={NAV_BLOG.href}
                className="sublinha block rounded-sm px-1.5 py-2 text-[0.875rem] xl:px-3 xl:text-[1rem] text-ink transition-colors duration-[160ms] hover:text-accent"
                onMouseEnter={() => setOpen(null)}
              >
                {NAV_BLOG.label}
              </Link>
            </li>

          </ul>
        </nav>

        {/* Sempre visivel, em qualquer scroll, e sem mudar de estado.
            Contorno em vez de preenchimento: le como controle sem disputar
            com o verde do hero. O verde so aparece no hover, pelo
            preenchimento que cresce do canto. Fora da lista do menu porque a
            coluna do meio e' so a navegacao: com o CTA dentro dela, o que
            ficaria centrado na chapa era o conjunto, e nao as secoes. */}
        <a
          href="https://wa.me/5521992035643"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-fill [--fill:var(--color-action)] hidden items-center gap-2 rounded-md border-[1.5px] border-ink/25 px-3 py-2 text-[0.75rem] xl:px-3.5 xl:py-2.5 xl:text-[0.875rem] font-medium whitespace-nowrap text-ink transition-[transform,box-shadow,color,border-color] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] hover:-translate-y-0.5 hover:border-action-deep/30 hover:text-ink-strong hover:shadow-tag active:translate-y-0 lg:inline-flex lg:justify-self-end"
        >
          Falar Sobre o Meu Caso
        </a>

        {/* Painel do mega-menu: placa flutuante, nao faixa de ponta a ponta */}
        {activeGroup && (
          <div
            id={`mega-menu-${activeIndex}`}
            className="absolute inset-x-0 top-full hidden px-6 lg:block md:px-8 lg:px-10"
            onMouseEnter={cancelClose}
          >
            <div className="painel-menu mx-auto mt-2 max-w-[1180px] overflow-hidden rounded-lg border border-rule bg-paper shadow-lift">
              <div className="grid grid-cols-12">
                {/* Coluna de identificacao do grupo */}
                <div className="col-span-3 border-r border-rule bg-surface p-8">
                  <p
                    className="text-[0.6875rem] tracking-[0.2em] text-accent"
                    style={{ fontFamily: "var(--mono)" }}
                  >
                    {String(activeIndex + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-4 font-display text-[1.5rem] leading-[1.2] font-semibold tracking-[-0.018em] text-ink-strong">
                    {activeGroup.label}
                  </p>
                  <span
                    aria-hidden="true"
                    className="mt-5 block h-px w-12 bg-accent/50"
                  />
                </div>

                {/* Itens */}
                <ul
                  className={`col-span-9 grid gap-x-2 gap-y-0.5 p-6 ${
                    activeGroup.items.length <= 4 ? "grid-cols-2" : "grid-cols-3"
                  }`}
                >
                  {activeGroup.items.map((item, i) => (
                    <li
                      key={item.href}
                      className="item-menu"
                      style={{ ["--i" as string]: i }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(null)}
                        className="group/it flex items-center justify-between gap-3 rounded-md px-4 py-3 text-[0.9375rem] text-ink transition-colors duration-[160ms] hover:bg-surface hover:text-accent"
                      >
                        <span className="flex items-baseline gap-3">
                          <span
                            aria-hidden="true"
                            className="h-px w-0 shrink-0 translate-y-[-0.3em] bg-accent transition-all duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/it:w-4"
                          />
                          {item.label}
                        </span>
                        <svg
                          width="13"
                          height="9"
                          viewBox="0 0 13 9"
                          aria-hidden="true"
                          className="shrink-0 -translate-x-1 opacity-0 transition-all duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/it:translate-x-0 group-hover/it:opacity-100"
                        >
                          <path
                            d="M0 4.5h11M7.6 1 11.4 4.5 7.6 8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          />
                        </svg>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Mobile */}
        <button
          ref={botaoDrawer}
          type="button"
          onClick={() => setDrawer((v) => !v)}
          aria-expanded={drawer}
          aria-controls="menu-mobile"
          aria-label={drawer ? "Fechar menu" : "Abrir menu"}
          className="group/menu -mr-2 flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-[160ms] hover:bg-surface lg:hidden"
        >
          <span className="relative block h-4 w-6">
            <span
              className={`absolute left-0 block h-px w-6 bg-ink transition-all duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/menu:bg-accent ${
                drawer ? "top-2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute top-2 left-0 block h-px w-6 bg-ink transition-all duration-[260ms] group-hover/menu:bg-accent ${
                drawer ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-6 bg-ink transition-all duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] group-hover/menu:bg-accent ${
                drawer ? "top-2 -rotate-45" : "top-4"
              }`}
            />
          </span>
        </button>

        {/* Fio de assinatura: hairline azul, com um pulso de luz verde
            percorrendo a linha em loop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden rounded-b-[14px]"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, transparent 4%, color-mix(in srgb, var(--color-accent) 22%, transparent) 30%, color-mix(in srgb, var(--color-accent) 22%, transparent) 70%, transparent 96%)",
            }}
          />
          <div
            className="fio-pulso absolute inset-y-0 w-[16%]"
            style={{
              background:
                "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-action) 68%, transparent) 50%, transparent)",
            }}
          />
        </div>

        {/* Progresso de leitura: a mesma logica de medida do resto do site */}
        <span
          ref={progresso}
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 rounded-b-[14px] bg-accent"
        />

      </div>

      {/* Drawer mobile */}
      {drawer && (
        <div
          ref={painelDrawer}
          id="menu-mobile"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          /* O topo acompanha a altura real do cabecalho, que encolhe ao rolar.
             Fixo em top-14 (56px), o drawer aberto sem rolagem ficava 8px
             debaixo do cabecalho de 64px — o primeiro item do menu nascia
             parcialmente coberto. */
          className="fixed inset-x-0 top-[80px] bottom-0 z-40 overflow-y-auto border-t border-rule bg-paper focus:outline-none lg:hidden"
        >
          <nav aria-label="Principal" className="px-6 py-6">
            <div className="item-menu" style={{ ["--i" as string]: 0 }}>
              <Link
                href={NAV_HOME.href}
                onClick={() => setDrawer(false)}
                className="block border-b border-rule py-3.5 text-ink"
              >
                {NAV_HOME.label}
              </Link>
            </div>

            {NAV_GROUPS.map((group, gi) => {
              const isOpen = accordion === group.label;
              return (
                <div
                  key={group.label}
                  className="item-menu border-b border-rule"
                  style={{ ["--i" as string]: gi + 1 }}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`grupo-mobile-${gi}`}
                    onClick={() => setAccordion(isOpen ? null : group.label)}
                    className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-ink"
                  >
                    <span className="flex items-baseline gap-3">
                      <span
                        aria-hidden="true"
                        className="text-[0.625rem] tracking-[0.14em] text-muted"
                        style={{ fontFamily: "var(--mono)" }}
                      >
                        {String(gi + 1).padStart(2, "0")}
                      </span>
                      {group.label}
                    </span>
                    <svg
                      width="11"
                      height="7"
                      viewBox="0 0 9 6"
                      aria-hidden="true"
                      className={`text-muted transition-transform duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path
                        d="M1 1.2 4.5 4.6 8 1.2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </button>
                  {isOpen && (
                    <ul id={`grupo-mobile-${gi}`} className="pb-3">
                      {group.items.map((item, i) => (
                        <li
                          key={item.href}
                          className="item-menu"
                          style={{ ["--i" as string]: i }}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setDrawer(false)}
                            className="flex items-baseline gap-3 rounded-md px-2 py-2 text-[0.9375rem] text-muted transition-colors duration-[160ms] hover:bg-surface hover:text-accent"
                          >
                            <span
                              aria-hidden="true"
                              className="h-px w-3 shrink-0 translate-y-[-0.3em] bg-rule"
                            />
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            <div
              className="item-menu"
              style={{ ["--i" as string]: NAV_GROUPS.length + 1 }}
            >
              <Link
                href={NAV_BLOG.href}
                onClick={() => setDrawer(false)}
                className="block border-b border-rule py-3.5 text-ink"
              >
                {NAV_BLOG.label}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
