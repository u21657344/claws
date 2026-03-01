export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { runAssistantAgent } from "@/lib/agents/assistant";

export async function GET(request: Request) {
  // Vercel automatically sends Authorization: Bearer {CRON_SECRET} for cron routes
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  const { data: deployments } = await db
    .from("deployments")
    .select("id, slack_access_token, slack_channel_id, agent_type")
    .eq("status", "active")
    .not("slack_channel_id", "is", null);

  if (!deployments?.length) return NextResponse.json({ ok: true, checked: 0 });

  const now = new Date().toISOString();
  let triggered = 0;

  await Promise.all(
    deployments.map(async (deployment) => {
      const { data: overdue } = await db
        .from("agent_tasks")
        .select("id, title, due_date")
        .eq("deployment_id", deployment.id)
        .eq("completed", false)
        .lt("due_date", now)
        .not("due_date", "is", null);

      if (!overdue?.length) return;

      const taskList = overdue.map((t) => `• ${t.title} (due ${t.due_date})`).join("\n");

      triggered++;
      await runAssistantAgent({
        deploymentId: deployment.id,
        slackAccessToken: deployment.slack_access_token,
        channelId: deployment.slack_channel_id,
        threadTs: `heartbeat-${Date.now()}`,
        userText: `[HEARTBEAT] ${overdue.length} overdue task(s) detected:\n${taskList}\n\nPost a brief status update to the channel — flag what's overdue and suggest next actions.`,
        agentType: deployment.agent_type,
      }).catch((err) => console.error("[heartbeat error]", deployment.id, err));
    })
  );

  return NextResponse.json({ ok: true, checked: deployments.length, triggered });
}
