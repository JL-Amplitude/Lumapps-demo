import { useState } from "react";
import { X, Lock, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { CONNECTOR_LABEL, type Connector } from "../data/agents";
import type { Session } from "../lib/session";

export type DismissReason = "no_corporate_account" | "closed_prompt" | "timeout" | "mfa_failed";

interface Props {
  connector: Connector;
  session: Session;
  variant: "control" | "treatment";
  onAllow: (authMethod: "corporate_sso" | "lumapps_delegated") => void;
  onDismiss: (reason: DismissReason) => void;
}

export default function ConnectorModal({ connector, session, variant, onAllow, onDismiss }: Props) {
  const label = CONNECTOR_LABEL[connector];
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-900/50 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Sign in to ${label}`}>
      <div className="card w-full max-w-md rounded-b-none p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white"><Lock size={18} /></span>
            <div>
              <h3 className="font-bold">Connect {label}</h3>
              <p className="text-xs text-slate-500">The agent needs access to complete this task</p>
            </div>
          </div>
          <button onClick={() => onDismiss("closed_prompt")} aria-label="Close" className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        {session.ssoEnabled ? (
          <>
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 size={18} /> Connected as <b>{session.email}</b>
            </div>
            <p className="mt-3 text-sm text-slate-600">Allow the Lumapps agent to act on your behalf in {label}? You can revoke this at any time in Integrations.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => onDismiss("closed_prompt")} className="btn-ghost">Cancel</button>
              <button onClick={() => onAllow("corporate_sso")} className="btn-primary">Allow</button>
            </div>
          </>
        ) : (
          <>
            {variant === "treatment" && (
              <button onClick={() => onAllow("lumapps_delegated")}
                className="btn mb-4 w-full bg-gradient-to-r from-brand-600 to-violet-600 py-3 text-white">
                <Sparkles size={16} /> Authorise with your Lumapps frontline account
              </button>
            )}
            <p className="text-sm text-slate-600">Sign in with your <b>{session.account.account_name}</b> corporate account to continue.</p>
            <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); setError(true); }}>
              <input className="input" type="email" placeholder={`name@${session.account.domain}`} value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Corporate email" />
              <input className="input" type="password" placeholder="Password" value={pwd} onChange={(e) => setPwd(e.target.value)} aria-label="Password" />
              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle size={16} className="shrink-0" /> We couldn't find a corporate account for you. Frontline employees signed in with {session.loginMethod.replace(/_/g, " ")} don't have {label} access.
                </p>
              )}
              <button className="btn-primary w-full">Sign in</button>
            </form>
            <button onClick={() => onDismiss(error ? "mfa_failed" : "no_corporate_account")} className="mt-3 w-full text-center text-sm font-medium text-slate-500 underline-offset-2 hover:underline">
              I don't have a corporate account
            </button>
          </>
        )}
      </div>
    </div>
  );
}
