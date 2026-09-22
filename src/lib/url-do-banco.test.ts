import postgres from "postgres";
import { describe, expect, it } from "vitest";

import { urlParaODriver } from "./url-do-banco";

describe("urlParaODriver", () => {
  it("tira o channel_binding que o Neon poe na URL e mantem o resto", () => {
    expect(
      urlParaODriver(
        "postgresql://neondb_owner:s3nh%40forte@ep-rapido-1234-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
      ),
    ).toBe(
      "postgresql://neondb_owner:s3nh%40forte@ep-rapido-1234-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require",
    );
  });

  it("URL sem o parametro volta intacta, byte a byte", () => {
    const url = "postgres://postgres:teste@localhost:55433/podoposture";
    expect(urlParaODriver(url)).toBe(url);
  });

  it("texto que nao e URL volta como veio (o driver e que reclama)", () => {
    expect(urlParaODriver("nao e url")).toBe("nao e url");
  });

  it("o driver nao manda mais channel_binding ao servidor", () => {
    const sql = postgres(
      urlParaODriver("postgresql://u:p@ep-x-pooler.neon.tech/neondb?sslmode=require&channel_binding=require"),
      { max: 1 },
    );
    expect(sql.options.connection).not.toHaveProperty("channel_binding");
    void sql.end({ timeout: 0 });
  });
});

const URL_DE_TESTE = process.env.DATABASE_URL_TESTE?.trim();

describe.skipIf(!URL_DE_TESTE)("contra um Postgres de verdade", () => {
  it("a URL no formato do Neon conecta depois do ajuste (e sem ele, nao)", async () => {
    const base = URL_DE_TESTE!.replace("@localhost:", "@127.0.0.1:");
    const doNeon = `${base}${base.includes("?") ? "&" : "?"}channel_binding=require`;

    const cru = postgres(doNeon, { max: 1, ssl: false, onnotice: () => {} });
    await expect(cru`SELECT 1`).rejects.toMatchObject({ code: "42704" });
    await cru.end({ timeout: 1 });

    const ajustado = postgres(urlParaODriver(doNeon), { max: 1, ssl: false, onnotice: () => {} });
    expect(await ajustado`SELECT 1 AS ok`).toEqual([{ ok: 1 }]);
    await ajustado.end({ timeout: 1 });
  });
});
