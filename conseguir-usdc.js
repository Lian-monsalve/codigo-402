import { Horizon, Keypair, Asset, Operation, TransactionBuilder, Networks } from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const usdcAsset = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

async function main() {
  const miPublica = process.env.MI_PUBLICA;
  const miSecreta = process.env.MI_SECRETA;

  if (!miPublica || !miSecreta) {
    throw new Error("Variables MI_PUBLICA o MI_SECRETA no encontradas en el entorno.");
  }

  const miKeypair = Keypair.fromSecret(miSecreta);

  console.log(`Evaluando ruta de pago estricto para ${miPublica}...`);
  const pathsResponse = await server
    .strictReceivePaths([Asset.native()], usdcAsset, "5")
    .call();

  if (!pathsResponse.records || pathsResponse.records.length === 0) {
    throw new Error("No se encontraron rutas disponibles para recibir 5 USDC.");
  }

  const bestPath = pathsResponse.records[0];
  console.log(`Ruta encontrada. Costo estimado en XLM: ${bestPath.source_amount}`);

  // Permitir hasta un 15% de holgura (slippage) para sendMax
  const sendMax = (parseFloat(bestPath.source_amount) * 1.15).toFixed(7);

  const intermediatePath = bestPath.path.map((p) =>
    p.asset_type === "native" ? Asset.native() : new Asset(p.asset_code, p.asset_issuer)
  );

  const account = await server.loadAccount(miKeypair.publicKey());
  const timebounds = await server.fetchTimebounds(300);
  const baseFee = await server.fetchBaseFee();

  const transaction = new TransactionBuilder(account, {
    fee: baseFee,
    networkPassphrase: Networks.TESTNET,
    timebounds,
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: sendMax,
        destination: miKeypair.publicKey(),
        destAsset: usdcAsset,
        destAmount: "5",
        path: intermediatePath,
      })
    )
    .build();

  transaction.sign(miKeypair);

  console.log("Enviando transacción pathPaymentStrictReceive...");
  const result = await server.submitTransaction(transaction);
  console.log(`¡Transacción exitosa! 5 USDC recibidos en ${miPublica}. Hash: ${result.hash}`);
}

main().catch((err) => {
  console.error("Error en conseguir-usdc:", err?.response?.data || err.message || err);
  process.exit(1);
});
