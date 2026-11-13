import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, BookmarkCheck, MessageCircle } from "lucide-react";
import { POSTS } from "../data/content";
import { track } from "../lib/analytics";

export default function Article() {
  const { id } = useParams();
  const post = POSTS.find((p) => p.id === id);
  const [saved, setSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);

  if (!post) return <p>Article not found. <Link to="/news" className="text-brand-600">Back to news</Link></p>;

  const bookmark = () => {
    if (!saved) track("Article Bookmarked", { content_type: post.type, article_id: post.id, feed_channel: post.channel });
    setSaved(!saved);
  };

  const toggleComments = () => {
    if (!showComments) track("Post Comments Viewed", { reviews_read: post.comments.length, article_id: post.id });
    setShowComments(!showComments);
  };

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/news" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500"><ArrowLeft size={16} /> News</Link>
      <div className={`h-48 rounded-2xl bg-gradient-to-br ${post.color} md:h-64`} />
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <span className="chip bg-slate-100 text-slate-600">{post.channel}</span>
          <h1 className="mt-2 text-2xl font-bold leading-tight md:text-3xl">{post.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{post.author} · {post.date}</p>
        </div>
        <button onClick={bookmark} className={`btn ${saved ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-700"}`} aria-label="Bookmark">
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />} {saved ? "Saved" : "Save"}
        </button>
      </div>
      <div className="prose mt-6 space-y-4 text-slate-700">
        {post.body.map((para, i) => <p key={i}>{para}</p>)}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4">
        <button onClick={toggleComments} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MessageCircle size={18} /> {showComments ? "Hide comments" : `View comments (${post.comments.length})`}
        </button>
        {showComments && (
          <ul className="mt-4 space-y-3">
            {post.comments.length === 0 && <li className="text-sm text-slate-500">No comments yet — be the first!</li>}
            {post.comments.map((c, i) => (
              <li key={i} className="card p-3 text-sm"><span className="font-semibold">{c.author}</span><p className="text-slate-600">{c.text}</p></li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
