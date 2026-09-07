import type { AgentTransactionInput } from "../../../core/network/agent-types";

export interface DemoParty {
  phone: string;
  account: string;
}

// Narrative-only risk framing for the card badge — this is not the agent's
// actual decision (that only exists after a live run); it's a hint at what
// kind of transaction context this scenario represents.
export type RiskTier = "low" | "medium" | "elevated" | "high" | "critical";

// Groups scenarios under the dashboard's filter tabs.
export type ScenarioCategory = "routine" | "friction" | "suspicious";

// Every display string (label, summary, risk label, location label, party
// names) lives in the i18n dictionaries under `dashboard.scenarios.<id>`,
// keyed by this id — see translations/{en,ar}.ts. That's what makes the
// dashboard's demo cards localize instead of always rendering in English.
export interface DemoScenario {
  id: string;
  category: ScenarioCategory;
  riskTier: RiskTier;
  sender: DemoParty;
  recipient: DemoParty;
  // Everything the real agent needs except phone_number — the demo sender/
  // recipient phone numbers above are for display only. The number actually
  // sent to the agent is always the live CAMARA simulator number, wired in
  // by the dashboard view.
  payload: Omit<AgentTransactionInput, "phone_number">;
}
