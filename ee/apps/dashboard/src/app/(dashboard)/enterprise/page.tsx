import { getUserInfo } from "@/lib/server-api";
import { EnterpriseClient } from "./enterprise-client";

export default async function EnterprisePage() {
  const user = await getUserInfo();
  const tier = user?.tier || "free";

  return <EnterpriseClient tier={tier} />;
}
