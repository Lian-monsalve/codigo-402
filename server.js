import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

const PORT = 3001;
const ROUTE = "/dato";
const PRICE = "$0.01"; // precio en USDC
const NETWORK = "stellar:testnet";
const FACILITATOR_URL = "https://www.x402.org/facilitator";
const PAY_TO = process.env.MI_PUBLICA; // tu cuenta de la sesión 1 recibe el pago

const app = express();

// Información pública: qué ruta cobra, cuánto y en qué red.
app.get("/", (_, res) => res.json({ route: ROUTE, price: PRICE, network: NETWORK }));

// x402: sin pago, la ruta responde 402 con las instrucciones para pagar.
app.use(
  paymentMiddlewareFromConfig(
    {
      [`GET ${ROUTE}`]: {
        accepts: { scheme: "exact", price: PRICE, network: NETWORK, payTo: PAY_TO },
      },
    },
    new HTTPFacilitatorClient({ url: FACILITATOR_URL }),
    [{ network: NETWORK, server: new ExactStellarScheme() }],
  ),
);

// Esto solo se entrega cuando el pago ya se verificó y se liquidó.
app.get(ROUTE, (_, res) =>
  res.json({ dato: "El código HTTP 402 significa Payment Required", pagado: true }),
);

app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}${ROUTE}`));
