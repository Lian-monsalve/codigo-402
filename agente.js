import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const API_URL = "http://localhost:3001/dato";
const NETWORK = "stellar:testnet";
const TOPE = process.env.TOPE || "$0.02";

async function main() {
  const signer = createEd25519Signer(process.env.AGENTE_SECRETA, NETWORK);
  const client = x402Client.fromConfig({
    schemes: [{ network: NETWORK, client: new ExactStellarScheme(signer) }],
    spendControls: { maxAmountPerPayment: TOPE },
  });
  const fetchConPago = wrapFetchWithPayment(fetch, client);

  console.log(`Agente (${signer.address}) | Tope por pago: ${TOPE}`);

  try {
    const response = await fetchConPago(API_URL);
    const data = await response.json();

    const paymentHeader = response.headers.get("payment-response");
    if (paymentHeader) {
      const settlement = decodePaymentResponseHeader(paymentHeader);
      console.log("Pago liquidado:", JSON.stringify(settlement));
    }

    console.log(`Respuesta (${response.status}):`, data);
  } catch (error) {
    console.log(`Pago rechazado/ignorado porque excede el tope (${TOPE}): ${error.message}`);
  }
}

main();
