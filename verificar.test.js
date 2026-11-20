import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verificar } from "./verificar.js";

// El pago más reciente de tu README (el que hizo tu agente hoy)
const hashes = readFileSync("README.md", "utf8").match(/[0-9a-f]{64}/g);
const HASH = hashes[hashes.length - 1];
const YO = process.env.MI_PUBLICA;

test("acepta el pago correcto: 0.01 USDC a tu cuenta", async () => {
  const r = await verificar(HASH, { destino: YO, monto: "0.01" });
  assert.equal(r.ok, true, r.motivos.join("; "));
});

test("rechaza si el monto no es el esperado", async () => {
  const r = await verificar(HASH, { destino: YO, monto: "0.05" });
  assert.equal(r.ok, false);
  assert.match(r.motivos.join(), /monto/);
});

test("rechaza si el destinatario no es el esperado", async () => {
  const r = await verificar(HASH, { destino: process.env.AMIGO_PUBLICA, monto: "0.01" });
  assert.equal(r.ok, false);
  assert.match(r.motivos.join(), /destinatario/);
});

test("rechaza un hash que no existe", async () => {
  const r = await verificar("0".repeat(64), { destino: YO, monto: "0.01" });
  assert.equal(r.ok, false);
});
