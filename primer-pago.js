import { Horizon, Keypair, Asset, Operation, TransactionBuilder, Networks, Memo } from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const usdcAsset = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

async function main() {
  const miPublica = process.env.MI_PUBLICA;
  const miSecreta = process.env.MI_SECRETA;
  const amigoPublica = process.env.AMIGO_PUBLICA;

  if (!miPublica || !miSecreta || !amigoPublica) {
    throw new Error("Variables de entorno requeridas no encontradas.");
  }

  const miKeypair = Keypair.fromSecret(miSecreta);
  const account = await server.loadAccount(miKeypair.publicKey());
  const timebounds = await server.fetchTimebounds(300);
  const baseFee = await server.fetchBaseFee();

  const transaction = new TransactionBuilder(account, {
    fee: baseFee,
    networkPassphrase: Networks.TESTNET,
    timebounds,
  })
    .addOperation(
      Operation.payment({
        destination: amigoPublica,
        asset: usdcAsset,
        amount: "1",
      })
    )
    .addMemo(Memo.text("Codigo 402 - mi primer pago"))
    .build();

  transaction.sign(miKeypair);

  console.log(`Enviando 1 USDC desde ${miPublica} hacia ${amigoPublica}...`);
  const result = await server.submitTransaction(transaction);
  console.log("Transacción completada exitosamente.");
  console.log(`Hash: ${result.hash}`);
}

main().catch((err) => {
  console.error("Error en primer-pago:", err?.response?.data || err.message || err);
  process.exit(1);
});
