import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ACCOUNTS } from "../data/accounts";
import { CompanyMark } from "./CompanyLogo";

export default function CompanyPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = Math.max(0, ACCOUNTS.findIndex((account) => account.account_id === value));
  const [active, setActive] = useState(selected);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLLIElement | null)[]>([]);
  const search = useRef({ value: "", time: 0 });
  const listId = useId();
  const account = ACCOUNTS[selected];

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (open) options.current[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (index: number) => {
    onChange(ACCOUNTS[index].account_id);
    setActive(index);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(open ? (active + (event.key === "ArrowDown" ? 1 : -1) + ACCOUNTS.length) % ACCOUNTS.length : selected);
      setOpen(true);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const index = event.key === "Home" ? 0 : ACCOUNTS.length - 1;
      if (open) setActive(index); else choose(index);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active); else { setActive(selected); setOpen(true); }
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const query = (now - search.current.time < 700 ? search.current.value : "") + event.key.toLowerCase();
      search.current = { value: query, time: now };
      const index = ACCOUNTS.findIndex((item) => item.account_name.toLowerCase().startsWith(query));
      if (index >= 0) { if (open) setActive(index); else choose(index); }
    }
  };

  return (
    <div ref={root} className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <label id={`${listId}-label`} className="label" htmlFor="company">Company</label>
      <button ref={trigger} id="company" type="button" role="combobox" aria-haspopup="listbox"
        aria-expanded={open} aria-controls={listId} aria-labelledby={`${listId}-label ${listId}-value`}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onKeyDown={onKeyDown} onClick={() => { setActive(selected); setOpen(!open); }}
        className={`company-picker-trigger ${open ? "company-picker-trigger-open" : ""}`}>
        <CompanyMark account={account} />
        <span id={`${listId}-value`} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-semibold text-ink">{account.account_name}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{account.industry}</span>
        </span>
        <ChevronDown size={17} aria-hidden="true" className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="company-picker-menu">
          <div className="flex items-center justify-between px-3 pb-2 pt-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Choose your company</span>
            <span aria-hidden="true" className="text-[10px] text-slate-400">{ACCOUNTS.length} workspaces</span>
          </div>
          <ul id={listId} role="listbox" aria-labelledby={`${listId}-label`} className="company-picker-options">
            {ACCOUNTS.map((item, index) => (
              <li key={item.account_id} id={`${listId}-${index}`} role="option" aria-selected={index === selected}
                ref={(element) => { options.current[index] = element; }}
                onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}
                className={`company-picker-option ${index === selected ? "company-picker-option-selected" : ""} ${index === active ? "company-picker-option-active" : ""}`}>
                <CompanyMark account={item} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{item.account_name}</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-500">{item.industry}</span>
                </span>
                {index === selected && <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white"><Check size={12} strokeWidth={3} /></span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
