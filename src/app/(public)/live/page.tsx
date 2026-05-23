"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { LiveTimer } from "@/components/ui/live-timer";
import { SetScoreHistory } from "@/components/ui/set-score-history";

type FixturePreview = {
  id: number;
  tournament_id: number;
  team1_id: number;
  team2_id: number;
  status: string;
  is_live: boolean;
  live_state: any;
  date_time: string;
  ground: string;
  best_of: number;
  team1?: { name: string; logo_url?: string };
  team2?: { name: string; logo_url?: string };
  score?: {
    resultMessage?: string;
    sets?: { team1Points: number; team2Points: number }[];
    team1Score?: number;
    team2Score?: number;
    activeSet?: number;
    timer?: any;
    servingTeam?: string;
  } | null;
  tournaments?: { name: string; division?: string; phase?: string };
};

export default function LiveMatchCenterPage() {
  const navigate = useNavigate();
  const handleTeamClick = (e: React.MouseEvent, teamId: number | null) => {
    if (!teamId) return;
    e.preventDefault();
    e.stopPropagation();
    navigate(`/team/${teamId}`);
  };
  const [liveFixtures, setLiveFixtures] = useState<FixturePreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveFixtures = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("fixtures")
        .select(
          "id, tournament_id, team1_id, team2_id, status, is_live, live_state, score, date_time, ground, best_of, team1:teams!team1_id(name, logo_url), team2:teams!team2_id(name, logo_url), tournaments(name, division, phase)"
        )
        .eq("is_live", true)
        .neq("status", "completed");

      if (data) {
        setLiveFixtures(
          data.map((f: any) => ({
            ...f,
            score: f.is_live && f.live_state ? f.live_state : f.score,
          }))
        );
      }
      setLoading(false);
    };

    fetchLiveFixtures();

    const interval = setInterval(fetchLiveFixtures, 10000); // Polling for updates
    return () => clearInterval(interval);
  }, []);

  const renderLiveCard = (f: FixturePreview) => (
    <Link
      to={`/matches/${f.id}`}
      key={f.id}
      className="group p-6 border-2 border-amber-500 relative overflow-hidden bg-zinc-950/90 shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col justify-between cursor-pointer hover:bg-zinc-900 transition-colors block"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-amber-500/10 text-amber-500 border border-amber-500/20">
          {f.tournaments?.name || "Tournament"} • {f.tournaments?.division || "Div"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            LIVE
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-zinc-900 text-zinc-500 border border-zinc-800">
            BO{f.best_of}
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center gap-4 mb-6 relative z-10">
        <div 
          className="flex-1 text-center flex flex-col items-center justify-center cursor-pointer group"
          onClick={(e) => handleTeamClick(e, f.team1_id)}
        >
          {f.team1?.logo_url ? (
            <div className="w-12 h-12 mb-3 bg-white/5 rounded-full p-1.5 border border-zinc-800 flex items-center justify-center overflow-hidden group-hover:border-amber-500/50 transition-colors">
              <img
                src={f.team1.logo_url}
                alt={f.team1.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 mb-3 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
              <span className="text-sm font-bold text-zinc-500 uppercase">
                {f.team1?.name?.substring(0, 2) || "T1"}
              </span>
            </div>
          )}
          <span className="flex items-center gap-1.5 text-base font-black text-white truncate max-w-full group-hover:text-amber-500 transition-colors">
            {f.score?.servingTeam === "t1" && (
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce shrink-0"></span>
            )}
            <span className="truncate">{f.team1?.name || "TBD"}</span>
          </span>
        </div>
        
        <div className="flex flex-col items-center justify-center shrink-0 px-4">
           <span className="text-xs text-amber-500 font-bold uppercase tracking-widest mb-1 shadow-sm flex flex-col items-center gap-1">
             {f.score?.activeSet !== undefined ? `Set ${f.score.activeSet + 1}` : 'TIE-BREAK'}
             {f.score?.timer && <LiveTimer timerState={f.score.timer} className="text-white font-mono bg-zinc-900 px-2 py-0.5 rounded-sm mt-1" />}
           </span>
           <span className="text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
             {f.score?.sets?.[f.score.activeSet ?? 0]?.team1Points ?? f.score?.team1Score ?? 0} - {f.score?.sets?.[f.score.activeSet ?? 0]?.team2Points ?? f.score?.team2Score ?? 0}
           </span>
        </div>
        
        <div 
          className="flex-1 text-center flex flex-col items-center justify-center cursor-pointer group"
          onClick={(e) => handleTeamClick(e, f.team2_id)}
        >
          {f.team2?.logo_url ? (
            <div className="w-12 h-12 mb-3 bg-white/5 rounded-full p-1.5 border border-zinc-800 flex items-center justify-center overflow-hidden group-hover:border-amber-500/50 transition-colors">
              <img
                src={f.team2.logo_url}
                alt={f.team2.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 mb-3 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
              <span className="text-sm font-bold text-zinc-500 uppercase">
                {f.team2?.name?.substring(0, 2) || "T2"}
              </span>
            </div>
          )}
          <span className="flex items-center gap-1.5 text-base font-black text-white truncate max-w-full group-hover:text-amber-500 transition-colors">
            <span className="truncate">{f.team2?.name || "TBD"}</span>
            {f.score?.servingTeam === "t2" && (
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce shrink-0"></span>
            )}
          </span>
        </div>
      </div>
      
      <SetScoreHistory 
        sets={f.score?.sets} 
        activeSet={f.score?.activeSet} 
        team1Id={f.team1_id} 
        team2Id={f.team2_id}
        className="mb-4 relative z-10" 
      />
      
      <div className="text-center pt-4 border-t border-zinc-900 relative z-10 flex justify-between items-center px-2">
        <span className="block text-[10px] font-mono text-zinc-500 uppercase">
          {f.ground || "Court TBD"}
        </span>
        <span className="block text-[10px] font-bold text-amber-500 uppercase group-hover:text-amber-400 transition-colors">
          View Details &rarr;
        </span>
      </div>
    </Link>
  );

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-black">
      <header className="px-6 md:px-10 py-16 border-b border-zinc-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-black to-black object-cover z-0" />
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 animate-pulse">
            <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-white mb-4">
            Match <span className="text-amber-500">Center</span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400 font-medium max-w-xl leading-relaxed uppercase tracking-widest">
            Live broadcasts and real-time scores
          </p>
        </div>
      </header>

      <section className="px-6 md:px-10 py-12 flex-1 max-w-[1400px] mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
              Connecting to live feeds...
            </p>
          </div>
        ) : liveFixtures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 grid-bg border border-dashed border-zinc-800 rounded-lg">
            <div className="w-3 h-3 rounded-full bg-zinc-700 mb-4" />
            <h3 className="text-xl font-black uppercase text-white mb-2">No Live Matches</h3>
            <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold max-w-md text-center">
              There are currently no active matches broadcasting. Check the tournament schedule for upcoming times.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {liveFixtures.map((f) => renderLiveCard(f))}
          </div>
        )}
      </section>
    </div>
  );
}
