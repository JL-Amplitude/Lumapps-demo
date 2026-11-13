import { createContext, useContext, useState, type ReactNode } from "react";
import { ACCOUNTS, type Account } from "../data/accounts";
import { identifyEmployee, resetAnalytics, setContext } from "./analytics";

export type WorkforceType = "manager" | "knowledge_worker" | "frontline";
export type LoginMethod =
  | "sso_microsoft_365"
  | "sso_google_workspace"
  | "passwordless_sms"
  | "badge_qr_code"
  | "magic_link_personal_email";

export interface Session {
  userId: string;
  name: string;
  demoNumber: number;
  account: Account;
  workforceType: WorkforceType;
  loginMethod: LoginMethod;
  ssoEnabled: boolean;
  email: string;
  date: string;
}

const today = () => new Date().toISOString().split("T")[0];
const storageKey = () => `lumapps_demo_session_${today()}`;

export function generateUserId(name: string, demoNumber: number) {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "") || "user";
  return `${clean}_${demoNumber}_${today().replace(/-/g, "")}`;
}

function load(): Session | null {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    const account = ACCOUNTS.find((a) => a.account_id === s.account.account_id) ?? s.account;
    setContext(account);
    return { ...s, account };
  } catch {
    return null;
  }
}

interface Ctx {
  session: Session | null;
  login: (s: Omit<Session, "userId" | "date" | "ssoEnabled" | "email">) => Session;
  logout: () => void;
}

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(load);

  const login: Ctx["login"] = (input) => {
    const ssoEnabled = input.loginMethod.startsWith("sso_");
    const userId = generateUserId(input.name, input.demoNumber);
    const first = input.name.trim().split(/\s+/)[0]?.toLowerCase() || "employee";
    const s: Session = {
      ...input,
      userId,
      ssoEnabled,
      email: ssoEnabled ? `${first}@${input.account.domain}` : `${first}.personal@gmail.com`,
      date: today(),
    };
    identifyEmployee({ userId, ssoEnabled, workforceType: input.workforceType, account: input.account });
    try { localStorage.setItem(storageKey(), JSON.stringify(s)); } catch { /* storage unavailable */ }
    setSession(s);
    return s;
  };

  const logout = () => {
    try { localStorage.removeItem(storageKey()); } catch { /* ignore */ }
    resetAnalytics();
    setSession(null);
  };

  return <SessionContext.Provider value={{ session, login, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
