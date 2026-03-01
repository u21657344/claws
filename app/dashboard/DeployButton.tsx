"use client";

import { useState } from "react";

const agents = [
  { id: "orchestrator", name: "Claws Orchestrator", icon: "⚡", description: "Auto-routes to the right specialist" },
  { id: "assistant", name: "Claws Assistant", icon: "🧠", description: "General chief of staff" },
  { id: "dev", name: "Claws Code", icon: "💻", description: "Engineering lead" },
  { id: "content", name: "Claws Content", icon: "✍️", description: "Content strategist" },
  { id: "sales", name: "Claws Outreach", icon: "📈", description: "Sales operator" },
];

export default function DeployButton() {
  const [selectedAgent, setSelectedAgent] = useState("assistant");
  const [open, setOpen] = useState(false);

  function handleConnectSlack() {
    window.location.href = `/api/slack/install?agent_type=${selectedAgent}`;
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-3 transition-colors"
        >
          + Deploy new agent
        </button>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">New deployment</p>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-white text-xs"
            >
              cancel
            </button>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
              Choose agent system
            </p>
            <div className="grid grid-cols-2 gap-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`rounded-xl border p-3 text-left transition-all flex items-start gap-3 ${
                    selectedAgent === agent.id
                      ? "border-violet-500/60 bg-violet-500/10"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-lg mt-0.5">{agent.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{agent.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{agent.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleConnectSlack}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-black font-semibold py-3 hover:bg-zinc-100 transition-colors"
          >
            Connect Slack workspace
          </button>
        </div>
      )}
    </div>
  );
}
