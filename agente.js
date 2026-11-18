import { wrapFetchWithPayment, x402Client, decodePaymentResponseHeader } from "@x402/fetch";
import { createEd25519Signer } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

const API_URL = "http://localhost:3001/dato";
const NETWORK = "stellar:testnet";

async function main() {
  const signer = createEd25519Signer(process.env.AGENTE_SECRETA, NETWORK);
  const client = new x402Client().register(NETWORK, new ExactStellarScheme(signer));
  const fetchConPago = wrapFetchWithPayment(fetch, client);

  console.log(`Agente (${signer.address}) consultando ${API_URL}...`);
  const response = await fetchConPago(API_URL);
  const data = await response.json();

  const paymentHeader = response.headers.get("payment-response");
  if (paymentHeader) {
    const settlement = decodePaymentResponseHeader(paymentHeader);
    console.log("Pago liquidado:", JSON.stringify(settlement));
  }

  console.log(`Respuesta (${response.status}):`, data);
}

main().catch((err) => {
  console.error("Error en el agente:", err.message || err);
  process.exit(1);
});
