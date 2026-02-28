import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { searchParams } = new URL(request.url);
  const agentType = searchParams.get("agent_type") ?? "assistant";

  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, agentType })
  ).toString("base64url");

  const scopes = "chat:write,commands,channels:read,users:read,app_mentions:read";
  const slackUrl = new URL("https://slack.com/oauth/v2/authorize");
  slackUrl.searchParams.set("client_id", process.env.SLACK_CLIENT_ID!);
  slackUrl.searchParams.set("scope", scopes);
  slackUrl.searchParams.set("redirect_uri", process.env.SLACK_REDIRECT_URI!);
  slackUrl.searchParams.set("state", state);

  return NextResponse.redirect(slackUrl.toString());
}
