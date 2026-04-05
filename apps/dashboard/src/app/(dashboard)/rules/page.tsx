import { getUserInfo, getRules } from "@/lib/server-api";
import { RulesClient } from "./rules-client";

export default async function RulesPage() {
  const user = await getUserInfo();
  const data = await getRules();
  const rules = data?.rules ?? [];
  const tier = user?.tier || "free";

  return <RulesClient rules={rules} tier={tier} />;
}
