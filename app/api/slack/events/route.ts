import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase";
import { runAssistantAgent } from "@/lib/agents/assistant";

// ─── HMAC verification ───────────────────────────────────────────────────────

async function verifySlackRequest(request: Request, rawBody: string): Promise<boolean> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  const timestamp = request.headers.get("x-slack-request-timestamp");
  const slackSignature = request.headers.get("x-slack-signature");
  if (!timestamp || !slackSignature) return false;

  // Replay guard: reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${rawBody}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(sigBasestring)
  );

  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const computed = `v0=${computedHex}`;

  // Timing-safe comparison
  if (computed.length !== slackSignature.length) return false;

  const computedBytes = encoder.encode(computed);
  const slackBytes = encoder.encode(slackSignature);
  let diff = 0;
  for (let i = 0; i < computedBytes.length; i++) {
    diff |= computedBytes[i] ^ slackBytes[i];
  }
  return diff === 0;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Must read raw body before any parsing — HMAC needs the exact bytes
  const rawBody = await request.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Slack URL verification challenge (sent once when you enable Event Subscriptions)
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Verify HMAC signature
  const valid = await verifySlackRequest(request, rawBody);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Deduplicate Slack retries — acknowledge and drop
  const retryNum = request.headers.get("x-slack-retry-num");
  if (retryNum && parseInt(retryNum, 10) > 0) {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event as Record<string, unknown> | undefined;

  if (payload.type === "event_callback" && event?.type === "app_mention") {
    const teamId = String(payload.team_id ?? "");
    const channelId = String(event.channel ?? "");
    const threadTs = String(event.thread_ts ?? event.ts ?? "");
    const eventTs = String(event.ts ?? "");
    const userId = String(event.user ?? "");
    const rawText = String(event.text ?? "");

    // Look up the deployment for this Slack workspace
    const db = createAdminClient();
    const { data: deployment, error } = await db
      .from("deployments")
      .select("id, slack_access_token, slack_bot_user_id, slack_channel_id, agent_type")
      .eq("slack_team_id", teamId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !deployment) {
      // No deployment found — nothing to do
      return NextResponse.json({ ok: true });
    }

    // Guard: skip if the event was sent by the bot itself
    if (userId === deployment.slack_bot_user_id) {
      return NextResponse.json({ ok: true });
    }

    // Auto-save slack_channel_id on first @mention
    if (!deployment.slack_channel_id) {
      await db.from("deployments")
        .update({ slack_channel_id: channelId })
        .eq("id", deployment.id);
    }

    // Strip bot mention (<@UXXXXXXXX>) from the text
    const userText = rawText.replace(/<@[A-Z0-9]+>/g, "").trim();

    // Use the event ts as the thread anchor if not already in a thread
    const replyThreadTs = threadTs || eventTs;

    // waitUntil keeps the Vercel function alive after the HTTP response is sent
    waitUntil(
      runAssistantAgent({
        deploymentId: deployment.id,
        slackAccessToken: deployment.slack_access_token,
        channelId,
        threadTs: replyThreadTs,
        userText,
        agentType: deployment.agent_type,
      })
    );
  }

  return NextResponse.json({ ok: true });
}
