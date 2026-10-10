import { describe, expect, it } from "vitest";

import { ETAPAS_DO_ATENDIMENTO } from "./atendimento";
import { NAV_GROUPS } from "./nav";

describe("como e o meu atendimento", () => {
  it("as oito etapas, na ordem e sem numero no titulo", () => {
    expect(ETAPAS_DO_ATENDIMENTO).toHaveLength(8);
    expect(ETAPAS_DO_ATENDIMENTO[0].titulo).toBe("Primeiro, compreender a sua história");
    expect(ETAPAS_DO_ATENDIMENTO[7].titulo).toBe("Integração com outros profissionais");
    for (const e of ETAPAS_DO_ATENDIMENTO) expect(e.titulo).not.toMatch(/^\d/);
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
