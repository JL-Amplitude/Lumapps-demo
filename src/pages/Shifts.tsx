import { useState } from "react";
import { MapPin, Clock, Repeat, ClipboardCheck, FileWarning, Wallet, HeartPulse, GraduationCap, CheckCircle2, X } from "lucide-react";
import { SHIFT_LOCATIONS, shiftsFor } from "../data/content";
import { useSession } from "../lib/session";
import { track } from "../lib/analytics";
import { useTrackOnce } from "../lib/useTrackOnce";

type Range = "today" | "this_week" | "next_week";

export default function Shifts() {
  const { session } = useSession();
  const [range, setRange] = useState<Range>("this_week");
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<null | "incident" | "safety">(null);
  const location = SHIFT_LOCATIONS[session!.account.account_name.length % SHIFT_LOCATIONS.length];
  const all = shiftsFor(range === "next_week" ? "next_week" : "this_week", location);
  const shifts = range === "today" ? all.slice(0, 1) : all;

  useTrackOnce("Shift Schedule Viewed", {
    shift_location: location,
    shift_hours: shifts.reduce((s, x) => s + x.hours, 0),
    view_range: range,
  }, [range]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const submitForm = (type: "incident" | "safety") => {
    track("Digital Form Submitted", { form_type: type === "incident" ? "incident_report" : "safety_checklist", shift_location: location });
    setForm(null);
    notify(type === "incident" ? "Incident report submitted to your site lead." : "Safety checklist completed ✔");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Shift</h1>
        <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {location} · {session!.account.account_name}</p>
      </div>

      <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200">
        {(["today", "this_week", "next_week"] as Range[]).map((r) => (
          <button key={r} onClick={() => setRange(r)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${range === r ? "bg-brand-600 text-white" : "text-slate-600"}`}>
            {r.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shifts.map((s) => (
          <div key={s.date} className="card flex items-center gap-4 p-4">
            <div className="w-14 text-center">
              <div className="text-xs font-semibold uppercase text-slate-500">{s.day}</div>
              <div className="text-lg font-bold">{s.date.split(" ")[0]}</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 font-semibold"><Clock size={15} /> {s.start} – {s.end} <span className="text-xs font-normal text-slate-500">({s.hours}h)</span></div>
              <div className="text-sm text-slate-500">{s.role} · {s.location}</div>
            </div>
            <button onClick={() => { track("Shift Swap Requested", { shift_location: s.location, shift_hours: s.hours }); notify(`Swap requested for ${s.day} ${s.date}`); }}
              className="btn-ghost px-3 py-2 text-xs"><Repeat size={14} /> Swap</button>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Forms & HR services</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Tile icon={FileWarning} label="Incident report" color="bg-red-500" onClick={() => setForm("incident")} />
          <Tile icon={ClipboardCheck} label="Safety checklist" color="bg-amber-500" onClick={() => setForm("safety")} />
          <Tile icon={Wallet} label="My payslip" color="bg-emerald-500" onClick={() => notify("Ask the HR Assistant in Agents to fetch your payslip.")} />
          <Tile icon={HeartPulse} label="Benefits" color="bg-pink-500" onClick={() => notify("Open enrollment closes Friday.")} />
          <Tile icon={GraduationCap} label="Training" color="bg-violet-500" onClick={() => notify("2 mandatory courses due this month.")} />
        </div>
      </section>

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-slate-900/50 sm:place-items-center sm:p-4">
          <form onSubmit={(e) => { e.preventDefault(); submitForm(form); }} className="card w-full max-w-md space-y-3 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{form === "incident" ? "Incident report" : "Opening safety checklist"}</h3>
              <button type="button" onClick={() => setForm(null)} aria-label="Close"><X size={18} /></button>
            </div>
            {form === "incident" ? (
              <>
                <select className="input" aria-label="Incident type"><option>Slip / trip</option><option>Equipment fault</option><option>Customer incident</option></select>
                <textarea className="input" rows={3} placeholder="What happened?" aria-label="Description" />
              </>
            ) : (
              ["Entrances gritted", "Fire exits clear", "First aid kit stocked", "Equipment checked"].map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" /> {c}</label>
              ))
            )}
            <button className="btn-primary w-full">Submit</button>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg md:bottom-8">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, color, onClick }: { icon: typeof Clock; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex items-center gap-3 p-4 text-left text-sm font-semibold hover:shadow-md">
      <span className={`grid h-10 w-10 place-items-center rounded-xl text-white ${color}`}><Icon size={18} /></span>{label}
    </button>
  );
}
