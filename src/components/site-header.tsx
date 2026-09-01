"use client";

import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { useCallback, useEffect, useRef, useState } from "react";
import { NAV_BLOG, NAV_GROUPS, NAV_HOME } from "@/lib/nav";

export function SiteHeader() {
  const [open, setOpen] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [accordion, setAccordion] = useState<string | null>(NAV_GROUPS[0].label);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  }, [cancelClose]);

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
      className="sticky top-0 z-50 border-b border-rule bg-paper"
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6 lg:h-[88px] lg:px-10">
        <Link href="/home" className="shrink-0" aria-label="Podoposture">
          <BrandMark className="h-[38px] w-auto lg:h-[52px]" />
        </Link>

        {/* Desktop */}
        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            <li>
              <Link
                href={NAV_HOME.href}
                className="block px-3 py-2 text-[0.9375rem] text-ink transition-colors hover:text-accent"
                onMouseEnter={() => setOpen(null)}
              >
                {NAV_HOME.label}
              </Link>
            </li>

            {NAV_GROUPS.map((group) => {
              const isOpen = open === group.label;
              return (
                <li key={group.label}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onMouseEnter={() => {
                      cancelClose();
                      setOpen(group.label);
                    }}
                    onFocus={() => setOpen(group.label)}
                    onClick={() => setOpen(isOpen ? null : group.label)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[0.9375rem] transition-colors ${
                      isOpen ? "text-accent" : "text-ink hover:text-accent"
                    }`}
                  >
                    {group.label}
                    <svg
                      width="9"
                      height="6"
                      viewBox="0 0 9 6"
                      aria-hidden="true"
                      className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                className="block px-3 py-2 text-[0.9375rem] text-ink transition-colors hover:text-accent"
                onMouseEnter={() => setOpen(null)}
              >
                {NAV_BLOG.label}
              </Link>
            </li>
          </ul>
        </nav>

        {/* Painel do mega-menu */}
        {activeGroup && (
          <div
            className="absolute inset-x-0 top-full hidden border-b border-rule bg-paper shadow-[0_18px_40px_-32px_rgba(13,37,54,0.45)] lg:block"
            onMouseEnter={cancelClose}
          >
            <div className="mx-auto max-w-[1240px] px-10 py-8">
              <p
                className="mb-5 flex items-center gap-3 text-[0.6875rem] tracking-[0.16em] text-muted uppercase"
                style={{ fontFamily: "var(--mono)" }}
              >
                <span className="text-accent">
                  {String(
                    NAV_GROUPS.findIndex((g) => g.label === activeGroup.label) + 1,
                  ).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="h-px w-8 bg-rule" />
                {activeGroup.label}
              </p>
              <ul className="grid grid-cols-4 gap-x-8 gap-y-1">
                {activeGroup.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(null)}
                      className="group flex items-baseline gap-3 border-b border-transparent py-2.5 text-[0.9375rem] text-ink transition-colors hover:border-rule hover:text-accent"
                    >
                      <span className="h-px w-4 shrink-0 translate-y-[-0.3em] bg-rule transition-all duration-200 group-hover:w-6 group-hover:bg-accent" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Mobile */}
        <button
          type="button"
          onClick={() => setDrawer((v) => !v)}
          aria-expanded={drawer}
          aria-label={drawer ? "Fechar menu" : "Abrir menu"}
          className="-mr-2 flex h-11 w-11 items-center justify-center lg:hidden"
        >
          <span className="relative block h-4 w-6">
            <span
              className={`absolute left-0 block h-px w-6 bg-ink transition-all duration-200 ${
                drawer ? "top-2 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute top-2 left-0 block h-px w-6 bg-ink transition-opacity duration-200 ${
                drawer ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-6 bg-ink transition-all duration-200 ${
                drawer ? "top-2 -rotate-45" : "top-4"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Drawer mobile */}
      {drawer && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-rule bg-paper lg:hidden">
          <nav aria-label="Principal" className="px-6 py-6">
            <Link
              href={NAV_HOME.href}
              onClick={() => setDrawer(false)}
              className="block border-b border-rule py-3.5 text-ink"
            >
              {NAV_HOME.label}
            </Link>

            {NAV_GROUPS.map((group) => {
              const isOpen = accordion === group.label;
              return (
                <div key={group.label} className="border-b border-rule">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setAccordion(isOpen ? null : group.label)}
                    className="flex w-full items-center justify-between py-3.5 text-left text-ink"
                  >
                    {group.label}
                    <svg
                      width="11"
                      height="7"
                      viewBox="0 0 9 6"
                      aria-hidden="true"
                      className={`text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                      {group.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setDrawer(false)}
                            className="flex items-baseline gap-3 py-2 text-[0.9375rem] text-muted"
                          >
                            <span className="h-px w-3 shrink-0 translate-y-[-0.3em] bg-rule" />
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            <Link
              href={NAV_BLOG.href}
              onClick={() => setDrawer(false)}
              className="block border-b border-rule py-3.5 text-ink"
            >
              {NAV_BLOG.label}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
