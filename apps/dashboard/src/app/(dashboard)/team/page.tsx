import { getUserInfo, getTeam } from "@/lib/server-api";
import { TeamClient } from "./team-client";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const params = await searchParams;
  const user = await getUserInfo();
  const teamData = await getTeam();
  const tier = user?.tier || "free";

  return <TeamClient teamData={teamData} tier={tier} inviteToken={params.invite} />;
}
