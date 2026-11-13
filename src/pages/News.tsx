import { useState } from "react";
import { Link } from "react-router-dom";
import { FEED_CHANNELS, POSTS, type FeedChannel } from "../data/content";
import { useTrackOnce } from "../lib/useTrackOnce";

type Sort = "for_you" | "latest";

export default function News() {
  const [channel, setChannel] = useState<FeedChannel | "All">("All");
  const [sort, setSort] = useState<Sort>("for_you");

  const posts = POSTS.filter((p) => channel === "All" || p.channel === channel);
  const shown = sort === "latest" ? posts : [...posts].reverse();

  useTrackOnce("News Feed Browsed", {
    feed_channel: channel === "All" ? "Company News" : channel,
    posts_shown: shown.length,
    filter_used: channel !== "All",
    sort_applied: sort,
  }, [channel, sort]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">News</h1>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          <option value="for_you">For you</option>
          <option value="latest">Latest</option>
        </select>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(["All", ...FEED_CHANNELS] as const).map((c) => (
          <button key={c} onClick={() => setChannel(c)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${channel === c ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => (
          <Link key={p.id} to={`/news/${p.id}`} className="card overflow-hidden transition hover:shadow-md">
            <div className={`h-32 bg-gradient-to-br ${p.color}`} />
            <div className="p-4">
              <span className="chip bg-slate-100 text-slate-600">{p.channel}</span>
              <h3 className="mt-2 font-semibold leading-snug">{p.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.excerpt}</p>
              <p className="mt-3 text-xs text-slate-400">{p.author} · {p.date}</p>
            </div>
          </Link>
        ))}
        {shown.length === 0 && <p className="text-sm text-slate-500">No posts in this channel yet.</p>}
      </div>
    </div>
  );
}
