import express from "express";

const PORT = 3001;
const app = express();

// Ruta gratis: cualquiera la puede pedir.
app.get("/dato", (_, res) =>
  res.json({ dato: "El código HTTP 402 significa Payment Required", gratis: true }),
);

app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}/dato`));
