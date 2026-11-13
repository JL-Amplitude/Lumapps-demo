import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Megaphone, PlayCircle, AlertTriangle, ChevronRight, Bot, CalendarClock, Palmtree, Users, Receipt, X } from "lucide-react";
import { ANNOUNCEMENTS, POSTS, RECOMMENDED, type Announcement } from "../data/content";
import { useSession } from "../lib/session";
import { reachedStep, track } from "../lib/analytics";
import { useTrackOnce } from "../lib/useTrackOnce";

export default function Home() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [openAnn, setOpenAnn] = useState<Announcement | null>(null);
  const frontline = session!.workforceType === "frontline";

  const [returning] = useState(() => {
    try {
      const seen = Boolean(localStorage.getItem("lumapps_demo_seen"));
      localStorage.setItem("lumapps_demo_seen", "1");
      return seen;
    } catch { return false; }
  });
  useTrackOnce("Intranet Home Viewed", {
    referrer_source: document.referrer ? "link" : "direct",
    is_returning_employee: returning,
  });
  reachedStep(1);

  const openAnnouncement = (a: Announcement) => {
    track("Leadership Announcement Viewed", {
      announcement_format: a.format,
      audience_targeting_pct: a.audiencePct,
      delivered_via: frontline ? "mobile_push" : "web",
    });
    setOpenAnn(a);
  };

  const quick = [
    { label: "Ask an agent", icon: Bot, to: "/agents", color: "bg-brand-500" },
    { label: "My Shift", icon: CalendarClock, to: "/shifts", color: "bg-amber-500" },
    { label: "Request PTO", icon: Palmtree, to: "/apps?app=pto", color: "bg-emerald-500" },
    { label: "Directory", icon: Users, to: "/apps?app=directory", color: "bg-violet-500" },
    { label: "Expenses", icon: Receipt, to: "/apps?app=expense", color: "bg-rose-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good to see you, {session!.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">{session!.account.account_name} · {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {/* Leadership announcement banner */}
      <div className="grid gap-3 md:grid-cols-3">
        {ANNOUNCEMENTS.map((a) => (
          <button key={a.title} onClick={() => openAnnouncement(a)}
            className={`card flex items-start gap-3 p-4 text-left transition hover:shadow-md ${a.format === "urgent_alert" ? "border-amber-300 bg-amber-50" : ""}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white ${a.format === "urgent_alert" ? "bg-amber-500" : a.format === "ceo_video" ? "bg-violet-500" : "bg-brand-500"}`}>
              {a.format === "ceo_video" ? <PlayCircle size={20} /> : a.format === "urgent_alert" ? <AlertTriangle size={20} /> : <Megaphone size={20} />}
            </span>
            <span>
              <span className="block text-sm font-semibold">{a.title}</span>
              <span className="block text-xs text-slate-500">{a.subtitle}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-5 gap-2">
        {quick.map(({ label, icon: Icon, to, color }) => (
          <button key={label} onClick={() => navigate(to)} className="flex flex-col items-center gap-2 rounded-2xl p-2 text-center text-xs font-medium text-slate-700 hover:bg-white">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl text-white ${color}`}><Icon size={22} /></span>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Feed */}
        <section className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">For you</h2>
            <Link to="/news" className="flex items-center text-sm font-medium text-brand-600">All news <ChevronRight size={16} /></Link>
          </div>
          {POSTS.slice(0, 4).map((p) => (
            <Link key={p.id} to={`/news/${p.id}`} className="card flex gap-4 overflow-hidden p-3 transition hover:shadow-md">
              <div className={`h-24 w-28 shrink-0 rounded-xl bg-gradient-to-br ${p.color}`} />
              <div className="min-w-0">
                <span className="chip bg-slate-100 text-slate-600">{p.channel}</span>
                <h3 className="mt-1 font-semibold leading-snug">{p.title}</h3>
                <p className="line-clamp-2 text-sm text-slate-500">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* Recommended */}
        <aside className="space-y-3">
          <h2 className="text-lg font-bold">Recommended for you</h2>
          {RECOMMENDED.map((r, i) => (
            <button key={r.id}
              onClick={() => { track("Recommended Content Clicked", { recommendation_context: r.context, position_in_list: i + 1 }); navigate(`/news/${r.postId}`); }}
              className="card flex w-full items-center justify-between p-3 text-left text-sm hover:shadow-md">
              <span>
                <span className="block font-medium">{r.title}</span>
                <span className="text-xs capitalize text-slate-500">{r.context.replace("_", " ")}</span>
              </span>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </aside>
      </div>

      {openAnn && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => setOpenAnn(null)}>
          <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-bold">{openAnn.title}</h3>
              <button onClick={() => setOpenAnn(null)} aria-label="Close"><X size={18} /></button>
            </div>
            {openAnn.format === "ceo_video" ? (
              <div className="grid aspect-video place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-brand-700 text-white"><PlayCircle size={56} /></div>
            ) : (
              <p className="text-sm text-slate-600">{openAnn.subtitle}. This announcement was targeted to {openAnn.audiencePct}% of employees based on role and location.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
