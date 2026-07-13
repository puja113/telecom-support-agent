import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { searchKnowledgeBase } from "./ragStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const customers = JSON.parse(
  readFileSync(path.join(__dirname, "..", "data", "mockCustomers.json"), "utf-8")
);

function findCustomer(customerId) {
  return customers.find((c) => c.customerId === customerId);
}

export const searchFaqTool = tool(
  async ({ query }) => {
    const results = searchKnowledgeBase(query, 2);
    if (results.length === 0) {
      return "No relevant FAQ found. Tell the customer this may need a human agent.";
    }
    return JSON.stringify(results);
  },
  {
    name: "search_knowledge_base",
    description:
      "Search internal telecom FAQ/knowledge base for general policy questions - billing cycles, plan changes, roaming, WiFi troubleshooting steps, wallet top-ups, OTT bundle rules. Use this BEFORE answering any 'why' or 'how' policy question.",
    schema: z.object({
      query: z.string().describe("The customer's question, in their own words"),
    }),
  }
);

export const checkBillTool = tool(
  async ({ customerId }) => {
    const customer = findCustomer(customerId);
    if (!customer) return `No customer found with ID ${customerId}.`;
    return JSON.stringify(customer.bill);
  },
  {
    name: "check_bill",
    description:
      "Look up a specific customer's current bill amount and itemized breakdown. Use this when the customer asks about a specific charge or 'why is my bill higher'.",
    schema: z.object({
      customerId: z.string().describe("The customer's account ID, e.g. CUST-1001"),
    }),
  }
);

export const checkPlanTool = tool(
  async ({ customerId }) => {
    const customer = findCustomer(customerId);
    if (!customer) return `No customer found with ID ${customerId}.`;
    return JSON.stringify(customer.plan);
  },
  {
    name: "check_plan",
    description:
      "Look up a specific customer's current plan details (name, price, data allowance, included bundles). Use this for questions about what plan someone is on or plan comparisons.",
    schema: z.object({
      customerId: z.string().describe("The customer's account ID, e.g. CUST-1001"),
    }),
  }
);

export const checkWifiStatusTool = tool(
  async ({ customerId }) => {
    const customer = findCustomer(customerId);
    if (!customer) return `No customer found with ID ${customerId}.`;
    return JSON.stringify(customer.wifi);
  },
  {
    name: "check_wifi_status",
    description:
      "Check a specific customer's live WiFi/connectivity status and any known outages in their area. Use this for connectivity complaints before giving generic troubleshooting steps.",
    schema: z.object({
      customerId: z.string().describe("The customer's account ID, e.g. CUST-1001"),
    }),
  }
);

export const allTools = [
  searchFaqTool,
  checkBillTool,
  checkPlanTool,
  checkWifiStatusTool,
];

export function listMockCustomerIds() {
  return customers.map((c) => ({ customerId: c.customerId, name: c.name }));
}
