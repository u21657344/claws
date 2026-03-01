import { auth, signOut } from "@/auth";
import { createAdminClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import DeployButton from "./DeployButton";

const agentMeta: Record<string, { icon: string; name: string }> = {
  assistant:    { icon: "🧠", name: "Claws Assistant" },
  dev:          { icon: "💻", name: "Claws Code" },
  content:      { icon: "✍️", name: "Claws Content" },
  sales:        { icon: "📈", name: "Claws Outreach" },
  orchestrator: { icon: "⚡", name: "Claws Orchestrator" },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; slack_error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const params = await searchParams;

  const supabase = createAdminClient();
  const { data: deployments } = await supabase
    .from("deployments")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans">
      <div className="fixed inset-0 dot-grid pointer-events-none" />

      <div className="relative z-10">
        {/* Nav */}
        <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-4xl mx-auto border-b border-zinc-900">
          <span className="text-xl font-bold tracking-tight">Claws</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 truncate max-w-[140px] sm:max-w-none">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-zinc-400 hover:text-white transition-colors whitespace-nowrap"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>

        {/* Main */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
          {/* Status banners */}
          {params.connected === "1" && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              Slack connected successfully. Your agent is live.
            </div>
          )}
          {params.slack_error && params.slack_error !== "1" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Slack connection failed: <span className="font-mono">{params.slack_error}</span>
            </div>
          )}
          {params.slack_error === "1" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Slack connection failed. Please try again.
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Your deployments</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {deployments?.length ?? 0} active agent{deployments?.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="sm:flex-shrink-0">
              <DeployButton />
            </div>
          </div>

          {/* Deployments */}
          {!deployments || deployments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
              <p className="text-zinc-500 text-sm">No deployments yet.</p>
              <p className="text-zinc-600 text-xs mt-2">
                Tap &quot;Deploy new agent&quot; to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {deployments.map((d) => {
                const meta = agentMeta[d.agent_type] ?? { icon: "🤖", name: d.agent_type };
                const slackUrl = d.slack_channel_id
                  ? `https://app.slack.com/client/${d.slack_team_id}/${d.slack_channel_id}`
                  : `https://app.slack.com/client/${d.slack_team_id}`;
                return (
                  <a
                    key={d.id}
                    href={slackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 flex items-center justify-between hover:border-zinc-600 transition-colors active:bg-zinc-800/60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl flex-shrink-0">{meta.icon}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{meta.name}</p>
                        {d.slack_team_name && (
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">{d.slack_team_name}</p>
                        )}
                        <p className="text-xs text-zinc-700 mt-1">
                          {new Date(d.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ml-3 ${
                        d.status === "active"
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : d.status === "error"
                          ? "border-red-500/30 bg-red-500/10 text-red-400"
                          : "border-zinc-700 bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {d.status}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
