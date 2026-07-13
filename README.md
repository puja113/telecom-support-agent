# Signal — Telecom Support Agent

An agentic RAG assistant for telecom customer support: billing, plans, and
connectivity issues. Built for **The Talent Hack** (DTDL) Online Technical
Challenge.

The agent decides, per message, whether to:
- search an internal **FAQ/policy knowledge base** (RAG),
- call an **account tool** to look up a real customer's bill, plan, or WiFi status,
- or both — e.g. "why is my bill higher" needs the customer's actual charges
  *and* the billing-cycle policy that explains them.

Every tool call the agent makes is shown in the UI as a small trace chip, so
it's obvious when it's grounding an answer in real data versus policy docs.

## Architecture

```
telecom-support-agent/
  backend/           Express API + LangChain.js tool-calling agent
    src/
      agent.js        Agent setup: system prompt, tool binding, executor
      tools.js        4 tools: search_knowledge_base, check_bill, check_plan, check_wifi_status
      ragStore.js      Lightweight local retriever (TF/cosine similarity) over the FAQ docs
    data/
      faqs.json        Mock knowledge base (billing, plans, roaming, wifi, wallet, OTT)
      mockCustomers.json  3 mock customer accounts with bills/plans/wifi status
  frontend/           React (Vite) chat UI
```

**Why a local retriever instead of an embeddings API?** It keeps the whole
demo runnable with a single Gemini key — no second provider/API key needed
just to search 6 FAQ docs. It's a real vector-similarity search (term-frequency
vectors + cosine similarity), just computed locally instead of via an
embeddings endpoint. Swapping in `OpenAIEmbeddings` + `MemoryVectorStore` (or
Pinecone/Chroma) is a drop-in replacement in `ragStore.js` if you want to
extend this — worth mentioning in your demo as the natural next step.

**Why LangChain's `createToolCallingAgent`** rather than a hand-rolled loop:
it's the standard pattern the challenge explicitly lists (LangChain +
Agentic AI + tool use), and it keeps the reasoning loop (call tool → read
result → decide next step → respond) fully inspectable via
`returnIntermediateSteps`, which is what powers the trace chips in the UI.

## Running it

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env and add your GEMINI_API_KEY
npm start
```

Runs on `http://localhost:4000`. Health check: `GET /api/health`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and proxies `/api/*` to the backend.

### 3. Try it

Pick a mock customer in the sidebar, then ask things like:
- "Why is my bill higher this month?"
- "What plan am I on?"
- "My WiFi keeps dropping, what's going on?"
- "How do I turn on roaming before I travel?"

Compare answers across **CUST-1001** (has roaming charges + a wifi outage),
**CUST-1002** (clean bill, no issues), and **CUST-1003** (mid-cycle plan
upgrade proration) to see the agent ground answers in different accounts.

## Stretch ideas (if you have extra time before submitting)

- Add a `classify_intent` step with **LangGraph** before the agent runs, to
  route billing vs. technical vs. general questions differently — this is the
  most direct way to also demonstrate LangGraph specifically, since the
  current build only uses LangChain's agent executor.
- Swap the local retriever for real embeddings once you're not worried about
  needing a second API key.
- Persist chat history per customer (e.g. MongoDB, matching your usual stack)
  instead of keeping it in React state.

## Notes for the submission writeup

- **Problem**: telecom support at DTDL's scale (per their own numbers: ~18M
  concurrent subscribers, 200K orders/day) needs support that can ground
  answers in both policy *and* live account data, not just a generic FAQ bot.
- **Approach**: a LangChain tool-calling agent with 4 tools (1 RAG tool, 3
  account-lookup tools), so the agent — not a hardcoded if/else — decides what
  it needs to check.
- **What's mocked vs. real**: customer accounts and FAQ docs are mocked JSON
  (clearly swappable for a real CRM/billing API and a real vector DB); the
  agent reasoning and tool-calling loop is fully real, using Gemini via
  LangChain.js.
