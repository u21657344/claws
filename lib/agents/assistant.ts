import Anthropic from "@anthropic-ai/sdk";
import { WebClient } from "@slack/web-api";
import { createAdminClient } from "@/lib/supabase";
import { toolDefinitions, executeTool } from "./tools";

const MAX_ITERATIONS = 10;

function buildSystemPrompt(memoryContext: string): string {
  return `You are Claws, a fully autonomous AI chief of staff deployed into this Slack workspace.

Core traits:
- Confident and direct. No hedging, no filler phrases. No "I'll try to" or "I think".
- Proactive — anticipate what the user actually needs beyond what they literally said.
- Resourceful — you have web search, memory, and task management. Use them without being asked.
- Concise — Slack messages are short. Use • bullets and *bold*. No markdown headers (# or ##).
- Silent tool use — don't narrate what you're about to do, just do it and report the result.
- Persistent memory — remember everything important. Store it. Recall it automatically.

Capabilities:
• Search the web for real-time information, news, prices, research
• Remember facts about the user and their preferences
• Manage a full task list (create, update, complete, delete)
• Provide analysis, planning, research, and actionable recommendations

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

  let finalText = "I wasn't able to generate a response. Please try again.";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = (await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system: buildSystemPrompt(memoryContext),
      tools: allTools,
      messages,
    } as any)) as Anthropic.Message;

    // Persist assistant turn (full content array for tool_use blocks)
    await persistMessage(
      deploymentId,
      channelId,
      threadTs,
      "assistant",
      response.content
    );

    // Append to local message list
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "pause_turn") {
      // Web search in progress — loop continues with updated messages
      continue;
    }

    if (response.stop_reason === "end_turn") {
      // Extract the last text block as the final reply (thinking blocks are skipped)
      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        finalText = textBlock.text;
      }
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b) => b.type === "tool_use"
      ) as Anthropic.ToolUseBlock[];

      // Execute all tool calls concurrently
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

      // Persist tool results so history round-trips correctly
      await persistMessage(deploymentId, channelId, threadTs, "user", toolResults);
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason — stop the loop
    break;
  }

  // Post reply to Slack in-thread
  await slack.chat.postMessage({
    channel: channelId,
    thread_ts: threadTs,
    text: finalText,
  });
}
