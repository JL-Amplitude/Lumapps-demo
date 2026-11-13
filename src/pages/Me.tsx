import { useNavigate } from "react-router-dom";
import { LogOut, Plug } from "lucide-react";
import { useSession } from "../lib/session";

export default function Me() {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const s = session!;
  const rows: [string, string][] = [
    ["Amplitude User ID", s.userId],
    ["Company (account group)", `${s.account.account_name} · ${s.account.account_id}`],
    ["Industry / plan", `${s.account.industry} · ${s.account.plan_tier}`],
    ["CSM owner", s.account.csm_owner],
    ["Workforce type", s.workforceType.replace("_", " ")],
    ["Login method", s.loginMethod.replace(/_/g, " ")],
    ["Corporate SSO", s.ssoEnabled ? "Yes" : "No"],
    ["Email", s.email],
  ];
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">My account</h1>
      <div className="card divide-y divide-slate-100">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
            <span className="text-slate-500">{k}</span>
            <span className={`font-medium ${k === "Amplitude User ID" ? "font-mono" : "capitalize"}`}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate("/integrations")} className="btn-ghost w-full md:hidden"><Plug size={16} /> Integrations</button>
      <button onClick={() => { logout(); navigate("/login", { replace: true }); }} className="btn w-full bg-red-50 text-red-700 hover:bg-red-100">
        <LogOut size={16} /> Log out
      </button>
    </div>
  );
}
