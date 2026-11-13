// Demo customer accounts — names and properties match the historical data
// already loaded in Amplitude (group type "account").

export interface Account {
  account_id: string;
  account_name: string;
  industry: string;
  plan_tier: "Essential" | "Business" | "Enterprise";
  csm_owner: string;
  region: string;
  primary_suite: "microsoft_365" | "google_workspace";
  domain: string;
}

export const ACCOUNTS: Account[] = [
  { account_id: "acc_1000", account_name: "Northwind Retail", industry: "Retail", plan_tier: "Business", csm_owner: "Noah Becker", region: "APAC", primary_suite: "google_workspace", domain: "northwindretail.com" },
  { account_id: "acc_1005", account_name: "Meridian Bank", industry: "Financial Services", plan_tier: "Essential", csm_owner: "Camille Durand", region: "LATAM", primary_suite: "google_workspace", domain: "meridianbank.com" },
  { account_id: "acc_1006", account_name: "Pinecrest Hospitals", industry: "Healthcare", plan_tier: "Enterprise", csm_owner: "Camille Durand", region: "APAC", primary_suite: "google_workspace", domain: "pinecresthealth.org" },
  { account_id: "acc_1008", account_name: "Oakridge Pharma", industry: "Pharma", plan_tier: "Enterprise", csm_owner: "Camille Durand", region: "LATAM", primary_suite: "microsoft_365", domain: "oakridgepharma.com" },
  { account_id: "acc_1015", account_name: "Harbor Grocers", industry: "Retail", plan_tier: "Enterprise", csm_owner: "Hugo Moreau", region: "LATAM", primary_suite: "microsoft_365", domain: "harborgrocers.com" },
  { account_id: "acc_1020", account_name: "Polaris Software", industry: "Technology", plan_tier: "Essential", csm_owner: "Sofia Rossi", region: "APAC", primary_suite: "google_workspace", domain: "polarissoftware.io" },
  { account_id: "acc_1030", account_name: "Cobalt Chemicals", industry: "Manufacturing", plan_tier: "Enterprise", csm_owner: "Camille Durand", region: "NA", primary_suite: "google_workspace", domain: "cobaltchem.com" },
];

export const suiteLabel = (s: Account["primary_suite"]) =>
  s === "microsoft_365" ? "Microsoft 365" : "Google Workspace";
