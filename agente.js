import { Horizon } from "@stellar/stellar-sdk";
import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const API_URL = "http://localhost:3001/dato";
const NETWORK = "stellar:testnet";
const TOPE = process.env.TOPE || "$0.02";
const MIN_USDC = 0.02;
const MAX_REINTENTOS = 3;

const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

async function saldoUSDC(publicKey) {
  const account = await horizon.loadAccount(publicKey);
  const usdc = account.balances.find(
    (b) => b.asset_code === "USDC" && b.asset_issuer === "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  );
  return usdc ? parseFloat(usdc.balance) : 0;
}

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const signer = createEd25519Signer(process.env.AGENTE_SECRETA, NETWORK);
  console.log(`Agente: ${signer.address}`);
  console.log(`Tope por pago: ${TOPE}`);

  const saldo = await saldoUSDC(signer.address);
  console.log(`Saldo actual del agente: ${saldo} USDC`);

  if (saldo < MIN_USDC) {
    console.error(`Saldo insuficiente (${saldo} USDC < ${MIN_USDC} USDC). No se firma ninguna transacción.`);
    process.exit(1);
  }

  const client = x402Client.fromConfig({
    schemes: [{ network: NETWORK, client: new ExactStellarScheme(signer) }],
    spendControls: { maxAmountPerPayment: TOPE },
  });
  const fetchConPago = wrapFetchWithPayment(fetch, client);

  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      console.log(`Intento ${intento}/${MAX_REINTENTOS}: consultando ${API_URL}...`);
      const response = await fetchConPago(API_URL);
      const data = await response.json();

      const paymentHeader = response.headers.get("payment-response");
      if (paymentHeader) {
        const settlement = decodePaymentResponseHeader(paymentHeader);
        console.log("Settlement response:", JSON.stringify(settlement));
        console.log(`Hash de transacción: ${settlement.transaction}`);
        console.log(`Ver en Stellar Expert: https://stellar.expert/explorer/testnet/tx/${settlement.transaction}`);
      }

      console.log(`Respuesta (${response.status}):`, data);
      return;
    } catch (error) {
      const msg = error?.message || String(error);
      if (msg.includes("spendControls")) {
        console.log(`Pago rechazado sin transacción: el cobro excede el tope de ${TOPE} (${msg})`);
        return;
      }
      console.warn(`Intento ${intento} falló: ${msg}`);
      if (intento < MAX_REINTENTOS) {
        await esperar(1500);
      } else {
        console.error("La API no respondió tras 3 intentos. Saliendo de forma controlada sin pagar a ciegas.");
        process.exitCode = 1;
      }
    }
  }
}

main();
