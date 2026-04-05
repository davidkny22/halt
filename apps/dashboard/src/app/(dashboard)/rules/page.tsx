import { getUserInfo, getRules, getAgents } from "@/lib/server-api";
import { RulesClient } from "./rules-client";

export default async function RulesPage() {
  const [user, data, agentsData] = await Promise.all([
    getUserInfo(),
    getRules(),
    getAgents(),
  ]);
  const rules = data?.rules ?? [];
  const tier = user?.tier || "free";
  const agents = (agentsData?.agents ?? []).filter((a: any) => a.status !== "discovered");

  return <RulesClient rules={rules} tier={tier} agents={agents} />;
}
