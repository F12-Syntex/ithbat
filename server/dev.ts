import "dotenv/config";
import { createServer } from "http";

import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";

import researchRouter from "./routes/research";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API Routes (before Vite middleware)
  app.use("/api", researchRouter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  // Use Vite's connect instance as middleware
  app.use(vite.middlewares);

  // Create HTTP server and handle WebSocket upgrades for Vite HMR
  const httpServer = createServer(app);

  httpServer.on("upgrade", (req, socket, head) => {
    if (vite.ws.handleUpgrade(req, socket, head)) {
      return;
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`\n  Ithbat running at http://localhost:${PORT}\n`);
  });
}

startServer();
