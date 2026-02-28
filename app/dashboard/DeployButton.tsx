"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const agents = [
  { id: "assistant", name: "Claws Assistant", icon: "🧠" },
  { id: "dev", name: "Claws Code", icon: "💻" },
  { id: "content", name: "Claws Content", icon: "✍️" },
  { id: "sales", name: "Claws Outreach", icon: "📈" },
];

export default function DeployButton() {
  const [selectedAgent, setSelectedAgent] = useState("assistant");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleConnectSlack() {
    router.push(`/api/slack/install?agent_type=${selectedAgent}`);
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
                  className={`rounded-xl border p-3 text-left transition-all flex items-center gap-3 ${
                    selectedAgent === agent.id
                      ? "border-violet-500/60 bg-violet-500/10"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-lg">{agent.icon}</span>
                  <span className="text-sm font-medium">{agent.name}</span>
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
