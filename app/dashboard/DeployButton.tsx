"use client";

import { useState } from "react";

const agents = [
  { id: "orchestrator", name: "Claws Orchestrator", icon: "⚡", description: "Auto-routes to the right specialist" },
  { id: "assistant",    name: "Claws Assistant",    icon: "🧠", description: "General chief of staff" },
  { id: "dev",          name: "Claws Code",         icon: "💻", description: "Engineering lead" },
  { id: "content",      name: "Claws Content",      icon: "✍️", description: "Content strategist" },
  { id: "sales",        name: "Claws Outreach",     icon: "📈", description: "Sales operator" },
];

export default function DeployButton() {
  const [selectedAgent, setSelectedAgent] = useState("orchestrator");
  const [open, setOpen] = useState(false);

  function handleConnectSlack() {
    window.location.href = `/api/slack/install?agent_type=${selectedAgent}`;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold px-6 py-3 transition-colors"
      >
        + Deploy new agent
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">New deployment</p>
        <button
          onClick={() => setOpen(false)}
          className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          cancel
        </button>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
          Choose agent
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`rounded-xl border p-3 text-left transition-all flex items-start gap-3 ${
                selectedAgent === agent.id
                  ? "border-violet-500/60 bg-violet-500/10"
                  : "border-zinc-800 hover:border-zinc-600 active:bg-zinc-800"
              }`}
            >
              <span className="text-lg mt-0.5 flex-shrink-0">{agent.icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium">{agent.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{agent.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleConnectSlack}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-black font-semibold py-3.5 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
        </svg>
        Connect to Slack
      </button>
    </div>
  );
}
