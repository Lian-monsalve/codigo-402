import { Horizon, Keypair, Asset, Operation, TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import fs from "fs";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const usdcAsset = new Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");

async function main() {
  console.log("Generando keypairs aleatorios...");
  const miKeypair = Keypair.random();
  const amigoKeypair = Keypair.random();

  console.log(`Mi cuenta pública: ${miKeypair.publicKey()}`);
  console.log(`Cuenta pública amigo: ${amigoKeypair.publicKey()}`);

  console.log("Fondeando cuentas con Friendbot...");
  await server.friendbot(miKeypair.publicKey()).call();
  await server.friendbot(amigoKeypair.publicKey()).call();
  console.log("Cuentas fondeadas exitosamente con XLM.");

  const baseFee = await server.fetchBaseFee();

  console.log("Estableciendo trustline USDC para Mi Cuenta...");
  const miAccount = await server.loadAccount(miKeypair.publicKey());
  const miTimebounds = await server.fetchTimebounds(300);
  const miTx = new TransactionBuilder(miAccount, {
    fee: baseFee,
    networkPassphrase: Networks.TESTNET,
    timebounds: miTimebounds,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .build();

  miTx.sign(miKeypair);
  await server.submitTransaction(miTx);
  console.log("Trustline USDC establecido para Mi Cuenta.");

  console.log("Estableciendo trustline USDC para Cuenta Amigo...");
  const amigoAccount = await server.loadAccount(amigoKeypair.publicKey());
  const amigoTimebounds = await server.fetchTimebounds(300);
  const amigoTx = new TransactionBuilder(amigoAccount, {
    fee: baseFee,
    networkPassphrase: Networks.TESTNET,
    timebounds: amigoTimebounds,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .build();

  amigoTx.sign(amigoKeypair);
  await server.submitTransaction(amigoTx);
  console.log("Trustline USDC establecido para Cuenta Amigo.");

  const envContent = `MI_PUBLICA=${miKeypair.publicKey()}\nMI_SECRETA=${miKeypair.secret()}\nAMIGO_PUBLICA=${amigoKeypair.publicKey()}\nAMIGO_SECRETA=${amigoKeypair.secret()}\n`;
  fs.writeFileSync(".env", envContent, "utf8");
  console.log("Archivo .env creado exitosamente con las llaves de ambas cuentas.");
}

main().catch((err) => {
  console.error("Error en crear-cuentas:", err?.response?.data || err.message || err);
  process.exit(1);
});
