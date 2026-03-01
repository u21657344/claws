import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const slackError = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (slackError) {
    return NextResponse.redirect(`${appUrl}/dashboard?slack_error=${encodeURIComponent(slackError)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?slack_error=missing_code`);
  }

  let userId: string;
  let agentType: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
    agentType = decoded.agentType;
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?slack_error=invalid_state`);
  }

  // Use agent-type-specific credentials for token exchange (must match what initiated the OAuth)
  const typeKey = agentType.toUpperCase();
  const clientId = process.env[`SLACK_CLIENT_ID_${typeKey}`] ?? process.env.SLACK_CLIENT_ID!;
  const clientSecret = process.env[`SLACK_CLIENT_SECRET_${typeKey}`] ?? process.env.SLACK_CLIENT_SECRET!;

  // Exchange code for access token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
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
    console.error("[slack callback db error]", error);
    return NextResponse.redirect(`${appUrl}/dashboard?slack_error=${encodeURIComponent(error.code ?? error.message ?? "db_error")}`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard?connected=1`);
}
