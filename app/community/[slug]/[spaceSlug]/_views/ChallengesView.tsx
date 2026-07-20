"use client";

import { useEffect, useState } from "react";
import { completeChallenge, getChallenges, getParticipants, joinChallenge } from "@/lib/community/challenges";
import type { Challenge, ChallengeParticipant, Space } from "@/lib/community/types";
import { Button, Card, EmptyState, Pill } from "@/app/community/_ui/primitives";
import { DynamicIcon } from "@/lib/community/icon";

export function ChallengesView({ memberId, communityId }: { space: Space; memberId: string; communityId: string }) {
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [myParticipation, setMyParticipation] = useState<Record<string, ChallengeParticipant>>({});

  useEffect(() => {
    getChallenges(communityId).then(async (list) => {
      setChallenges(list);
      const participantLists = await Promise.all(list.map((c) => getParticipants(c.id)));
      const mine: Record<string, ChallengeParticipant> = {};
      participantLists.forEach((participants, i) => {
        const mineRow = participants.find((p) => p.member_id === memberId);
        if (mineRow) mine[list[i].id] = mineRow;
      });
      setMyParticipation(mine);
    });
  }, [communityId, memberId]);

  async function join(challenge: Challenge) {
    const participant = await joinChallenge(challenge.id, memberId);
    setMyParticipation((prev) => ({ ...prev, [challenge.id]: participant }));
  }

  async function complete(challenge: Challenge) {
    const participant = await completeChallenge(communityId, challenge, memberId);
    setMyParticipation((prev) => ({ ...prev, [challenge.id]: participant }));
  }

  return (
    <div className="space-y-3">
      {challenges === null ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : challenges.length === 0 ? (
        <EmptyState icon="flag" title="No challenges yet" description="Check back soon — admins can create challenges from the admin dashboard." />
      ) : (
        challenges.map((c) => {
          const participation = myParticipation[c.id];
          return (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-zinc-900">{c.name}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">{c.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill>{c.duration_days} days</Pill>
                    <Pill tone="emerald">{c.points} pts</Pill>
                    {participation?.status === "completed" && <Pill tone="amber">Completed</Pill>}
                  </div>
                  {c.daily_tasks.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                      {c.daily_tasks.map((t, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <DynamicIcon name="check" size={12} />
                          {t.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="shrink-0">
                  {!participation ? (
                    <Button size="sm" onClick={() => join(c)}>
                      Join
                    </Button>
                  ) : participation.status !== "completed" ? (
                    <Button size="sm" variant="secondary" onClick={() => complete(c)}>
                      Mark Complete
                    </Button>
                  ) : (
                    <Pill tone="emerald">+{participation.points_earned} pts</Pill>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
