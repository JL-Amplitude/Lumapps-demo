// AI agents available in the Agent Hub.

export type AgentType = "HR Assistant" | "IT Helpdesk" | "Knowledge Agent" | "PTO & Leave" | "Expense Approvals";
export type Connector = "microsoft_365" | "google_workspace" | "sap_successfactors" | "servicenow";

export interface Agent {
  type: AgentType;
  name: string;            // snake_case agent_name sent to Amplitude
  description: string;
  connector: Connector | "primary_suite";
  color: string;
  emoji: string;
  prompts: string[];
  action: (prompt: string) => { draft: string; done: string; minutes: number };
}

export const AGENTS: Agent[] = [
  {
    type: "PTO & Leave", name: "pto_leave_agent", connector: "sap_successfactors", color: "bg-emerald-500", emoji: "🌴",
    description: "Request time off, check balances and see team availability.",
    prompts: ["Request 3 days PTO next week", "How many holiday days do I have left?", "Book Friday afternoon off"],
    action: (p) => ({ draft: `I've drafted your leave request ("${p}"). Your balance after this request: 14 days.`, done: "Your leave request was submitted to your manager in SAP SuccessFactors.", minutes: 15 }),
  },
  {
    type: "IT Helpdesk", name: "it_helpdesk", connector: "servicenow", color: "bg-sky-500", emoji: "💻",
    description: "Fix access issues, reset passwords and open IT tickets.",
    prompts: ["My laptop won't connect to VPN", "Reset my badge access", "Order a new headset"],
    action: (p) => ({ draft: `I've prepared an IT ticket: "${p}". Priority: Medium. Suggested fix steps are attached.`, done: "Ticket created in ServiceNow. An engineer will contact you within 4 hours.", minutes: 25 }),
  },
  {
    type: "HR Assistant", name: "hr_assistant", connector: "sap_successfactors", color: "bg-violet-500", emoji: "🧑‍💼",
    description: "Payslips, benefits, personal details and HR policies.",
    prompts: ["Send me my latest payslip", "Update my home address", "Enroll me in the dental plan"],
    action: (p) => ({ draft: `I can do that for you: "${p}". I'll update your HR record once you authorise access.`, done: "Done — your HR record was updated in SAP SuccessFactors.", minutes: 20 }),
  },
  {
    type: "Expense Approvals", name: "expense_approvals", connector: "primary_suite", color: "bg-amber-500", emoji: "🧾",
    description: "Submit receipts and approve your team's expenses.",
    prompts: ["Submit my taxi receipt (€32)", "Approve pending team expenses", "What's my expense limit?"],
    action: (p) => ({ draft: `I've drafted the expense: "${p}". Category: Travel. Receipt attached from your inbox.`, done: "Expense submitted for approval.", minutes: 12 }),
  },
  {
    type: "Knowledge Agent", name: "knowledge_agent", connector: "primary_suite", color: "bg-brand-500", emoji: "📚",
    description: "Answers from company documents, drives and sites.",
    prompts: ["Summarise the new travel policy", "Find the Q4 sales deck", "What's the parental leave policy?"],
    action: (p) => ({ draft: `I found 3 relevant documents for "${p}". To read files in your company drive I need access.`, done: "Here's your summary, with links to the 3 source documents.", minutes: 10 }),
  },
];

export const CONNECTOR_LABEL: Record<Connector, string> = {
  microsoft_365: "Microsoft 365",
  google_workspace: "Google Workspace",
  sap_successfactors: "SAP SuccessFactors",
  servicenow: "ServiceNow",
};

export const LLM_MODELS = ["claude-sonnet-4", "gpt-4.1", "gemini-2.5-pro"] as const;

export function agentFromPrompt(text: string): Agent {
  const t = text.toLowerCase();
  if (/(pto|leave|holiday|day off|vacation|time off)/.test(t)) return AGENTS[0];
  if (/(laptop|vpn|password|badge|it |wifi|headset|printer)/.test(t)) return AGENTS[1];
  if (/(payslip|address|benefit|dental|hr )/.test(t)) return AGENTS[2];
  if (/(expense|receipt|approve|reimburse)/.test(t)) return AGENTS[3];
  return AGENTS[4];
}
