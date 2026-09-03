import type { AgentTransactionInput } from "../../camara-verification/api/agent-test.api";

export interface DemoParty {
  name: string;
  phone: string;
  account: string;
}

export interface DemoScenario {
  id: string;
  label: string;
  summary: string;
  sender: DemoParty;
  recipient: DemoParty;
  locationLabel: string;
  // Everything the real agent needs except phone_number — the demo sender/
  // recipient phone numbers above are for display only. The number actually
  // sent to the agent is always the live CAMARA simulator number, wired in
  // by the dashboard view.
  payload: Omit<AgentTransactionInput, "phone_number">;
}
