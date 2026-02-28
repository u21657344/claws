"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const agents = [
  {
    id: "assistant",
    name: "Claws Assistant",
    description: "Orchestrator + inbox manager + calendar agent + task tracker + daily briefing",
    icon: "🧠",
    tag: "Most popular",
  },
  {
    id: "dev",
    name: "Claws Code",
    description: "Orchestrator + PR reviewer + test writer + CI monitor + dependency auditor + code documenter",
    icon: "💻",
    tag: "For developers",
  },
  {
    id: "content",
    name: "Claws Content",
    description: "Orchestrator + ideation agent + writer + editor + scheduler + publisher",
    icon: "✍️",
    tag: "For creators",
  },
  {
    id: "sales",
    name: "Claws Outreach",
    description: "Orchestrator + lead finder + prospect researcher + outreach drafter + follow-up agent",
    icon: "📈",
    tag: "For founders",
  },
];

const channels = [
  { id: "slack", name: "Slack", available: true, recommended: true },
  { id: "discord", name: "Discord", available: true, recommended: false },
  { id: "telegram", name: "Telegram", available: true, recommended: false },
  { id: "whatsapp", name: "WhatsApp", available: false, recommended: false },
];

const SlackLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 127 127" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2H27.2V80z" fill="#E01E5A"/>
    <path d="M33.7 80c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
    <path d="M46.9 27.2c-7.3 0-13.2-5.9-13.2-13.2C33.7 6.7 39.6.8 46.9.8c7.3 0 13.2 5.9 13.2 13.2V27.2H46.9z" fill="#36C5F0"/>
    <path d="M46.9 33.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H46.9z" fill="#36C5F0"/>
    <path d="M99.8 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.8V46.9z" fill="#2EB67D"/>
    <path d="M93.3 46.9c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.9C66.9 6.6 72.8.7 80.1.7c7.3 0 13.2 5.9 13.2 13.2V46.9z" fill="#2EB67D"/>
    <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8H80.1z" fill="#ECB22E"/>
    <path d="M80.1 93.3c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2h-33z" fill="#ECB22E"/>
  </svg>
);

const DiscordLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const TelegramLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

const WhatsAppLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

const traditional = [
  { task: "Pick an agent framework (CrewAI, AutoGen…)", time: "15 min" },
  { task: "Provision a VM or container", time: "15 min" },
  { task: "Install dependencies & runtimes", time: "10 min" },
  { task: "Define agent roles & tool chains", time: "20 min" },
  { task: "Wire up API keys & env vars", time: "10 min" },
  { task: "Connect messaging channel", time: "5 min" },
  { task: "Debug inter-agent communication", time: "25 min" },
];

const useCases = [
  {
    category: "Claws Assistant",
    items: [
      "Daily briefing of emails, tasks & meetings that need your attention",
      "Auto-schedule meetings and send calendar invites without back-and-forth",
      "Triage your inbox and draft replies while you sleep",
    ],
  },
  {
    category: "Claws Code",
    items: [
      "Automated PR reviews with inline suggestions before you even look",
      "Write and run tests, then report failures straight to Slack",
      "Monitor CI pipelines and flag broken builds instantly",
    ],
  },
  {
    category: "Claws Content",
    items: [
      "End-to-end blog pipeline: outline → draft → edit → publish",
      "Repurpose long-form content into social posts, threads & newsletters",
      "SEO audit + rewrite suggestions in one command",
    ],
  },
  {
    category: "Claws Outreach",
    items: [
      "Find and research prospects before your first message is sent",
      "Draft personalised outreach at scale without sounding like a bot",
      "Auto follow-up on cold leads so no deal falls through the cracks",
    ],
  },
];

const GoogleIcon = () => (
  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Home() {
  const [selectedAgent, setSelectedAgent] = useState("assistant");
  const [selectedChannel, setSelectedChannel] = useState("slack");

  function handleSignIn() {
    signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans overflow-x-hidden">

      {/* Particle / dot grid background */}
      <div className="fixed inset-0 dot-grid pointer-events-none" />
      {/* Radial fade over the dot grid */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, #080808 100%)" }} />

      {/* Floating glow orbs */}
      <div className="fixed top-[-120px] left-[10%] w-[500px] h-[500px] rounded-full pointer-events-none float-slow pulse-glow"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)" }} />
      <div className="fixed top-[30%] right-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none float-slower pulse-glow"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />
      <div className="fixed bottom-[10%] left-[5%] w-[350px] h-[350px] rounded-full pointer-events-none float-slow pulse-glow"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)", animationDelay: "4s" }} />

      {/* Content */}
      <div className="relative z-10">

        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
          <span className="text-xl font-bold tracking-tight text-white">Claws</span>
          <a href="#deploy" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Get started →
          </a>
        </nav>

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 mb-6 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-300 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 pulse-glow" />
            Multi-agent systems, deployed in seconds
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
            Deploy your multi-agent
            <br />
            system in under{" "}
            <span className="text-white underline decoration-zinc-600 underline-offset-4">1 minute</span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Skip the complexity. One-click deploy a 24/7 active multi-agent
            pipeline — pre-configured, production-ready, and connected to your
            favourite messaging channel.
          </p>
        </section>

        {/* Non-technical callout strip */}
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: "🚫", label: "No code", sub: "Zero lines written by you" },
              { icon: "🖥️", label: "No servers", sub: "We handle all the infra" },
              { icon: "🔑", label: "No API keys", sub: "Pre-wired and ready to go" },
            ].map((item) => (
              <div key={item.label}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm p-5 text-center card-glow transition-all">
                <span className="text-2xl block mb-2">{item.icon}</span>
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{item.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Deploy Card */}
        <section id="deploy" className="max-w-2xl mx-auto px-6 pb-24">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm p-8 space-y-8"
            style={{ boxShadow: "0 0 60px rgba(124,58,237,0.06)" }}>

            {/* Agent selection */}
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
                Choose your agent system
              </p>
              <div className="grid grid-cols-2 gap-3">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={`rounded-xl border p-4 text-left transition-all card-glow ${
                      selectedAgent === agent.id
                        ? "border-violet-500/60 bg-violet-500/10"
                        : "border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xl">{agent.icon}</span>
                      <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-0.5 leading-tight">
                        {agent.tag}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      {agent.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Channel selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  Connect your channel
                </p>
              </div>
              <div className="flex gap-3">
                {channels.map((ch) => (
                  <div key={ch.id} className="flex-1 relative">
                    {ch.recommended && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-600 text-white badge-pulse whitespace-nowrap">
                        ★ Recommended
                      </span>
                    )}
                    <button
                      onClick={() => ch.available && setSelectedChannel(ch.id)}
                      disabled={!ch.available}
                      className={`w-full rounded-xl border py-3 px-2 text-sm font-medium transition-all flex flex-col items-center justify-center gap-2 ${
                        !ch.available
                          ? "border-zinc-800 text-zinc-700 cursor-not-allowed"
                          : selectedChannel === ch.id && ch.recommended
                          ? "slack-selected bg-violet-500/10 text-white"
                          : selectedChannel === ch.id
                          ? "border-white bg-zinc-800 text-white"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white"
                      }`}
                    >
                      {ch.id === "slack" && <SlackLogo className="w-6 h-6" />}
                      {ch.id === "discord" && <DiscordLogo className={`w-6 h-6 ${!ch.available ? "text-zinc-700" : selectedChannel === ch.id ? "text-[#5865F2]" : "text-zinc-500"}`} />}
                      {ch.id === "telegram" && <TelegramLogo className={`w-6 h-6 ${!ch.available ? "text-zinc-700" : selectedChannel === ch.id ? "text-[#26A5E4]" : "text-zinc-500"}`} />}
                      {ch.id === "whatsapp" && <WhatsAppLogo className="w-6 h-6 text-zinc-700" />}
                      <span className="text-xs">{ch.name}</span>
                      {!ch.available && (
                        <span className="text-[10px] text-zinc-600 -mt-1">soon</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-black font-semibold py-3.5 hover:bg-zinc-100 transition-colors"
              >
                <GoogleIcon />
                Sign in with Google to deploy
              </button>
              <p className="text-center text-xs text-zinc-600">
                Limited cloud slots — only{" "}
                <span className="text-zinc-400 font-medium">11 left</span>
              </p>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="max-w-3xl mx-auto px-6 pb-24">
          <h2 className="text-3xl font-bold text-center mb-4">
            Why not just build it yourself?
          </h2>
          <p className="text-center text-zinc-500 mb-12">
            You could. Or you could have it running before your next meeting.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-6">
              <p className="text-sm font-semibold text-red-400 mb-1">The DIY way</p>
              <p className="text-3xl font-bold mb-6">
                100+{" "}
                <span className="text-base font-normal text-zinc-500">minutes</span>
              </p>
              <div className="space-y-3">
                {traditional.map((step, i) => (
                  <div key={i} className="flex justify-between items-start gap-4">
                    <p className="text-sm text-zinc-400 leading-snug">{step.task}</p>
                    <span className="text-xs text-zinc-600 whitespace-nowrap">{step.time}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-700 italic">
                Not technical? Multiply by 10. Then give up.
              </p>
            </div>

            <div className="rounded-2xl border border-violet-500/30 bg-zinc-900/60 backdrop-blur-sm p-6 flex flex-col justify-between"
              style={{ boxShadow: "0 0 30px rgba(124,58,237,0.08)" }}>
              <div>
                <p className="text-sm font-semibold text-violet-400 mb-1">Claws</p>
                <p className="text-3xl font-bold mb-6">
                  &lt;1{" "}
                  <span className="text-base font-normal text-zinc-500">minute</span>
                </p>
                <div className="space-y-3">
                  {[
                    "Pick your agent system",
                    "Choose your channel",
                    "Sign in with Google",
                    "Done. Agents are live.",
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xs flex-shrink-0">
                        ✓
                      </span>
                      <p className="text-sm text-zinc-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-8 rounded-xl bg-zinc-800/60 border border-zinc-700 p-4">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  No VMs. No SSH. No env files. No reading documentation at 11pm.
                  Your agents are running before you finish your coffee.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="max-w-3xl mx-auto px-6 pb-24">
          <h2 className="text-3xl font-bold text-center mb-4">
            What your agents actually do
          </h2>
          <p className="text-center text-zinc-500 mb-12">
            Not just chat. Full workflows — running while you sleep.
          </p>
          <div className="grid grid-cols-2 gap-6">
            {useCases.map((uc) => (
              <div key={uc.category}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-6 card-glow transition-all">
                <p className="text-sm font-semibold text-white mb-4">{uc.category}</p>
                <ul className="space-y-2">
                  {uc.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-violet-600 mt-0.5">—</span>
                      <span className="text-sm text-zinc-400 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-2xl mx-auto px-6 pb-32 text-center">
          <h2 className="text-3xl font-bold mb-4">
            You don&apos;t need to be technical.
            <br />
            <span className="text-white">You just need Claws.</span>
          </h2>
          <p className="text-zinc-500 mb-8">
            One click. Agents live. No engineers harmed in the making.
          </p>
          <button
            onClick={handleSignIn}
            className="inline-flex items-center gap-3 rounded-xl bg-white text-black font-semibold px-8 py-4 hover:bg-zinc-100 transition-colors"
            style={{ boxShadow: "0 0 40px rgba(255,255,255,0.1)" }}
          >
            <GoogleIcon />
            Sign in with Google — it&apos;s free
          </button>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-700">
          <p>
            Built with Claws · For questions,{" "}
            <a href="mailto:support@claws.dev"
              className="text-zinc-500 hover:text-white transition-colors">
              contact support
            </a>
          </p>
        </footer>

      </div>
    </div>
  );
}
