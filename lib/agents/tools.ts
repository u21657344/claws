import { createAdminClient } from "@/lib/supabase";
import type Anthropic from "@anthropic-ai/sdk";

// ─── Tool definitions sent to Claude ───────────────────────────────────────

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "remember",
    description:
      "Store a piece of information under a key so you can recall it later. Overwrites any previous value for the same key.",
    input_schema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "Short identifier for this memory (e.g. 'user_timezone')",
        },
        value: {
          type: "string",
          description: "The information to store",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "recall",
    description:
      "Retrieve stored memories. Pass a query to filter by key (partial match). Omit query to get all memories.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional substring to filter memory keys",
        },
      },
      required: [],
    },
  },
  {
    name: "create_task",
    description: "Add a new task to the user's task list.",
    input_schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "What needs to be done",
        },
        due_date: {
          type: "string",
          description: "Optional due date in YYYY-MM-DD format",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks. By default only shows incomplete tasks.",
    input_schema: {
      type: "object",
      properties: {
        include_completed: {
          type: "boolean",
          description: "Set true to include already-completed tasks",
        },
      },
      required: [],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task as completed by its ID.",
    input_schema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "UUID of the task to mark complete",
        },
      },
      required: ["task_id"],
    },
  },
];

// ─── Tool executors ─────────────────────────────────────────────────────────

type ToolInput = Record<string, unknown>;

export async function executeTool(
  name: string,
  input: ToolInput,
  deploymentId: string
): Promise<string> {
  const db = createAdminClient();

  switch (name) {
    case "remember": {
      const key = String(input.key);
      const value = String(input.value);
      const { error } = await db.from("agent_memories").upsert(
        { deployment_id: deploymentId, key, value },
        { onConflict: "deployment_id,key" }
      );
      if (error) return `Error saving memory: ${error.message}`;
      return `Remembered: ${key} = ${value}`;
    }

    case "recall": {
      const query = input.query ? String(input.query) : null;
      let req = db
        .from("agent_memories")
        .select("key, value")
        .eq("deployment_id", deploymentId);
      if (query) req = req.ilike("key", `%${query}%`);
      const { data, error } = await req;
      if (error) return `Error retrieving memories: ${error.message}`;
      if (!data || data.length === 0) return "No memories found.";
      return data.map((r) => `${r.key}: ${r.value}`).join("\n");
    }

    case "create_task": {
      const title = String(input.title);
      const due_date = input.due_date ? String(input.due_date) : null;
      const { data, error } = await db
        .from("agent_tasks")
        .insert({ deployment_id: deploymentId, title, due_date })
        .select("id")
        .single();
      if (error) return `Error creating task: ${error.message}`;
      return `Task created (id: ${data.id}): ${title}${due_date ? ` — due ${due_date}` : ""}`;
    }

    case "list_tasks": {
      const includeCompleted = input.include_completed === true;
      let req = db
        .from("agent_tasks")
        .select("id, title, due_date, completed, created_at")
        .eq("deployment_id", deploymentId)
        .order("created_at");
      if (!includeCompleted) req = req.eq("completed", false);
      const { data, error } = await req;
      if (error) return `Error listing tasks: ${error.message}`;
      if (!data || data.length === 0)
        return includeCompleted ? "No tasks found." : "No pending tasks.";
      return data
        .map((t) => {
          const status = t.completed ? "[done]" : "[open]";
          const due = t.due_date ? ` (due ${t.due_date})` : "";
          return `${status} ${t.title}${due} — id: ${t.id}`;
        })
        .join("\n");
    }

    case "complete_task": {
      const task_id = String(input.task_id);
      const { error } = await db
        .from("agent_tasks")
        .update({ completed: true })
        .eq("id", task_id)
        .eq("deployment_id", deploymentId);
      if (error) return `Error completing task: ${error.message}`;
      return `Task ${task_id} marked as complete.`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
