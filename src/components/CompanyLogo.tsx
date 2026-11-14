import type { Account } from "../data/accounts";
import northwind from "../assets/brands/northwind.svg";
import meridian from "../assets/brands/meridian.svg";
import pinecrest from "../assets/brands/pinecrest.svg";
import oakridge from "../assets/brands/oakridge.svg";
import harbor from "../assets/brands/harbor.svg";
import polaris from "../assets/brands/polaris.svg";
import cobalt from "../assets/brands/cobalt.svg";

const BRANDS = {
  acc_1000: { mark: northwind, name: "northwind", descriptor: "RETAIL", color: "#126b79" },
  acc_1005: { mark: meridian, name: "meridian", descriptor: "BANK", color: "#263661" },
  acc_1006: { mark: pinecrest, name: "pinecrest", descriptor: "HOSPITALS", color: "#20634f" },
  acc_1008: { mark: oakridge, name: "oakridge", descriptor: "PHARMA", color: "#66508d" },
  acc_1015: { mark: harbor, name: "harbor", descriptor: "GROCERS", color: "#236f69" },
  acc_1020: { mark: polaris, name: "polaris", descriptor: "SOFTWARE", color: "#5146a5" },
  acc_1030: { mark: cobalt, name: "cobalt", descriptor: "CHEMICALS", color: "#295da0" },
};

type Company = Pick<Account, "account_id" | "account_name">;

export function CompanyMark({ account, className = "h-10 w-10" }: { account: Company; className?: string }) {
  const brand = BRANDS[account.account_id as keyof typeof BRANDS];
  return brand ? <img src={brand.mark} alt="" aria-hidden="true" className={`shrink-0 ${className}`} /> : (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-xl bg-brand-50 font-bold text-brand-700 ${className}`}>
      {account.account_name.charAt(0)}
    </span>
  );
}

export default function CompanyLogo({ account, compact = false }: { account: Company; compact?: boolean }) {
  const brand = BRANDS[account.account_id as keyof typeof BRANDS];
  return (
    <span role="img" aria-label={account.account_name} className="inline-flex min-w-0 items-center gap-2.5">
      <CompanyMark account={account} className={compact ? "h-9 w-9" : "h-10 w-10"} />
      {!compact && (
        <span aria-hidden="true" className="min-w-0 leading-none" style={{ color: brand?.color }}>
          <span className="block text-[21px] font-bold tracking-[-0.045em]">{brand?.name ?? account.account_name}</span>
          {brand && <span className="mt-1.5 block text-[8px] font-semibold tracking-[0.24em] opacity-75">{brand.descriptor}</span>}
        </span>
      )}
    </span>
  );
}
