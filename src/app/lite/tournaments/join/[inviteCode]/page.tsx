import { redirect } from 'next/navigation';

export default async function LiteTournamentJoinAliasPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  redirect(`/tournaments/join/${inviteCode}`);
}
