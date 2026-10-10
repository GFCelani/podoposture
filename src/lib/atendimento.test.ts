import { describe, expect, it } from "vitest";

import { ETAPAS_DO_ATENDIMENTO } from "./atendimento";
import { NAV_GROUPS } from "./nav";

describe("como e o meu atendimento", () => {
  it("as oito etapas, numeradas como a cliente escreveu", () => {
    expect(ETAPAS_DO_ATENDIMENTO.map((e) => e.numero)).toEqual(["1.", "2.", "3.", "4.", "5.", "6.", "7.", "8."]);
    expect(new Set(ETAPAS_DO_ATENDIMENTO.map((e) => e.id)).size).toBe(8);
    for (const e of ETAPAS_DO_ATENDIMENTO) expect(e.id).toMatch(/^[a-z0-9-]+$/);
  });

  it("todo recurso com link aponta para uma pagina que esta no menu", () => {
    const doMenu = new Set(NAV_GROUPS.flatMap((g) => g.items).map((i) => i.href.normalize("NFC")));
    const recursos = ETAPAS_DO_ATENDIMENTO.flatMap((e) => e.lista ?? []);
    expect(recursos).toHaveLength(7);
    for (const r of recursos) if (r.href) expect(doMenu.has(r.href.normalize("NFC")), r.href).toBe(true);
  });

  it("a pagina esta no menu", () => {
    const doMenu = NAV_GROUPS.flatMap((g) => g.items).map((i) => i.href);
    expect(doMenu).toContain("/como-e-o-meu-atendimento");
  });
});
