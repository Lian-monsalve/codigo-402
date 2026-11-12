import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer, getNetworkPassphrase } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

// Cliente de ejemplo oficial de Stellar (x402 Quickstart), con una sola diferencia:
// paga la cuenta de tu amigo de la sesión 1 (AMIGO_SECRETA, que tiene 1 USDC).
const STELLAR_PRIVATE_KEY = process.env.AMIGO_SECRETA;
const RESOURCE_SERVER_URL = "http://localhost:3001";
const ENDPOINT_PATH = "/dato";
const NETWORK = "stellar:testnet";
const STELLAR_RPC_URL = "https://soroban-testnet.stellar.org";

async function main() {
  const url = new URL(ENDPOINT_PATH, RESOURCE_SERVER_URL).toString();
  const signer = createEd25519Signer(STELLAR_PRIVATE_KEY, NETWORK);
  const rpcConfig = STELLAR_RPC_URL ? { url: STELLAR_RPC_URL } : undefined;
  const client = new x402Client().register("stellar:*", new ExactStellarScheme(signer, rpcConfig));
  const httpClient = new x402HTTPClient(client);
  console.log(`Target: ${url}\nClient address: ${signer.address}`);

  // 1. Pide sin pagar: la API responde 402 con las instrucciones.
  const firstTry = await fetch(url);
  console.log(`Payment requested: ${firstTry.status}`);
  const paymentRequired = httpClient.getPaymentRequiredResponse((name) => firstTry.headers.get(name));

  // 2. Arma y firma el pago con la llave del amigo.
  let paymentPayload = await client.createPaymentPayload(paymentRequired);
  const networkPassphrase = getNetworkPassphrase(NETWORK);
  const tx = new Transaction(paymentPayload.payload.transaction, networkPassphrase);
  const envelope = tx.toEnvelope();
  if (envelope.type !== "envelopeTypeTx") throw new Error("Expected a v1 transaction envelope");
  const txExt = envelope.value.tx.ext;
  const sorobanData = txExt.type === "sorobanData" ? txExt.value : undefined;
  
  if (sorobanData) {
    paymentPayload = {
      ...paymentPayload,
      payload: {
        ...paymentPayload.payload,
        transaction: TransactionBuilder.cloneFrom(tx, { fee: "1", sorobanData, networkPassphrase })
          .build()
          .toXDR(),
      },
    };
  }

  // 3. Vuelve a pedir, ahora con el pago firmado.
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
  const paidResponse = await fetch(url, { method: "GET", headers: paymentHeaders });
  const text = await paidResponse.text();
  const paymentResponse = httpClient.getPaymentSettleResponse((name) => paidResponse.headers.get(name));
  console.log("Settlement response:", JSON.stringify(paymentResponse));
  console.log(`Access Granted! ${paidResponse.status} "${text}"`);
}

main().catch((error) => {
  console.error("Client failed:", error);
  process.exit(1);
});
