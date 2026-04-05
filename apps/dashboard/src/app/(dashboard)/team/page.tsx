import { getUserInfo, getTeam } from "@/lib/server-api";
import { TeamClient } from "./team-client";

export default async function TeamPage() {
  const user = await getUserInfo();
  const teamData = await getTeam();
  const tier = user?.tier || "free";

  return <TeamClient teamData={teamData} tier={tier} />;
}
