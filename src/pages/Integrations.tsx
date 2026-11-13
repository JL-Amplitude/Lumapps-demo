import { CheckCircle2, XCircle } from "lucide-react";
import { CONNECTOR_LABEL, type Connector } from "../data/agents";
import { useSession } from "../lib/session";

const DESC: Record<Connector, string> = {
  microsoft_365: "Outlook, Teams, SharePoint and OneDrive",
  google_workspace: "Gmail, Drive, Calendar and Chat",
  sap_successfactors: "Leave, payroll and employee records",
  servicenow: "IT tickets and service requests",
};

export default function Integrations() {
  const { session } = useSession();
  const connectors: Connector[] = ["microsoft_365", "google_workspace", "sap_successfactors", "servicenow"];
  const connected = (c: Connector) =>
    session!.ssoEnabled && (c === session!.account.primary_suite || c === "sap_successfactors" || c === "servicenow");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-slate-500">
          {session!.ssoEnabled
            ? "Your corporate account is connected — agents can act on your behalf."
            : "You signed in without a corporate account, so agents can't act in these tools for you yet."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {connectors.map((c) => (
          <div key={c} className="card flex items-start gap-4 p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
              {CONNECTOR_LABEL[c].split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
            <div className="flex-1">
              <h3 className="font-semibold">{CONNECTOR_LABEL[c]}</h3>
              <p className="text-sm text-slate-500">{DESC[c]}</p>
              <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${connected(c) ? "text-emerald-600" : "text-slate-400"}`}>
                {connected(c) ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {connected(c) ? "Connected" : "Not connected"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
