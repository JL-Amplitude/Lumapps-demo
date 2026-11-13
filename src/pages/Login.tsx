import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, QrCode, Mail, ShieldCheck, ArrowLeft } from "lucide-react";
import { ACCOUNTS, suiteLabel } from "../data/accounts";
import { generateUserId, useSession, type LoginMethod, type WorkforceType } from "../lib/session";
import { track, trackAnonymous } from "../lib/analytics";
import Logo from "../components/Logo";

const FRONTLINE_METHODS: { id: LoginMethod; label: string; icon: typeof Smartphone }[] = [
  { id: "passwordless_sms", label: "SMS code", icon: Smartphone },
  { id: "badge_qr_code", label: "Badge QR", icon: QrCode },
  { id: "magic_link_personal_email", label: "Personal email link", icon: Mail },
];

export default function Login() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [demoNumber, setDemoNumber] = useState(1);
  const [accountId, setAccountId] = useState(ACCOUNTS[0].account_id);
  const [workforce, setWorkforce] = useState<WorkforceType>("knowledge_worker");
  const [frontlineStep, setFrontlineStep] = useState<null | LoginMethod>(null);
  const [code, setCode] = useState("");
  const viewed = useRef(false);

  const account = ACCOUNTS.find((a) => a.account_id === accountId)!;
  const ssoMethod: LoginMethod = account.primary_suite === "microsoft_365" ? "sso_microsoft_365" : "sso_google_workspace";

  useEffect(() => {
    if (viewed.current) return; // StrictMode double-mount guard
    viewed.current = true;
    trackAnonymous("Login Page Viewed", {
      login_options_shown: ["sso", "passwordless"],
      entry_point: new URLSearchParams(location.search).get("entry") || "bookmark",
    });
  }, []);

  const finish = (loginMethod: LoginMethod) => {
    if (!name.trim()) return;
    login({ name: name.trim(), demoNumber, account, workforceType: workforce, loginMethod });
    track("Login Completed", {
      login_method: loginMethod,
      has_corporate_email: loginMethod.startsWith("sso_"),
      first_login: true,
    });
    navigate("/", { replace: true });
  };

  const valid = name.trim().length > 0;

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-violet-700 p-12 text-white md:flex">
        <Logo compact />
        <div>
          <h1 className="text-4xl font-bold leading-tight">Your whole company,<br />one place.</h1>
          <p className="mt-4 max-w-md text-brand-100">News, AI agents, shifts and everyday apps for every employee — at a desk, on the floor or on the move.</p>
        </div>
        <p className="text-xs text-brand-100">Amplitude × Lumapps demo environment · data is fictional</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden"><Logo /></div>

          {!frontlineStep ? (
            <>
              <h2 className="text-2xl font-bold">Sign in to your intranet</h2>
              <p className="mt-1 text-sm text-slate-500">Choose your company and how you sign in.</p>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="label" htmlFor="name">Name</label>
                    <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Joe Smith" />
                  </div>
                  <div>
                    <label className="label" htmlFor="demo">Demo #</label>
                    <input id="demo" type="number" min={1} className="input" value={demoNumber} onChange={(e) => setDemoNumber(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="company">Company</label>
                  <select id="company" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                    {ACCOUNTS.map((a) => <option key={a.account_id} value={a.account_id}>{a.account_name} — {a.industry}</option>)}
                  </select>
                </div>
                <div>
                  <span className="label">Workforce type</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["manager", "knowledge_worker", "frontline"] as WorkforceType[]).map((w) => (
                      <button key={w} type="button" onClick={() => setWorkforce(w)}
                        className={`rounded-xl border px-2 py-2 text-xs font-semibold capitalize ${workforce === w ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600"}`}>
                        {w.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                  Amplitude User ID: <code className="font-mono font-semibold text-slate-800">{generateUserId(name, demoNumber)}</code>
                </div>

                <button disabled={!valid} onClick={() => finish(ssoMethod)} className="btn-primary w-full">
                  <ShieldCheck size={16} /> Sign in with SSO ({suiteLabel(account.primary_suite)})
                </button>

                <div className="relative py-1 text-center text-xs text-slate-400">
                  <span className="bg-slate-50 px-2">No corporate email?</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {FRONTLINE_METHODS.map(({ id, label, icon: Icon }) => (
                    <button key={id} disabled={!valid} onClick={() => { setFrontlineStep(id); setCode(""); }}
                      className="btn-ghost flex-col py-3 text-xs">
                      <Icon size={18} /> {label}
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-slate-400">Frontline sign-in for store, plant and clinic staff</p>
              </div>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6) finish(frontlineStep); }}>
              <button type="button" onClick={() => setFrontlineStep(null)} className="mb-6 flex items-center gap-1 text-sm text-slate-500"><ArrowLeft size={16} /> Back</button>
              <h2 className="text-2xl font-bold">Enter your code</h2>
              <p className="mt-1 text-sm text-slate-500">
                {frontlineStep === "badge_qr_code" ? "Scan your badge at the kiosk, then enter the 6-digit code shown." :
                  frontlineStep === "passwordless_sms" ? "We sent a 6-digit code to your phone." : "We emailed a 6-digit code to your personal address."}
                {" "}Any code works in this demo.
              </p>
              <input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="input mt-6 text-center font-mono text-2xl tracking-[0.5em]" placeholder="••••••" aria-label="Verification code" />
              <button disabled={code.length !== 6} className="btn-primary mt-4 w-full">Verify & sign in</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
