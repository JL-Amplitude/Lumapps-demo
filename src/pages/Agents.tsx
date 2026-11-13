import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, ShieldAlert, CheckCircle2, Star, ThumbsUp, ThumbsDown, Loader2, XCircle } from "lucide-react";
import { AGENTS, CONNECTOR_LABEL, LLM_MODELS, agentFromPrompt, type Agent, type Connector } from "../data/agents";
import { useSession } from "../lib/session";
import { reachedStep, track } from "../lib/analytics";
import ConnectorModal, { type DismissReason } from "../components/ConnectorModal";

type CardState = "draft" | "authorizing" | "completed" | "failed" | "abandoned";

interface Task {
  id: string;
  agent: Agent;
  prompt: string;
  connector: Connector;
  model: (typeof LLM_MODELS)[number];
  minutes: number;
  draft: string;
  done: string;
  state: CardState;
  reference?: string;
  rated?: number;
}

type Message = { role: "user"; text: string } | { role: "agent"; text: string; taskId?: string };

const FLAG_KEY = "connector-sign-in-prompt-dismissed-reduction";

function experimentVariant(): "control" | "treatment" {
  const param = new URLSearchParams(location.search).get("variant") || new URLSearchParams(location.hash.split("?")[1] || "").get("variant");
  try {
    if (param === "treatment" || param === "control") localStorage.setItem("lumapps_demo_variant", param);
    return (localStorage.getItem("lumapps_demo_variant") as "control" | "treatment") || "control";
  } catch {
    return param === "treatment" ? "treatment" : "control";
  }
}

const rand = (lo: number, hi: number) => Math.round(lo + Math.random() * (hi - lo));

export default function Agents() {
  const { session } = useSession();
  const [params, setParams] = useSearchParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [modalTask, setModalTask] = useState<string | null>(null);
  const variant = experimentVariant();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, typing]);

  const resolveConnector = (a: Agent): Connector => (a.connector === "primary_suite" ? session!.account.primary_suite : a.connector);

  const taskProps = (t: Task) => ({
    agent_task_id: t.id,
    agent_type: t.agent.type,
    agent_name: t.agent.name,
    connector: t.connector,
    llm_model: t.model,
  });

  const openAgent = (a: Agent) => {
    track("Agent Hub Opened", {
      agent_type: a.type,
      agent_task_id: `${a.name}-${Date.now()}`,
      agent_satisfaction_score: 4.6,
    });
    reachedStep(2);
    setAgent(a);
    setMessages([{ role: "agent", text: `Hi ${session!.name.split(" ")[0]}! I'm your ${a.type} agent. ${a.description} What can I do for you?` }]);
  };

  // Deep link from micro-apps: #/agents?agent=pto_leave_agent&prompt=...
  const handledDeepLink = useRef(false);
  useEffect(() => {
    if (handledDeepLink.current) return;
    const name = params.get("agent");
    const a = AGENTS.find((x) => x.name === name);
    if (a) {
      handledDeepLink.current = true;
      openAgent(a);
      const p = params.get("prompt");
      if (p) setTimeout(() => send(p, a), 300);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (id: string, patch: Partial<Task>) => setTasks((ts) => ({ ...ts, [id]: { ...ts[id], ...patch } }));

  const send = (text: string, forced?: Agent) => {
    const prompt = text.trim();
    if (!prompt) return;
    const a = forced ?? (agent?.type === "Knowledge Agent" ? agentFromPrompt(prompt) : agent ?? agentFromPrompt(prompt));
    const { draft, done, minutes } = a.action(prompt);
    const latency = rand(700, 3200);
    const task: Task = {
      id: `${a.type.slice(0, 3).toUpperCase().replace(/\W/g, "")}-${rand(1000, 9999)}`,
      agent: a, prompt, connector: resolveConnector(a),
      model: LLM_MODELS[rand(0, LLM_MODELS.length - 1)],
      minutes, draft, done, state: "draft",
    };
    setInput("");
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setTyping(true);
    setTimeout(() => {
      track("Agent Task Started", {
        ...taskProps(task),
        estimated_minutes_saved: minutes,
        response_latency_ms: latency,
        tokens_used: rand(500, 4500),
      });
      reachedStep(3);
      setTasks((ts) => ({ ...ts, [task.id]: task }));
      setMessages((m) => [...m, { role: "agent", text: draft, taskId: task.id }]);
      setTyping(false);
    }, Math.min(latency, 1400));
  };

  const authorise = (t: Task) => {
    if (variant === "treatment" || new URLSearchParams(location.search).has("variant")) {
      track("$exposure", { flag_key: FLAG_KEY, variant });
    }
    update(t.id, { state: "authorizing" });
    setModalTask(t.id);
  };

  const onAllow = (t: Task, authMethod: "corporate_sso" | "lumapps_delegated") => {
    setModalTask(null);
    track("Agent Action Authorized", {
      ...taskProps(t),
      corporate_sso_enabled: session!.ssoEnabled,
      task_effort_minutes: t.minutes,
      auth_method: authMethod,
    });
    reachedStep(4);
    setTyping(true);
    setTimeout(() => {
      const reference = `REQ-${Date.now()}`;
      let first = false;
      try { first = !localStorage.getItem("lumapps_demo_task_done"); localStorage.setItem("lumapps_demo_task_done", "1"); } catch { /* ignore */ }
      track("Agent Task Completed", {
        ...taskProps(t),
        request_reference_id: reference,
        resolution_status: "resolved",
        is_first_agent_task: first,
        response_latency_ms: rand(600, 2500),
        tokens_used: rand(300, 3000),
      });
      reachedStep(5);
      update(t.id, { state: "completed", reference });
      setTyping(false);
    }, 1200);
  };

  const onDismiss = (t: Task, reason: DismissReason) => {
    setModalTask(null);
    track("Connector Sign-In Prompt Dismissed", {
      ...taskProps(t),
      dismiss_reason: reason,
      connector_preauthorized: false,
    });
    update(t.id, { state: "failed" });
  };

  const abandon = (t: Task) => {
    track("Agent Task Abandoned", { ...taskProps(t), resolution_status: "abandoned_at_authorization" });
    update(t.id, { state: "abandoned" });
  };

  const rate = (t: Task, rating: number) => {
    track("Agent Response Rated", {
      agent_name: t.agent.name, agent_type: t.agent.type, rating,
      thumbs: rating >= 4 ? "up" : "down", llm_model: t.model, agent_task_id: t.id,
    });
    update(t.id, { rated: rating });
  };

  // ── Agent grid ────────────────────────────────────────────────────────────
  if (!agent) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Agent Hub</h1>
          <p className="text-sm text-slate-500">AI agents that get things done across {CONNECTOR_LABEL[session!.account.primary_suite]}, SAP SuccessFactors and ServiceNow.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a) => (
            <button key={a.type} onClick={() => openAgent(a)} className="card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
              <span className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl ${a.color}`}>{a.emoji}</span>
              <h3 className="mt-3 font-semibold">{a.type}</h3>
              <p className="mt-1 text-sm text-slate-500">{a.description}</p>
              <p className="mt-3 text-xs text-slate-400">Connects to {CONNECTOR_LABEL[resolveConnector(a)]}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Chat ──────────────────────────────────────────────────────────────────
  const modal = modalTask ? tasks[modalTask] : null;

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col md:h-[calc(100vh-8rem)]">
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => setAgent(null)} className="rounded-lg p-1.5 hover:bg-slate-200" aria-label="Back to Agent Hub"><ArrowLeft size={18} /></button>
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-lg ${agent.color}`}>{agent.emoji}</span>
        <div>
          <h1 className="font-bold leading-tight">{agent.type}</h1>
          <p className="text-xs text-slate-500">Connected to {CONNECTOR_LABEL[resolveConnector(agent)]}</p>
        </div>
      </div>

      <div className="card flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => {
          if (m.role === "user") return <div key={i} className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">{m.text}</div>;
          const t = m.taskId ? tasks[m.taskId] : undefined;
          return (
            <div key={i} className="max-w-[85%] space-y-2">
              <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-sm">{m.text}</div>
              {t && <TaskCard t={t} onAuthorise={() => authorise(t)} onAbandon={() => abandon(t)} onRate={(r) => rate(t, r)} />}
            </div>
          );
        })}
        {typing && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Agent is working…</div>}
        <div ref={bottom} />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {agent.prompts.map((p) => (
          <button key={p} onClick={() => send(p)} className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:ring-brand-500">{p}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-2 flex gap-2">
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask the ${agent.type} agent…`} aria-label="Message" />
        <button className="btn-primary px-3" aria-label="Send"><Send size={18} /></button>
      </form>

      {modal && (
        <ConnectorModal
          connector={modal.connector}
          session={session!}
          variant={variant}
          onAllow={(m) => onAllow(modal, m)}
          onDismiss={(r) => onDismiss(modal, r)}
        />
      )}
    </div>
  );
}

function TaskCard({ t, onAuthorise, onAbandon, onRate }: { t: Task; onAuthorise: () => void; onAbandon: () => void; onRate: (r: number) => void }) {
  const label = CONNECTOR_LABEL[t.connector];
  if (t.state === "draft" || t.state === "authorizing") {
    return (
      <div className="card border-brand-200 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drafted action · {t.id}</div>
        <p className="mt-1 text-sm">{t.prompt}</p>
        <p className="mt-1 text-xs text-slate-500">Saves ~{t.minutes} min · requires {label} access</p>
        <button onClick={onAuthorise} className="btn-primary mt-3 w-full">Authorise {label} to submit</button>
      </div>
    );
  }
  if (t.state === "completed") {
    return (
      <div className="card border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} /> {t.done}</div>
        <p className="mt-1 text-xs text-emerald-700">Reference {t.reference}</p>
        <div className="mt-3 flex items-center gap-1 text-xs text-slate-600">
          {t.rated ? <span>Thanks for rating {t.rated}/5!</span> : (
            <>
              Rate this agent:
              <button onClick={() => onRate(5)} aria-label="Thumbs up" className="rounded p-1 hover:bg-white"><ThumbsUp size={14} /></button>
              <button onClick={() => onRate(1)} aria-label="Thumbs down" className="rounded p-1 hover:bg-white"><ThumbsDown size={14} /></button>
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} onClick={() => onRate(r)} aria-label={`${r} stars`} className="text-amber-400 hover:scale-110"><Star size={16} fill="currentColor" /></button>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }
  if (t.state === "failed") {
    return (
      <div className="card border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-800"><ShieldAlert size={18} /> Task not completed</div>
        <p className="mt-1 text-xs text-amber-700">I couldn't get access to {label}, so I can't submit this for you.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onAuthorise} className="btn-ghost">Try again</button>
          <button onClick={onAbandon} className="btn bg-amber-600 text-white hover:bg-amber-700">Abandon task</button>
        </div>
      </div>
    );
  }
  return <div className="flex items-center gap-2 text-xs text-slate-500"><XCircle size={14} /> Task abandoned</div>;
}
