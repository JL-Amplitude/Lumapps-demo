// Mock intranet content: news, announcements, recommendations, shifts, directory.

export const FEED_CHANNELS = ["Company News", "Leadership", "My Site", "HR Updates", "Safety", "Local News"] as const;
export type FeedChannel = (typeof FEED_CHANNELS)[number];

export interface Post {
  id: string;
  channel: FeedChannel;
  title: string;
  excerpt: string;
  body: string[];
  author: string;
  date: string;
  comments: { author: string; text: string }[];
  color: string;
  type: "article" | "policy" | "event";
}

export const POSTS: Post[] = [
  {
    id: "p1", channel: "Company News", type: "article", color: "from-blue-500 to-indigo-600",
    title: "Q4 kickoff: three priorities for the season ahead",
    excerpt: "Customer-first service, safer sites and smarter tools — here is what matters most this quarter.",
    body: [
      "As we enter the busiest quarter of the year, our leadership team has aligned on three priorities: customer-first service, zero-harm operations, and putting AI assistants in every employee's pocket.",
      "Every team will see new tools roll out in the Agent Hub over the next few weeks, starting with leave requests and IT support.",
    ],
    author: "Communications Team", date: "2 hours ago",
    comments: [{ author: "Priya N.", text: "Great to see the Agent Hub coming to stores too!" }, { author: "Marco L.", text: "Will the PTO agent work on mobile?" }],
  },
  {
    id: "p2", channel: "Leadership", type: "article", color: "from-violet-500 to-fuchsia-600",
    title: "A message from our CEO: thank you for an incredible year",
    excerpt: "Watch the town hall recap and read the highlights from this week's all-hands.",
    body: ["Thank you to every one of you — on the floor, in the field and in the office — for an extraordinary year.", "This week's town hall covered our growth plans, new benefits and the rollout of AI agents to all employees."],
    author: "Office of the CEO", date: "Yesterday",
    comments: [{ author: "Jamal R.", text: "Inspiring session, thank you!" }],
  },
  {
    id: "p3", channel: "HR Updates", type: "policy", color: "from-emerald-500 to-teal-600",
    title: "Updated holiday & leave policy for 2027",
    excerpt: "New carry-over rules and a simpler way to request time off with the PTO & Leave agent.",
    body: ["From 1 January, employees can carry over up to 5 unused days.", "Requests can now be made in seconds through the PTO & Leave agent in the Agent Hub."],
    author: "People Team", date: "2 days ago",
    comments: [{ author: "Lena K.", text: "Does this apply to part-time staff?" }, { author: "People Team", text: "Yes, pro-rated." }],
  },
  {
    id: "p4", channel: "Safety", type: "policy", color: "from-amber-500 to-orange-600",
    title: "Winter safety checklist for all sites",
    excerpt: "Complete your site safety checklist before the first frost — available in My Shift.",
    body: ["Icy conditions increase slip risks at loading bays and entrances.", "Team leads should complete the digital safety checklist in My Shift before each opening shift."],
    author: "Health & Safety", date: "3 days ago", comments: [],
  },
  {
    id: "p5", channel: "Local News", type: "event", color: "from-sky-500 to-cyan-600",
    title: "Store 112 raises €12k for the local food bank",
    excerpt: "Our team in Lyon smashed their charity target with a weekend bake sale.",
    body: ["Huge congratulations to the Store 112 team for their fundraising effort.", "Want to organise something similar? Use the Events micro-app to get started."],
    author: "Lyon Site", date: "4 days ago", comments: [{ author: "Sam T.", text: "Amazing work team!" }],
  },
  {
    id: "p6", channel: "My Site", type: "event", color: "from-rose-500 to-pink-600",
    title: "Open enrollment for benefits closes Friday",
    excerpt: "Review your health, dental and pension options before the deadline.",
    body: ["Open enrollment closes this Friday at 17:00.", "Ask the HR Assistant in the Agent Hub if you have questions about your options."],
    author: "Benefits Team", date: "5 days ago", comments: [],
  },
];

export interface Announcement {
  format: "ceo_video" | "town_hall_recap" | "policy_update" | "urgent_alert";
  title: string;
  subtitle: string;
  audiencePct: number;
}

export const ANNOUNCEMENTS: Announcement[] = [
  { format: "ceo_video", title: "CEO video: Our AI-powered workplace", subtitle: "3 min · Watch how agents will save you time every week", audiencePct: 100 },
  { format: "urgent_alert", title: "Weather alert: early closing for northern sites", subtitle: "Check your shift in My Shift for updates", audiencePct: 25 },
  { format: "town_hall_recap", title: "Town hall recap: Q4 priorities", subtitle: "Key takeaways in 5 bullet points", audiencePct: 100 },
];

export const RECOMMENDED = [
  { id: "r1", title: "How to request PTO in 30 seconds", context: "for_you", postId: "p3" },
  { id: "r2", title: "Winter safety checklist", context: "role_based", postId: "p4" },
  { id: "r3", title: "CEO thank-you message", context: "trending", postId: "p2" },
  { id: "r4", title: "Benefits enrollment closes Friday", context: "for_you", postId: "p6" },
  { id: "r5", title: "Store 112 fundraiser", context: "trending", postId: "p5" },
] as const;

export const SHIFT_LOCATIONS = ["Store 112", "Plant B", "Ward 4", "Warehouse 7", "Store 38"];

export interface Shift { day: string; date: string; start: string; end: string; hours: number; location: string; role: string }

export function shiftsFor(week: "this_week" | "next_week", location: string): Shift[] {
  const base = week === "this_week"
    ? [["Mon", "11 Nov"], ["Tue", "12 Nov"], ["Thu", "14 Nov"], ["Fri", "15 Nov"], ["Sat", "16 Nov"]]
    : [["Mon", "18 Nov"], ["Wed", "20 Nov"], ["Thu", "21 Nov"], ["Sat", "23 Nov"], ["Sun", "24 Nov"]];
  const slots: [string, string, number][] = [["07:00", "15:00", 8], ["14:00", "22:00", 8], ["09:00", "13:00", 4], ["06:00", "18:00", 12], ["10:00", "16:00", 6]];
  return base.map(([day, date], i) => {
    const [start, end, hours] = slots[(i + (week === "next_week" ? 2 : 0)) % slots.length];
    return { day, date, start, end, hours, location, role: i % 2 ? "Floor associate" : "Team lead" };
  });
}

export interface Person { name: string; title: string; dept: string; location: string; initials: string; color: string }

export const DIRECTORY: Person[] = [
  { name: "Amélie Laurent", title: "Store Manager", dept: "Retail Operations", location: "Lyon", initials: "AL", color: "bg-blue-500" },
  { name: "David Okafor", title: "IT Support Lead", dept: "IT", location: "London", initials: "DO", color: "bg-emerald-500" },
  { name: "Mei Chen", title: "HR Business Partner", dept: "People", location: "Singapore", initials: "MC", color: "bg-violet-500" },
  { name: "Lucas Moreau", title: "Plant Supervisor", dept: "Manufacturing", location: "Toulouse", initials: "LM", color: "bg-amber-500" },
  { name: "Sara Johansson", title: "Head of Internal Comms", dept: "Communications", location: "Stockholm", initials: "SJ", color: "bg-rose-500" },
  { name: "Raj Patel", title: "Finance Analyst", dept: "Finance", location: "Mumbai", initials: "RP", color: "bg-cyan-500" },
  { name: "Elena García", title: "Nurse Unit Lead", dept: "Clinical Operations", location: "Madrid", initials: "EG", color: "bg-pink-500" },
  { name: "Tom Becker", title: "Warehouse Coordinator", dept: "Logistics", location: "Hamburg", initials: "TB", color: "bg-indigo-500" },
];

export const SEARCH_ANSWERS: Record<string, string> = {
  holiday: "You have 25 days of annual leave per year. From 2027 you can carry over up to 5 unused days. Ask the PTO & Leave agent to book time off.",
  payslip: "Payslips are available in SAP SuccessFactors under My Pay. The HR Assistant can fetch your latest payslip for you.",
  expense: "Expenses under €100 are auto-approved. Submit receipts through the Expense Approvals agent within 30 days.",
  wifi: "Connect to 'Corp-Secure' with your employee ID. Frontline devices use 'Store-Staff'. The IT Helpdesk agent can reset access.",
  parental: "Parental leave is 16 weeks fully paid for the primary carer and 6 weeks for the secondary carer.",
  benefits: "Open enrollment closes Friday at 17:00. Review options in My Site → Benefits.",
  shift: "Shift swaps can be requested from My Shift. Your team lead approves them within 24h.",
  safety: "Mandatory safety training must be completed annually. Find it in My Shift → Forms.",
};
