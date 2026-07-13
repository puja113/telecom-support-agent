import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";


const SUGGESTIONS = [
  "Why is my bill higher this month?",
  "What plan am I on?",
  "My WiFi keeps dropping, what's going on?",
  "How do I turn on roaming before I travel?",
];

function SignalBar() {
  return (
    <span className="bar">
      <span />
      <span />
      <span />
    </span>
  );
}

function ToolTrace({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;
  return (
    <div className="trace">
      {toolCalls.map((t, i) => (
        <span className="trace-chip" key={i}>
          <SignalBar />
          {labelForTool(t.tool)}
        </span>
      ))}
    </div>
  );
}

function labelForTool(toolName) {
  switch (toolName) {
    case "search_knowledge_base":
      return "searched knowledge base";
    case "check_bill":
      return "checked bill";
    case "check_plan":
      return "checked plan";
    case "check_wifi_status":
      return "checked wifi status";
    default:
      return toolName;
  }
}

export default function App() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  console.log('api url is here ==>>',API_URL)


  useEffect(() => {
    fetch(`${API_URL}/api/customers`)
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data);
        if (data.length > 0) setCustomerId(data[0].customerId);
      })
      .catch(() => setError("Couldn't reach the backend. Is it running on port 4000?"));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const nextHistory = [...messages, { role: "user", content }];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          customerId,
          history: messages,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setMessages([
          ...nextHistory,
          { role: "assistant", content: data.reply, toolCalls: data.toolCalls },
        ]);
      }
    } catch (e) {
      setError("Couldn't reach the backend. Is it running on port 4000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-name">Signal</div>
            <div className="brand-sub">Telecom support agent</div>
          </div>
        </div>

        <div>
          <div className="section-label">Mock customer</div>
          <div className="customer-list">
            {customers.map((c) => (
              <button
                key={c.customerId}
                className={`customer-item ${c.customerId === customerId ? "active" : ""}`}
                onClick={() => {
                  setCustomerId(c.customerId);
                  setMessages([]);
                }}
              >
                {c.name}
                <span className="cust-id">{c.customerId}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="status-row">
          <span className={`status-dot ${error ? "off" : ""}`} />
          {error ? "backend unreachable" : "agent online"}
        </div>
      </aside>

      <div className="chat-col">
        <div className="chat-header">
          <h1>Support chat</h1>
          <p>Answers are grounded in the FAQ knowledge base and the selected account's live data.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="empty-hint">
              Ask about a bill, plan, or connectivity issue — the agent will decide whether
              to search policy docs, look up the account, or both.
            </div>
          )}

          {messages.map((m, i) => (
            <div className={`msg ${m.role}`} key={i}>
              <div className="bubble">{m.content}</div>
              {m.role === "assistant" && <ToolTrace toolCalls={m.toolCalls} />}
            </div>
          ))}

          {loading && (
            <div className="msg assistant">
              <div className="bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="suggestions">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion-chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about your bill, plan, or connection..."
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
