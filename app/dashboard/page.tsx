import { auth, signOut } from "@/auth";
import { createAdminClient } from "@/lib/supabase";
import { redirect } from "next/navigation";
import DeployButton from "./DeployButton";

const agentMeta: Record<string, { icon: string; name: string }> = {
  assistant: { icon: "🧠", name: "Claws Assistant" },
  dev: { icon: "💻", name: "Claws Code" },
  content: { icon: "✍️", name: "Claws Content" },
  sales: { icon: "📈", name: "Claws Outreach" },
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
        <nav className="flex items-center justify-between px-6 py-5 max-w-4xl mx-auto border-b border-zinc-900">
          <span className="text-xl font-bold tracking-tight">Claws</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>

        {/* Main */}
        <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
          {/* Status banners */}
          {params.connected === "1" && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              Slack connected successfully. Your agents are live.
            </div>
          )}
          {params.slack_error === "1" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Slack connection failed. Please try again.
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Your deployments</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {deployments?.length ?? 0} active agent{deployments?.length !== 1 ? "s" : ""}
              </p>
            </div>
            <DeployButton />
          </div>

          {/* Deployments */}
          {!deployments || deployments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
              <p className="text-zinc-500 text-sm">No deployments yet.</p>
              <p className="text-zinc-600 text-xs mt-2">
                Click &quot;Deploy new agent&quot; to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {deployments.map((d) => {
                const meta = agentMeta[d.agent_type] ?? {
                  icon: "🤖",
                  name: d.agent_type,
                };
                const slackUrl = d.slack_channel_id
                  ? `https://app.slack.com/client/${d.slack_team_id}/${d.slack_channel_id}`
                  : `https://app.slack.com/client/${d.slack_team_id}`;
                return (
                  <a
                    key={d.id}
                    href={slackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 block hover:border-zinc-600 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">{meta.name}</p>
                          {d.slack_team_name && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {d.slack_team_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          d.status === "active"
                            ? "border-green-500/30 bg-green-500/10 text-green-400"
                            : d.status === "error"
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : "border-zinc-700 bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600">
                      Deployed{" "}
                      {new Date(d.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
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
