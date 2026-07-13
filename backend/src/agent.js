import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { allTools } from "./tools.js";

const SYSTEM_PROMPT = `You are Telecom Support Assistant, an AI agent for a telecom provider.
You help customers with billing questions, plan details, and connectivity issues.

Rules:
- Always ground policy/"why" or "how" questions in the search_knowledge_base tool - do not invent policy.
- Always ground account-specific facts (bill amount, plan name, wifi status) in the matching account tool - never guess numbers.
- If a question needs both (e.g. "why is my bill higher"), check the account facts AND the relevant policy, then explain the connection clearly.
- Keep answers concise, warm, and specific. Reference actual numbers/dates from tool results.
- If no customerId is available for an account-specific question, ask for it.
- Never expose internal tool names or JSON to the customer - translate tool output into plain, friendly language.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

let executorPromise = null;

async function getExecutor() {
  if (!executorPromise) {
    const model = new ChatGoogleGenerativeAI({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      temperature: 0.2,
      apiKey: process.env.GEMINI_API_KEY,
    });

    const agent = createToolCallingAgent({
      llm: model,
      tools: allTools,
      prompt,
    });

    executorPromise = Promise.resolve(
      new AgentExecutor({
        agent,
        tools: allTools,
        returnIntermediateSteps: true,
        verbose: false,
      })
    );
  }
  return executorPromise;
}

function toLangchainHistory(history = []) {
  return history.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
  );
}

export async function runAgent({ message, customerId, history = [] }) {
  const executor = await getExecutor();

  const contextualInput = customerId
    ? `[Authenticated customer ID: ${customerId}]\n${message}`
    : message;

  const result = await executor.invoke({
    input: contextualInput,
    chat_history: toLangchainHistory(history),
  });

  const toolCalls = (result.intermediateSteps || []).map((step) => ({
    tool: step.action.tool,
    input: step.action.toolInput,
  }));

  return {
    reply: result.output,
    toolCalls,
  };
}
