// Thin wrapper around the Amplitude browser SDK loaded from the CDN in index.html.
// Every helper is a safe no-op if the script was blocked (ad blockers etc.).

import type { Account } from "../data/accounts";

export const AMPLITUDE_API_KEY = "27102618266a9b31a1f00273dabb7a13";

type Props = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const amp = (): any => (window as any).amplitude;

let initialised = false;
let context: { account_id?: string } = {};
let deepestStep = 0;

export function platformChannel(): "web" | "mobile_app" {
  return /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile_app" : "web";
}

export function initAnalytics() {
  if (initialised || !amp()) return;
  initialised = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.sessionReplay) amp().add(w.sessionReplay.plugin({ sampleRate: 1 }));
  if (w.engagement) amp().add(w.engagement.plugin());
  amp().init(AMPLITUDE_API_KEY, { fetchRemoteConfig: true, autocapture: true });

  // session_ended — fired when the tab is hidden / closed
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && amp()?.getUserId?.()) {
      amp().setTransport?.("beacon");
      track("session_ended", { deepest_funnel_step_reached: deepestStep, converted: deepestStep >= 5 });
      amp().flush?.();
      amp().setTransport?.("fetch");
    }
  });
}

export function setContext(account: Account | null) {
  context = account ? { account_id: account.account_id } : {};
}

/** Funnel steps 1–5, used to report the deepest step on session_ended. */
export function reachedStep(step: number) {
  deepestStep = Math.max(deepestStep, step);
}

export function track(event: string, props: Props = {}) {
  const payload = { ...props, ...context, platform_channel: platformChannel() };
  if (amp()) amp().track(event, payload);
  if (import.meta.env.DEV) console.info("[amplitude]", event, payload);
}

/** Anonymous event — fired before setUserId so Amplitude keeps it on the device ID. */
export function trackAnonymous(event: string, props: Props = {}) {
  const payload = { ...props, platform_channel: platformChannel() };
  if (amp()) amp().track(event, payload);
  if (import.meta.env.DEV) console.info("[amplitude:anon]", event, payload);
}

export interface IdentifyInput {
  userId: string;
  ssoEnabled: boolean;
  workforceType: string;
  account: Account;
}

export function identifyEmployee({ userId, ssoEnabled, workforceType, account }: IdentifyInput) {
  setContext(account);
  const a = amp();
  if (!a) return;
  a.setUserId(userId);

  const id = new a.Identify()
    .set("corporate_sso_enabled", ssoEnabled)
    .set("workforce_type", workforceType)
    .set("employee_tenure_days", ssoEnabled ? 400 : 30)
    .set("device_type", platformChannel() === "mobile_app" ? "mobile" : "desktop")
    .set("utm_medium", new URLSearchParams(location.search).get("utm_medium") || "direct");
  a.identify(id);

  // Accounts add-on: put the employee in their company's account group
  a.setGroup("account", account.account_name);
  const g = new a.Identify();
  for (const [k, v] of Object.entries(account)) g.set(k, v);
  a.groupIdentify("account", account.account_name, g);
}

export function resetAnalytics() {
  context = {};
  deepestStep = 0;
  amp()?.reset();
}
