import { Horizon, Keypair, Asset, Operation, TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import fs from "fs";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const usdcAsset = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

async function main() {
  const miSecreta = process.env.MI_SECRETA;
  if (!miSecreta) {
    throw new Error("MI_SECRETA no encontrada en .env");
  }
  const miKeypair = Keypair.fromSecret(miSecreta);

  console.log("Generando keypair para el agente...");
  const agenteKeypair = Keypair.random();
  console.log(`Cuenta pública del agente (AGENTE_PUBLICA): ${agenteKeypair.publicKey()}`);

  console.log("Fondeando cuenta del agente con Friendbot...");
  await server.friendbot(agenteKeypair.publicKey()).call();
  console.log("Cuenta del agente fondeada con XLM.");

  const baseFee = await server.fetchBaseFee();

  console.log("Estableciendo trustline USDC para el agente...");
  const agenteAccount = await server.loadAccount(agenteKeypair.publicKey());
  const timebounds1 = await server.fetchTimebounds(300);
  const trustTx = new TransactionBuilder(agenteAccount, {
    fee: baseFee,
    networkPassphrase: Networks.TESTNET,
    timebounds: timebounds1,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .build();

  trustTx.sign(agenteKeypair);
  await server.submitTransaction(trustTx);
  console.log("Trustline USDC establecido para el agente.");

  console.log("Transfiriendo 0.05 USDC desde mi cuenta hacia el agente...");
  const miAccount = await server.loadAccount(miKeypair.publicKey());
  const timebounds2 = await server.fetchTimebounds(300);
  const payTx = new TransactionBuilder(miAccount, {
    fee: baseFee,
    networkPassphrase: Networks.TESTNET,
    timebounds: timebounds2,
  })
    .addOperation(
      Operation.payment({
        destination: agenteKeypair.publicKey(),
        asset: usdcAsset,
        amount: "0.05",
      }),
    )
    .build();

  payTx.sign(miKeypair);
  const result = await server.submitTransaction(payTx);
  console.log(`Transferencia de 0.05 USDC completada. Hash: ${result.hash}`);

  let envContent = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
  envContent = envContent
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "" && !line.startsWith("AGENTE_PUBLICA=") && !line.startsWith("AGENTE_SECRETA="))
    .join("\n");
  envContent += `\nAGENTE_PUBLICA=${agenteKeypair.publicKey()}\nAGENTE_SECRETA=${agenteKeypair.secret()}\n`;
  fs.writeFileSync(".env", envContent, "utf8");
  console.log("Llaves AGENTE_PUBLICA y AGENTE_SECRETA guardadas en .env.");
}

main().catch((err) => {
  console.error("Error en crear-agente:", err?.response?.data || err.message || err);
  process.exit(1);
});
