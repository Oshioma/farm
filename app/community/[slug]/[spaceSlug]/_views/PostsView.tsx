"use client";

import { useEffect, useState } from "react";
import type { Space, SpaceComment, SpaceItem, SpaceReaction } from "@/lib/community/types";
import { addComment, createPost, listComments, listReactions, listSpaceItems, toggleReaction } from "@/lib/community/spaceItems";
import { Button, Card, EmptyState } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export function PostsView({ space, memberId, communityId }: { space: Space; memberId: string; communityId: string }) {
  const [items, setItems] = useState<SpaceItem[] | null>(null);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    listSpaceItems(space.id, "post").then(setItems);
  }, [space.id]);

  async function submit() {
    if (!body.trim()) return;
    setPosting(true);
    const created = await createPost(communityId, space.id, memberId, body.trim());
    setItems((prev) => [created, ...(prev ?? [])]);
    setBody("");
    setPosting(false);
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Share something in ${space.name}…`}
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={submit} disabled={posting || !body.trim()}>
            Post
          </Button>
        </div>
      </Card>

      {items === null ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={space.icon} title={`Nothing in ${space.name} yet`} description="Be the first to share something here." />
      ) : (
        items.map((item) => <PostCard key={item.id} item={item} memberId={memberId} />)
      )}
    </div>
  );
}

function PostCard({ item, memberId }: { item: SpaceItem; memberId: string }) {
  const [comments, setComments] = useState<SpaceComment[] | null>(null);
  const [reactions, setReactions] = useState<SpaceReaction[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    listReactions(item.id).then(setReactions);
  }, [item.id]);

  async function loadComments() {
    setShowComments(true);
    if (comments === null) setComments(await listComments(item.id));
  }

  async function submitComment() {
    if (!commentBody.trim()) return;
    const created = await addComment(item.id, memberId, commentBody.trim());
    setComments((prev) => [...(prev ?? []), created]);
    setCommentBody("");
  }

  async function react() {
    await toggleReaction(item.id, memberId);
    setReactions(await listReactions(item.id));
  }

  const iReacted = reactions.some((r) => r.member_id === memberId);

  return (
    <Card className="p-4">
      {item.title && <p className="text-sm font-bold text-zinc-900">{item.title}</p>}
      {item.body && <p className="whitespace-pre-wrap text-sm text-zinc-700">{item.body}</p>}
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
        <button type="button" onClick={react} className={`flex items-center gap-1.5 ${iReacted ? "font-semibold text-zinc-900" : ""}`}>
          <DynamicIcon name="heart" size={14} />
          {reactions.length || ""}
        </button>
        <button type="button" onClick={loadComments} className="flex items-center gap-1.5">
          <DynamicIcon name="message-circle" size={14} />
          {comments?.length ?? ""}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
          {comments?.map((c) => (
            <p key={c.id} className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
              {c.body}
            </p>
          ))}
          <div className="flex gap-2">
            <input
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment…"
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-zinc-900"
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
            <Button size="sm" variant="secondary" onClick={submitComment}>
              Reply
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
