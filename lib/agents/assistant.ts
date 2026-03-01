import Anthropic from "@anthropic-ai/sdk";
import { WebClient } from "@slack/web-api";
import { createAdminClient } from "@/lib/supabase";
import { toolDefinitions, executeTool } from "./tools";

const MAX_ITERATIONS = 10;

// ─── Agent profiles ──────────────────────────────────────────────────────────

const AGENT_PROFILES: Record<string, { role: string; traits: string; capabilities: string }> = {
  assistant: {
    role: "fully autonomous AI chief of staff",
    traits: `- Confident and direct. No hedging, no filler phrases. No "I'll try to" or "I think".
- Proactive — anticipate what the user actually needs beyond what they literally said.
- Resourceful — use web search, memory, and task management without being asked.
- Concise — Slack messages are short. Use • bullets and *bold*. No markdown headers (# or ##).
- Silent tool use — don't narrate what you're about to do, just do it and report the result.
- Persistent memory — remember everything important. Store it. Recall it automatically.`,
    capabilities: `• Search the web for real-time information, news, prices, research
• Remember facts about the user and their preferences
• Manage a full task list (create, update, complete, delete)
• Provide analysis, planning, research, and actionable recommendations`,
  },
  dev: {
    role: "AI engineering lead",
    traits: `- Precise and technical. Give exact answers — file paths, function names, error causes.
- Skip the preamble. Lead with the solution, follow with explanation only if needed.
- Opinionated — recommend the right approach, don't just list options.
- Concise — use code blocks for snippets, • bullets for steps. No markdown headers (# or ##).
- Silent tool use — search docs, recall context, and execute without narrating it.
- Persistent memory — store architecture decisions, stack choices, and recurring issues.`,
    capabilities: `• Search docs, changelogs, GitHub issues, and Stack Overflow in real time
• Remember the stack, architecture decisions, and past debugging sessions
• Track engineering tasks, bugs, and open PRs
• Debug errors, review code, plan features, and draft implementations`,
  },
  content: {
    role: "AI content strategist and writer",
    traits: `- Sharp and creative. Every word earns its place.
- Brand-aware — learn the voice and maintain it across everything you write.
- Fast — produce solid first drafts immediately, refine on feedback.
- Concise in conversation — save the long-form for the actual deliverable.
- Silent tool use — research, recall context, and draft without narrating it.
- Persistent memory — remember tone of voice, audience, past campaigns, and preferences.`,
    capabilities: `• Research trends, competitors, and topics in real time
• Remember brand voice, audience profiles, and content guidelines
• Track content tasks, deadlines, and campaign status
• Write and edit posts, emails, scripts, ads, and long-form content`,
  },
  sales: {
    role: "AI sales operator",
    traits: `- Direct and deal-focused. Everything ties back to pipeline and revenue.
- Proactive — flag stale deals, suggest next actions, surface opportunities unprompted.
- Efficient — short messages, clear next steps, no fluff.
- Concise — use • bullets for lists, *bold* for names and numbers. No markdown headers (# or ##).
- Silent tool use — research prospects, recall context, and log tasks without narrating it.
- Persistent memory — remember prospects, deal status, objections, and relationship context.`,
    capabilities: `• Research companies, decision-makers, and market signals in real time
• Remember prospect details, deal status, and relationship notes
• Track outreach tasks, follow-ups, and pipeline milestones
• Draft cold outreach, follow-up emails, and talk tracks`,
  },
};

function buildSystemPrompt(agentType: string, memoryContext: string): string {
  const profile = AGENT_PROFILES[agentType] ?? AGENT_PROFILES.assistant;
  return `You are Claws, a ${profile.role} deployed into this Slack workspace.

Core traits:
${profile.traits}

Capabilities:
${profile.capabilities}

You are always on, always available, always thinking ahead. Act like it.${memoryContext}`;
}

// ─── Persist helpers ────────────────────────────────────────────────────────

async function loadHistory(
  deploymentId: string,
  channelId: string,
  threadTs: string
): Promise<Anthropic.MessageParam[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("agent_messages")
    .select("role, content")
    .eq("deployment_id", deploymentId)
    .eq("channel_id", channelId)
    .eq("thread_ts", threadTs)
    .order("created_at");

  if (error || !data) return [];

  // content is already a parsed JS object from Supabase jsonb — do NOT JSON.parse
  return data as Anthropic.MessageParam[];
}

async function persistMessage(
  deploymentId: string,
  channelId: string,
  threadTs: string,
  role: "user" | "assistant",
  content: Anthropic.MessageParam["content"]
): Promise<void> {
  const db = createAdminClient();
  await db.from("agent_messages").insert({
    deployment_id: deploymentId,
    channel_id: channelId,
    thread_ts: threadTs,
    role,
    content,
  });
}

// ─── Main agentic loop ───────────────────────────────────────────────────────

export async function runAssistantAgent({
  deploymentId,
  slackAccessToken,
  channelId,
  threadTs,
  userText,
  agentType,
}: {
  deploymentId: string;
  slackAccessToken: string;
  channelId: string;
  threadTs: string;
  userText: string;
  agentType: string;
}): Promise<void> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
  const slack = new WebClient(slackAccessToken);

  // Post placeholder immediately so the user knows the bot is alive
  // For DMs, threadTs is the channel ID (not a real timestamp) — omit thread_ts in that case
  const posted = await slack.chat.postMessage({
    channel: channelId,
    ...(threadTs.includes(".") ? { thread_ts: threadTs } : {}),
    text: "●",
  });
  const replyTs = posted.ts!;

  // Load memories for system prompt injection
  const db = createAdminClient();
  const { data: memories } = await db
    .from("agent_memories")
    .select("key, value")
    .eq("deployment_id", deploymentId);

  const memoryContext = memories?.length
    ? "\n\nWhat I know about you:\n" + memories.map((m) => `• ${m.key}: ${m.value}`).join("\n")
    : "";

  // Build message history from DB + append current user message
  const history = await loadHistory(deploymentId, channelId, threadTs);
  const userContent = userText;
  await persistMessage(deploymentId, channelId, threadTs, "user", userContent);

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userContent },
  ];

  const allTools: Anthropic.Tool[] = [
    ...(toolDefinitions as Anthropic.Tool[]),
    { type: "web_search_20260209", name: "web_search" } as unknown as Anthropic.Tool,
  ];

  let streamedText = "";
  let lastUpdateMs = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt(agentType, memoryContext),
      tools: allTools,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        streamedText += event.delta.text;
        const now = Date.now();
        if (now - lastUpdateMs >= 1000) {
          lastUpdateMs = now;
          try {
            await slack.chat.update({ channel: channelId, ts: replyTs, text: streamedText });
          } catch {
            // ignore transient update failures
          }
        }
      }
    }

    const response = await stream.finalMessage();

    // Always push full content to local messages first (thinking blocks valid in-session)
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "pause_turn") {
      // Web search in-flight — transient state, never write to DB
      continue;
    }

    // Strip thinking blocks before writing to DB (session-scoped, break on replay)
    const persistable = response.content.filter((b) => b.type !== "thinking");
    await persistMessage(deploymentId, channelId, threadTs, "assistant", persistable);

    if (response.stop_reason === "end_turn") {
      await slack.chat.update({ channel: channelId, ts: replyTs, text: streamedText });
      break;
    }

    if (response.stop_reason === "tool_use") {
      // Show working indicator during tool execution
      try {
        await slack.chat.update({ channel: channelId, ts: replyTs, text: "🔧 Working…" });
      } catch {
        // ignore
      }
      streamedText = ""; // reset so next stream builds fresh after the indicator

      const toolUseBlocks = response.content.filter(
        (b) => b.type === "tool_use"
      ) as Anthropic.ToolUseBlock[];

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            deploymentId
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: result,
          };
        })
      );

      await persistMessage(deploymentId, channelId, threadTs, "user", toolResults);
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason — stop the loop
    break;
  }
}
