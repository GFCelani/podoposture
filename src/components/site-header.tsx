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

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  }, [cancelClose]);

  // Compactacao e regua de progresso na mesma leitura de scroll, em rAF.
  useEffect(() => {
    let pedido = 0;
    const ler = () => {
      pedido = 0;
      const y = window.scrollY;
      setRolou(y > 24);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, y / total) : 0;
      if (progresso.current) {
        progresso.current.style.transform = `scaleX(${p.toFixed(4)})`;
      }
    };
    const onScroll = () => {
      if (!pedido) pedido = requestAnimationFrame(ler);
    };
    ler();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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

  const activeGroup = NAV_GROUPS.find((g) => g.label === open) ?? null;

  return (
    // Sem backdrop-filter: ele tornaria o header bloco contentor dos
    // descendentes fixed e o drawer mobile nasceria com altura zero.
    <header
      className={`sticky top-0 z-50 border-b bg-paper transition-[border-color,box-shadow] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] ${
        rolou ? "border-rule shadow-plate" : "border-rule/60"
      }`}
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      <div
        className={`mx-auto flex max-w-[1240px] items-center justify-between px-6 transition-[height] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] lg:px-10 ${
          rolou ? "h-14 lg:h-[68px]" : "h-16 lg:h-[92px]"
        }`}
      >
        <Link
          href="/home"
          className="shrink-0 rounded-sm"
          aria-label="Podoposture"
        >
          <BrandMark
            className={`w-auto transition-[height] duration-[260ms] ease-[cubic-bezier(0.22,0.7,0.28,1)] ${
              rolou ? "h-8 lg:h-10" : "h-[38px] lg:h-[52px]"
            }`}
          />
        </Link>

        {/* Desktop */}
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <Link
                href={NAV_HOME.href}
                className="sublinha block rounded-sm px-3 py-2 text-[0.9375rem] text-ink transition-colors duration-[160ms] hover:text-accent"
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
                    onMouseEnter={() => {
                      cancelClose();
                      setOpen(group.label);
                    }}
                    onFocus={() => setOpen(group.label)}
                    onClick={() => setOpen(isOpen ? null : group.label)}
                    className={`sublinha flex items-center gap-1.5 rounded-sm px-3 py-2 text-[0.9375rem] transition-colors duration-[160ms] ${
                      isOpen ? "text-accent" : "text-ink hover:text-accent"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`text-[0.625rem] tracking-[0.14em] transition-colors duration-[160ms] ${
                        isOpen ? "text-accent" : "text-muted/70"
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
                className="sublinha block rounded-sm px-3 py-2 text-[0.9375rem] text-ink transition-colors duration-[160ms] hover:text-accent"
                onMouseEnter={() => setOpen(null)}
              >
                {NAV_BLOG.label}
              </Link>
            </li>
          </ul>
        </nav>

        {/* Painel do mega-menu: placa flutuante, nao faixa de ponta a ponta */}
        {activeGroup && (
          <div
            className="absolute inset-x-0 top-full hidden px-6 lg:block lg:px-10"
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
                    {String(
                      NAV_GROUPS.findIndex((g) => g.label === activeGroup.label) + 1,
                    ).padStart(2, "0")}
                  </p>
                  <p className="mt-4 font-display text-[1.5rem] leading-[1.2] font-semibold tracking-[-0.018em] text-ink">
                    {activeGroup.label}
                  </p>
                  <span
                    aria-hidden="true"
                    className="mt-5 block h-px w-12 bg-accent/50"
                  />
                </div>

                {/* Itens */}
                <ul className="col-span-9 grid grid-cols-3 gap-x-2 gap-y-0.5 p-6">
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
          type="button"
          onClick={() => setDrawer((v) => !v)}
          aria-expanded={drawer}
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
      </div>

      {/* Regua de ticks: instrumento do site, so no topo da pagina */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-1.5 transition-opacity duration-[420ms] ${rolou ? "opacity-0" : "opacity-100"}`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, var(--color-rule) 0 1px, transparent 1px 22px)",
          maskImage:
            "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)",
        }}
      />

      {/* Progresso de leitura: a mesma logica de medida do resto do site */}
      <span
        ref={progresso}
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-accent"
      />

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-x-0 top-14 bottom-0 z-40 overflow-y-auto border-t border-rule bg-paper lg:hidden">
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
                    onClick={() => setAccordion(isOpen ? null : group.label)}
                    className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-ink"
                  >
                    <span className="flex items-baseline gap-3">
                      <span
                        aria-hidden="true"
                        className="text-[0.625rem] tracking-[0.14em] text-muted/70"
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
                    <ul className="pb-3">
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
