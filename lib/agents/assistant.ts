import Anthropic from "@anthropic-ai/sdk";
import { WebClient } from "@slack/web-api";
import { createAdminClient } from "@/lib/supabase";
import { toolDefinitions, executeTool } from "./tools";

const MAX_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are Claws, a helpful assistant deployed into a Slack workspace.

Guidelines:
- Be concise. Slack messages are short — skip long preambles.
- No markdown headers (# or ##). Use plain text, bullet points with •, or *bold* for emphasis.
- Use tools silently. Don't narrate what tool you're about to call; just do it and report the outcome naturally.
- After using tools, reply in plain English with the result. Don't repeat raw tool output.
- You have memory and a task list. Use them proactively to help the user.`;

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
}: {
  deploymentId: string;
  slackAccessToken: string;
  channelId: string;
  threadTs: string;
  userText: string;
}): Promise<void> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
  const slack = new WebClient(slackAccessToken);

  // Build message history from DB + append current user message
  const history = await loadHistory(deploymentId, channelId, threadTs);
  const userContent = userText;
  await persistMessage(deploymentId, channelId, threadTs, "user", userContent);

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userContent },
  ];

  let finalText = "I wasn't able to generate a response. Please try again.";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

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

    if (response.stop_reason === "end_turn") {
      // Extract the last text block as the final reply
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
