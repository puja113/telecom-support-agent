import "dotenv/config";
import express from "express";
import cors from "cors";
import { runAgent } from "./src/agent.js";
import { listMockCustomerIds } from "./src/tools.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

app.get("/api/customers", (req, res) => {
  res.json(listMockCustomerIds());
});

app.post("/api/chat", async (req, res) => {
  const { message, customerId, history } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.",
    });
  }

  try {
    const { reply, toolCalls } = await runAgent({ message, customerId, history });
    res.json({ reply, toolCalls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Agent failed to respond.", detail: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Telecom support agent backend running on http://localhost:${PORT}`);
});
