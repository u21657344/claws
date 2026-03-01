import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?slack_error=1`);
  }

  let userId: string;
  let agentType: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
    agentType = decoded.agentType;
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?slack_error=1`);
  }

  // Exchange code for access token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI!,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    console.error("[slack callback error]", tokenData.error, JSON.stringify(tokenData));
    return NextResponse.redirect(`${appUrl}/dashboard?slack_error=${encodeURIComponent(tokenData.error ?? "unknown")}`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("deployments").insert({
    user_id: userId,
    agent_type: agentType,
    channel: "slack",
    status: "active",
    slack_team_id: tokenData.team?.id ?? null,
    slack_team_name: tokenData.team?.name ?? null,
    slack_bot_user_id: tokenData.bot_user_id ?? null,
    slack_access_token: tokenData.access_token ?? null,
  });

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?slack_error=1`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard?connected=1`);
}
