import type { AgentTransactionInput } from "../../../core/network/agent-types";

export interface DemoParty {
  name: string;
  phone: string;
  account: string;
}

// Narrative-only risk framing for the card badge — this is not the agent's
// actual decision (that only exists after a live run); it's a hint at what
// kind of transaction context this scenario represents.
export type RiskTier = "low" | "medium" | "elevated" | "high" | "critical";

// Groups scenarios under the dashboard's filter tabs.
export type ScenarioCategory = "routine" | "friction" | "suspicious";

export interface DemoScenario {
  id: string;
  label: string;
  summary: string;
  category: ScenarioCategory;
  riskTier: RiskTier;
  riskLabel: string;
  sender: DemoParty;
  recipient: DemoParty;
  locationLabel: string;
  // Everything the real agent needs except phone_number — the demo sender/
  // recipient phone numbers above are for display only. The number actually
  // sent to the agent is always the live CAMARA simulator number, wired in
  // by the dashboard view.
  payload: Omit<AgentTransactionInput, "phone_number">;
}
