import React from "react";

interface SetScoreHistoryProps {
  sets: any[];
  activeSet?: number;
  team1Id?: string | number;
  team2Id?: string | number;
  className?: string; // wrapper class
}

export function SetScoreHistory({ sets, activeSet, team1Id, team2Id, className = "" }: SetScoreHistoryProps) {
  if (!sets || sets.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {sets.map((set, idx) => {
        const isTeam1Winner = (set.winnerOverrideId && set.winnerOverrideId === team1Id?.toString()) || (!set.winnerOverrideId && set.team1Points > set.team2Points);
        const isTeam2Winner = (set.winnerOverrideId && set.winnerOverrideId === team2Id?.toString()) || (!set.winnerOverrideId && set.team2Points > set.team1Points);
        const isActive = activeSet === idx;

        return (
          <div
            key={idx}
            className={`flex flex-col items-center px-2.5 py-1.5 rounded-sm border ${isActive ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <span className={`text-[8px] uppercase font-bold mb-1 ${isActive ? 'text-amber-500' : 'text-zinc-500'}`}>
              Set {idx + 1}
            </span>
            <span
              className={`text-[10px] font-bold leading-none ${isTeam1Winner ? "text-white" : "text-zinc-400"}`}
            >
              {set.team1Points ?? 0}
            </span>
            <div className={`w-full h-px my-1 ${isActive ? 'bg-amber-500/30' : 'bg-zinc-800'}`} />
            <span
              className={`text-[10px] font-bold leading-none ${isTeam2Winner ? "text-white" : "text-zinc-400"}`}
            >
              {set.team2Points ?? 0}
            </span>
          </div>
        );
      })}
    </div>
  );
}
