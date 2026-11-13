import { useId } from "react";

export default function Logo({ compact = false }: { compact?: boolean }) {
  const gid = `lg-${useId().replace(/:/g, "")}`;
  return (
    <span className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3b6cf6" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="28" height="28" rx="8" fill={`url(#${gid})`} />
        <circle cx="14" cy="14" r="5" fill="none" stroke="white" strokeWidth="2.5" />
        <circle cx="14" cy="14" r="1.8" fill="white" />
      </svg>
      {!compact && (
        <span className="text-lg font-bold tracking-tight text-ink">
          lumapps<span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase text-slate-500">demo</span>
        </span>
      )}
    </span>
  );
}
