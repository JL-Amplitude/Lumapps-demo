import { useEffect, useState } from "react";
import { Search, Sparkles, ThumbsUp, ThumbsDown, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { POSTS, SEARCH_ANSWERS } from "../data/content";
import { track } from "../lib/analytics";

export default function KnowledgeSearch() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ query: string; answer: string | null; posts: typeof POSTS } | null>(null);
  const [voted, setVoted] = useState<null | boolean>(null);
  const { pathname } = useLocation();

  // Close the results panel whenever the employee navigates elsewhere
  useEffect(() => {
    setResult(null);
  }, [pathname]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    const lower = query.toLowerCase();
    const key = Object.keys(SEARCH_ANSWERS).find((k) => lower.includes(k));
    const answer = key ? SEARCH_ANSWERS[key] : null;
    const posts = POSTS.filter((p) => (p.title + p.excerpt).toLowerCase().split(/\W+/).some((w) => w.length > 3 && lower.includes(w)));
    track("Knowledge Search Performed", {
      search_query: query,
      results_returned: posts.length + (answer ? 1 : 0),
      zero_results: posts.length === 0 && !answer,
      answered_by_ai: Boolean(answer),
    });
    setVoted(null);
    setResult({ query, answer, posts });
  };

  const vote = (helpful: boolean) => {
    setVoted(helpful);
    track("Agent Response Rated", {
      agent_name: "knowledge_search",
      agent_type: "Knowledge Agent",
      rating: helpful ? 5 : 2,
      thumbs: helpful ? "up" : "down",
      llm_model: "claude-sonnet-4",
      search_query: result?.query,
      answer_helpful: helpful,
    });
  };

  return (
    <div className="relative">
      <form onSubmit={submit} className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, policies, news… or ask a question"
          className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-9 pr-3 text-sm focus:border-brand-500 focus:bg-white focus:outline-none"
          aria-label="Knowledge search"
        />
      </form>

      {result && (
        <div className="absolute left-0 right-0 top-12 z-40 card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Results for “{result.query}”</span>
            <button onClick={() => setResult(null)} aria-label="Close results" className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>
          {result.answer ? (
            <div className="mb-3 rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-700"><Sparkles size={14} /> AI answer</div>
              <p className="text-sm text-slate-700">{result.answer}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                {voted === null ? (
                  <>Was this helpful?
                    <button onClick={() => vote(true)} className="rounded-lg p-1 hover:bg-white" aria-label="Helpful"><ThumbsUp size={14} /></button>
                    <button onClick={() => vote(false)} className="rounded-lg p-1 hover:bg-white" aria-label="Not helpful"><ThumbsDown size={14} /></button>
                  </>
                ) : <span>Thanks for your feedback!</span>}
              </div>
            </div>
          ) : (
            <p className="mb-3 text-sm text-slate-500">No AI answer found. Try “holiday”, “payslip”, “wifi” or “expense”.</p>
          )}
          {result.posts.map((p) => (
            <Link key={p.id} to={`/news/${p.id}`} onClick={() => setResult(null)} className="block rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
              <span className="font-medium">{p.title}</span>
              <span className="block text-xs text-slate-500">{p.channel}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
