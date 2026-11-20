import { rpc, Asset, Networks } from "@stellar/stellar-sdk";
import { fileURLToPath } from "node:url";

const RPC_URL = "https://soroban-testnet.stellar.org";
const server = new rpc.Server(RPC_URL);
// El contrato de USDC en testnet (el mismo USDC de las sesiones 1 a 3)
const USDC = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
const USDC_CONTRATO = USDC.contractId(Networks.TESTNET);

// Revisa en la red que el pago sea el que esperas. Devuelve { ok, motivos }.
export async function verificar(hash, { destino, monto }) {
  const motivos = [];
  const tx = await server.getTransaction(hash);
  if (tx.status !== "SUCCESS") return { ok: false, motivos: [`la transacción no está confirmada (${tx.status})`] };

  // Los eventos dicen lo que de verdad se movió: "transfer" de USDC, de quién, a quién y cuánto
  const eventos = JSON.parse(JSON.stringify(tx.events.contractEventsXdr)).flat();
  const pago = eventos.find((e) => e.body.v0.topics[0].symbol === "transfer");
  if (!pago) return { ok: false, motivos: ["no hay ninguna transferencia en esta transacción"] };

  const [, de, a] = pago.body.v0.topics.map((t) => t.address);
  const pagado = BigInt(pago.body.v0.data.i128); // en unidades de 7 decimales: 100000 = 0.01 USDC
  const esperado = BigInt(Math.round(Number(monto) * 1e7));

  if (pago.contract_id !== USDC_CONTRATO) motivos.push(`no es USDC: el contrato es ${pago.contract_id}`);
  if (a !== destino) motivos.push(`el destinatario es ${a}, no ${destino}`);
  if (pagado !== esperado) motivos.push(`el monto es ${Number(pagado) / 1e7} USDC, no ${monto}`);
  return { ok: motivos.length === 0, motivos, de, a, monto: Number(pagado) / 1e7 };
}

// Si lo corres desde la terminal: npm run verificar -- <hash>
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const hash = process.argv[2];
  if (!/^[0-9a-f]{64}$/.test(hash || "")) {
    console.log("Uso: npm run verificar -- <hash de 64 caracteres>");
    process.exit(1);
  }
  const destino = process.env.DESTINO || process.env.MI_PUBLICA; // por defecto: tu cuenta
  const monto = process.env.MONTO || "0.01"; // lo que cobra tu API
  console.log(`🔎 ${hash}\nEsperado: ${monto} USDC a ${destino}`);
  const r = await verificar(hash, { destino, monto });
  if (r.ok) {
    console.log(`✅ ACEPTADO: ${r.monto} USDC de ${r.de} a ${r.a}`);
  } else {
    console.log(`❌ RECHAZADO: ${r.motivos.join("; ")}`);
    process.exit(1);
  }
}
