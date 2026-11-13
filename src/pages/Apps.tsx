import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Palmtree, Inbox, Receipt, Users, Search, Bot, Check, X } from "lucide-react";
import { DIRECTORY } from "../data/content";
import { track } from "../lib/analytics";

type AppId = "pto" | "approvals" | "expense" | "directory";

const APPS: { id: AppId; label: string; desc: string; icon: typeof Inbox; color: string }[] = [
  { id: "pto", label: "Time off", desc: "Request PTO or check your balance", icon: Palmtree, color: "bg-emerald-500" },
  { id: "approvals", label: "Approvals", desc: "3 items waiting for you", icon: Inbox, color: "bg-brand-500" },
  { id: "expense", label: "Expenses", desc: "Submit a receipt in seconds", icon: Receipt, color: "bg-rose-500" },
  { id: "directory", label: "Directory", desc: "Find colleagues and experts", icon: Users, color: "bg-violet-500" },
];

const APPROVALS = [
  { id: "ap1", who: "Tom Becker", what: "PTO · 2 days (Dec 23–24)" },
  { id: "ap2", who: "Elena García", what: "Expense · €48.20 taxi" },
  { id: "ap3", who: "Raj Patel", what: "Training · Excel advanced" },
];

export default function Apps() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const active = (params.get("app") as AppId | null) ?? null;
  const [q, setQ] = useState("");
  const [decided, setDecided] = useState<Record<string, "approved" | "rejected">>({});
  const [pto, setPto] = useState({ from: "", to: "", type: "Annual leave" });

  const open = (id: AppId) => {
    track("Micro App Opened", { micro_app: id });
    setParams({ app: id });
  };

  const viaAgent = (agent: string, prompt: string) => navigate(`/agents?agent=${agent}&prompt=${encodeURIComponent(prompt)}`);

  const people = DIRECTORY.filter((p) => (p.name + p.title + p.dept + p.location).toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workflows & micro-apps</h1>
        <p className="text-sm text-slate-500">Everyday tasks without switching tools.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {APPS.map(({ id, label, desc, icon: Icon, color }) => (
          <button key={id} onClick={() => open(id)} className={`card p-4 text-left transition hover:shadow-md ${active === id ? "ring-2 ring-brand-500" : ""}`}>
            <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${color}`}><Icon size={18} /></span>
            <h3 className="mt-2 font-semibold">{label}</h3>
            <p className="text-xs text-slate-500">{desc}</p>
          </button>
        ))}
      </div>

      {active === "pto" && (
        <section className="card max-w-xl space-y-4 p-5">
          <h2 className="font-bold">Request time off</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="from">From</label><input id="from" type="date" className="input" value={pto.from} onChange={(e) => setPto({ ...pto, from: e.target.value })} /></div>
            <div><label className="label" htmlFor="to">To</label><input id="to" type="date" className="input" value={pto.to} onChange={(e) => setPto({ ...pto, to: e.target.value })} /></div>
          </div>
          <select className="input" value={pto.type} onChange={(e) => setPto({ ...pto, type: e.target.value })} aria-label="Leave type">
            <option>Annual leave</option><option>Sick leave</option><option>Parental leave</option>
          </select>
          <button className="btn-primary w-full" onClick={() => viaAgent("pto_leave_agent", `Request ${pto.type.toLowerCase()} ${pto.from ? `from ${pto.from} to ${pto.to || pto.from}` : "next week"}`)}>
            <Bot size={16} /> Submit with the PTO & Leave agent
          </button>
          <p className="text-xs text-slate-500">Balance: 17 days · Requests are submitted to SAP SuccessFactors.</p>
        </section>
      )}

      {active === "approvals" && (
        <section className="card max-w-xl divide-y divide-slate-100">
          {APPROVALS.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 p-4">
              <div><div className="text-sm font-semibold">{a.who}</div><div className="text-xs text-slate-500">{a.what}</div></div>
              {decided[a.id] ? <span className={`chip ${decided[a.id] === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{decided[a.id]}</span> : (
                <div className="flex gap-2">
                  {(["approved", "rejected"] as const).map((d) => (
                    <button key={d} aria-label={d === "approved" ? "Approve" : "Reject"}
                      onClick={() => { track("Approval Submitted", { approval_decision: d, approval_type: a.what.split(" ")[0].toLowerCase() }); setDecided({ ...decided, [a.id]: d }); }}
                      className={`grid h-9 w-9 place-items-center rounded-xl ${d === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {d === "approved" ? <Check size={16} /> : <X size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {active === "expense" && (
        <section className="card max-w-xl space-y-3 p-5">
          <h2 className="font-bold">New expense</h2>
          <input className="input" placeholder="Description (e.g. Taxi to client site)" aria-label="Description" id="exp-desc" />
          <input className="input" type="number" placeholder="Amount (€)" aria-label="Amount" id="exp-amt" />
          <button className="btn-primary w-full" onClick={() => {
            const d = (document.getElementById("exp-desc") as HTMLInputElement).value || "taxi receipt";
            const a = (document.getElementById("exp-amt") as HTMLInputElement).value || "32";
            viaAgent("expense_approvals", `Submit my ${d} (€${a})`);
          }}><Bot size={16} /> Submit with the Expense agent</button>
        </section>
      )}

      {active === "directory" && (
        <section className="space-y-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search by name, role, team or city" value={q}
              onChange={(e) => setQ(e.target.value)}
              onBlur={() => q && track("Directory Searched", { search_query: q, results_returned: people.length })} aria-label="Search directory" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {people.map((p) => (
              <button key={p.name} onClick={() => track("Employee Profile Viewed", { profile_department: p.dept, profile_location: p.location })} className="card p-4 text-left hover:shadow-md">
                <span className={`grid h-12 w-12 place-items-center rounded-full font-semibold text-white ${p.color}`}>{p.initials}</span>
                <h3 className="mt-2 font-semibold">{p.name}</h3>
                <p className="text-sm text-slate-600">{p.title}</p>
                <p className="text-xs text-slate-500">{p.dept} · {p.location}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
