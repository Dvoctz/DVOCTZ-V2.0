"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";

type Fixture = {
  id: number;
  tournament_id: number;
  team1_id: number;
  team2_id: number;
  winner_team_id: number | null;
  status: string;
  is_live?: boolean;
  date_time: string;
  best_of: number;
  stage: string;
  score: any;
  team1?: { name: string; logo_url?: string };
  team2?: { name: string; logo_url?: string };
  winner?: { name: string; logo_url?: string };
};

export function HomeKnockoutWidget({ tournamentId }: { tournamentId: number | string }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFixtures = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("fixtures")
        .select("*, team1:teams!team1_id(name, logo_url), team2:teams!team2_id(name, logo_url), winner:teams!winner_team_id(name, logo_url)")
        .eq("tournament_id", tournamentId)
        .in("stage", ["quarterfinal", "semifinal", "final", "third_place"])
        .order("date_time", { ascending: true });
        
      if (data) {
        setFixtures(data);
      }
      setLoading(false);
    };
    
    if (tournamentId) loadFixtures();
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-[300px]">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (fixtures.length === 0) return null;

  const handleTeamClick = (e: React.MouseEvent, teamId: number) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/team/${teamId}`);
  };

  const renderMatch = (f: Fixture) => {
    const isLive = (f.status === "live" || f.is_live) && f.status !== "completed";
    const isUpcoming = f.status === "upcoming" && !isLive;
    const t1Winner = f.winner_team_id === f.team1_id;
    const t2Winner = f.winner_team_id === f.team2_id;

    return (
      <Link
        key={f.id}
        to={`/matches/${f.id}`}
        className={`block p-2 border transition-all ${isLive ? "border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)] bg-amber-500/5" : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900 group"}`}
      >
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
            {isLive ? (
              <span className="text-amber-500 animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                LIVE
              </span>
            ) : f.status === "completed" ? (
              <span className="text-zinc-600">FT</span>
            ) : (
              <span className="text-zinc-600">UPCOMING</span>
            )}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={`flex justify-between items-center p-1.5 rounded-sm border ${t1Winner || (isLive && f.score?.servingTeam === "t1") ? "bg-amber-500/10 border-amber-500/20" : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900"}`}>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {f.team1?.logo_url ? (
                <img src={f.team1.logo_url} crossOrigin="anonymous" className="w-4 h-4 object-contain" alt="" />
              ) : (
                <div className="w-4 h-4 bg-zinc-800 rounded-full shrink-0" />
              )}
              <span 
                className={`text-[10px] font-bold truncate flex items-center gap-1 hover:text-amber-500 transition-colors cursor-pointer ${t1Winner ? "text-amber-500" : "text-zinc-300"}`}
                onClick={(e) => handleTeamClick(e, f.team1_id)}
              >
                {isLive && f.score?.servingTeam === "t1" && <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce shrink-0"></span>}
                {f.team1?.name || "TBD"}
              </span>
            </div>
            {!isUpcoming && (
              <span className={`text-[10px] font-black tabular-nums pl-2 ${t1Winner || isLive ? "text-amber-500" : "text-zinc-500"}`}>
                {isLive && f.score?.sets ? (f.score.sets[f.score.activeSet ?? 0]?.team1Points ?? f.score.team1Score ?? 0) : (f.score?.team1Score ?? "-")}
              </span>
            )}
          </div>
          <div className={`flex justify-between items-center p-1.5 rounded-sm border ${t2Winner || (isLive && f.score?.servingTeam === "t2") ? "bg-amber-500/10 border-amber-500/20" : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900"}`}>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {f.team2?.logo_url ? (
                <img src={f.team2.logo_url} crossOrigin="anonymous" className="w-4 h-4 object-contain" alt="" />
              ) : (
                <div className="w-4 h-4 bg-zinc-800 rounded-full shrink-0" />
              )}
              <span 
                className={`text-[10px] font-bold truncate flex items-center gap-1 hover:text-amber-500 transition-colors cursor-pointer ${t2Winner ? "text-amber-500" : "text-zinc-300"}`}
                onClick={(e) => handleTeamClick(e, f.team2_id)}
              >
                {f.team2?.name || "TBD"}
                {isLive && f.score?.servingTeam === "t2" && <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce shrink-0"></span>}
              </span>
            </div>
            {!isUpcoming && (
              <span className={`text-[10px] font-black tabular-nums pl-2 ${t2Winner || isLive ? "text-amber-500" : "text-zinc-500"}`}>
                {isLive && f.score?.sets ? (f.score.sets[f.score.activeSet ?? 0]?.team2Points ?? f.score.team2Score ?? 0) : (f.score?.team2Score ?? "-")}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  };

  const renderStage = (title: string, stageNames: string[]) => {
    const stageFixtures = fixtures.filter(f => stageNames.includes(f.stage));
    
    return (
      <div className="flex flex-col min-w-[180px] shrink-0 snap-center px-2">
        <div className="mb-4 pb-2 border-b border-zinc-800 text-center">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
            {title}
          </h3>
        </div>
        <div className="flex flex-col gap-4 justify-around flex-1 relative min-h-[140px]">
          {stageFixtures.length === 0 ? (
            <div className="flex-1 border border-dashed border-zinc-800/50 flex flex-col items-center justify-center">
              <span className="text-[10px] text-zinc-700 font-medium uppercase tracking-widest">TBD</span>
            </div>
          ) : (
            stageFixtures.map(renderMatch)
          )}
        </div>
      </div>
    );
  };

  const championFixtures = fixtures.filter(f => f.stage === "final" && f.status === "completed");
  const championFixture = championFixtures.length > 0 ? championFixtures[championFixtures.length - 1] : null;

  return (
    <div className="w-full flex overflow-x-auto snap-x py-4 pl-2 hidescrollbar max-h-[600px]">
      {fixtures.some(f => f.stage === "quarterfinal") && renderStage("Quarter Finals", ["quarterfinal"])}
      {fixtures.some(f => f.stage === "semifinal") && renderStage("Semi Finals", ["semifinal"])}
      {renderStage("Final", ["final"])}
      
      {championFixture?.winner && (
        <div className="flex flex-col min-w-[180px] shrink-0 snap-center px-4">
          <div className="mb-4 pb-2 border-b-2 border-amber-500/30 text-center">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500">
              Champion
            </h3>
          </div>
          <div className="flex flex-col gap-4 justify-around flex-1 relative h-full">
            <div className="flex flex-col items-center justify-center p-4 border border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)] text-center h-full">
              <div className="w-10 h-10 mx-auto bg-black rounded-full mb-3 flex items-center justify-center border border-amber-500/50">
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-1 max-w-full truncate px-1">
                {championFixture.winner.name}
              </h4>
              <p className="text-[8px] text-amber-500/70 font-bold uppercase tracking-widest mt-1">
                Winner
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
