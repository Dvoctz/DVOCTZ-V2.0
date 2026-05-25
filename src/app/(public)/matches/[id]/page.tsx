"use client";

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { LiveTimer } from "@/components/ui/live-timer";
import { SetScoreHistory } from "@/components/ui/set-score-history";

export default function MatchDetailPage() {
  const { id } = useParams();
  usePageTracking({ pageType: "match", pageId: id });
  const [fixture, setFixture] = useState<any>(null);
  const [h2hFixtures, setH2hFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("fixtures")
        .select(
          "id, tournament_id, team1_id, team2_id, status, is_live, live_state, score, date_time, ground, best_of, team1:teams!team1_id(name, logo_url), team2:teams!team2_id(name, logo_url), tournaments(name, division, phase)"
        )
        .eq("id", id)
        .single();

      if (data) {
        setFixture({
          ...data,
          score: data.is_live && data.live_state ? data.live_state : data.score,
        });

        if (data.team1_id && data.team2_id) {
          const { data: h2hData } = await supabase
            .from("fixtures")
            .select("*, team1:teams!team1_id(name, logo_url), team2:teams!team2_id(name, logo_url), tournaments(name)")
            .in("team1_id", [data.team1_id, data.team2_id])
            .in("team2_id", [data.team1_id, data.team2_id])
            .eq("status", "completed")
            .order("date_time", { ascending: false })
            .limit(5);
            
          if (h2hData) {
            setH2hFixtures(h2hData.filter((f: any) => f.id !== Number(id)));
          }
        }
      }
      setLoading(false);
    };

    if (id) {
      fetchMatch();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <h2 className="text-2xl font-bold uppercase mb-4">Match Not Found</h2>
        <Link to="/live" className="text-amber-500 hover:underline">
          Return to Live Center
        </Link>
      </div>
    );
  }

  const isLive = (fixture.status === "live" || fixture.is_live) && fixture.status !== "completed";
  const t1Score = isLive && fixture.score?.sets ? (fixture.score.sets[fixture.score.activeSet ?? 0]?.team1Points ?? fixture.score.team1Score ?? 0) : (fixture.score?.team1Score ?? "-");
  const t2Score = isLive && fixture.score?.sets ? (fixture.score.sets[fixture.score.activeSet ?? 0]?.team2Points ?? fixture.score.team2Score ?? 0) : (fixture.score?.team2Score ?? "-");

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-900 pt-16 pb-8 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/5 via-black to-black pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <Link to="/live" className="text-[10px] font-bold text-amber-500 hover:text-amber-400 uppercase tracking-widest flex items-center gap-2 mb-8">
            &larr; Back to Live Center
          </Link>
          
          <div className="text-center mb-10">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-zinc-400">
              {fixture.tournaments?.name || "Tournament"}
            </h1>
            <p className="text-sm font-bold text-amber-500 uppercase tracking-widest mt-2 bg-amber-500/10 inline-block px-3 py-1 rounded-sm">
              {fixture.tournaments?.division || "Division"} • {fixture.ground || "Court TBD"}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 max-w-4xl mx-auto">
            {/* Team 1 */}
            <Link to={fixture.team1_id ? `/team/${fixture.team1_id}` : "#"} className="flex-1 flex flex-col items-center text-center group cursor-pointer">
              {fixture.team1?.logo_url ? (
                <div className="w-24 h-24 md:w-32 md:h-32 mb-4 bg-white/5 rounded-full p-2 border border-zinc-800 flex items-center justify-center overflow-hidden group-hover:border-amber-500/50 transition-colors">
                  <img src={fixture.team1.logo_url} alt="" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 mb-4 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
                  <span className="text-3xl font-black text-zinc-700">{fixture.team1?.name?.substring(0, 2) || "T1"}</span>
                </div>
              )}
              <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase group-hover:text-amber-500 transition-colors">{fixture.team1?.name || "TBA"}</h2>
            </Link>
            
            {/* Score Center */}
            <div className="flex flex-col items-center justify-center shrink-0 px-4">
              {isLive ? (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-xs text-amber-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2 bg-amber-500/10 px-3 py-1 rounded-sm border border-amber-500/20">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    {fixture.score?.activeSet !== undefined ? `Set ${fixture.score.activeSet + 1}` : 'LIVE'}
                  </span>
                  <div className="flex items-center gap-6">
                    <span className="text-5xl md:text-7xl font-black tabular-nums tracking-tighter">{t1Score}</span>
                    <span className="text-2xl md:text-4xl font-black text-zinc-700">-</span>
                    <span className="text-5xl md:text-7xl font-black tabular-nums tracking-tighter">{t2Score}</span>
                  </div>
                  {fixture.score?.timer && <LiveTimer timerState={fixture.score.timer} className="text-sm text-zinc-400 font-mono mt-4" />}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 border border-zinc-800 px-2 py-0.5 rounded-sm bg-zinc-900">
                    {fixture.status}
                  </span>
                  <div className="flex items-center gap-6">
                    <span className="text-4xl font-black tabular-nums tracking-tighter text-zinc-300">{t1Score}</span>
                    <span className="text-2xl font-black text-zinc-700">-</span>
                    <span className="text-4xl font-black tabular-nums tracking-tighter text-zinc-300">{t2Score}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Team 2 */}
            <Link to={fixture.team2_id ? `/team/${fixture.team2_id}` : "#"} className="flex-1 flex flex-col items-center text-center group cursor-pointer">
              {fixture.team2?.logo_url ? (
                <div className="w-24 h-24 md:w-32 md:h-32 mb-4 bg-white/5 rounded-full p-2 border border-zinc-800 flex items-center justify-center overflow-hidden group-hover:border-amber-500/50 transition-colors">
                  <img src={fixture.team2.logo_url} alt="" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 mb-4 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
                  <span className="text-3xl font-black text-zinc-700">{fixture.team2?.name?.substring(0, 2) || "T2"}</span>
                </div>
              )}
              <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase group-hover:text-amber-500 transition-colors">{fixture.team2?.name || "TBA"}</h2>
            </Link>
          </div>
          
          <div className="mt-12 flex justify-center">
            <SetScoreHistory 
              sets={fixture.score?.sets} 
              activeSet={fixture.score?.activeSet} 
              team1Id={fixture.team1_id} 
              team2Id={fixture.team2_id}
              className="scale-110" 
            />
          </div>
        </div>
      </div>

      {/* Placeholders for Future Architecture */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 md:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-zinc-900 bg-zinc-950/50 p-8 rounded-sm text-center flex flex-col items-center justify-center h-48 opacity-50">
            <span className="text-2xl font-black italic text-zinc-700 uppercase tracking-tighter mb-2">Team Rosters</span>
            <p className="text-[10px] uppercase font-bold tracking-widest text-amber-500">Feature Coming Soon</p>
          </div>
          <div className="border border-zinc-900 bg-zinc-950/50 p-8 rounded-sm text-center flex flex-col items-center justify-center h-48 opacity-50">
            <span className="text-2xl font-black italic text-zinc-700 uppercase tracking-tighter mb-2">Match Analytics</span>
            <p className="text-[10px] uppercase font-bold tracking-widest text-amber-500">Feature Coming Soon</p>
          </div>
          <div className="border border-zinc-900 bg-zinc-950/50 p-8 rounded-sm text-center flex flex-col md:col-span-2">
            <span className="text-2xl font-black italic text-zinc-700 uppercase tracking-tighter mb-6">Head to Head History</span>
            
            {h2hFixtures.length === 0 ? (
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 py-8">No previous matchups found</p>
            ) : (
              <div className="flex flex-col gap-4 text-left w-full max-w-2xl mx-auto">
                {h2hFixtures.map((h2h) => {
                  const t1Score =
                    typeof h2h.score?.team1Score === "number"
                      ? h2h.score.team1Score
                      : 0;
                  const t2Score =
                    typeof h2h.score?.team2Score === "number"
                      ? h2h.score.team2Score
                      : 0;
                  
                  return (
                    <Link
                      key={h2h.id}
                      to={`/matches/${h2h.id}`}
                      className="flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 transition-colors group"
                    >
                      <div className="flex-1 flex justify-end items-center gap-3">
                        <span className={`text-sm font-bold truncate ${t1Score > t2Score ? 'text-amber-500' : 'text-zinc-300'}`}>
                          {h2h.team1?.name || "TBD"}
                        </span>
                        {h2h.team1?.logo_url ? (
                          <img src={h2h.team1.logo_url} className="w-6 h-6 object-contain shrink-0" alt="" />
                        ) : (
                          <div className="w-6 h-6 bg-zinc-800 rounded-full shrink-0" />
                        )}
                      </div>
                      
                      <div className="px-6 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs text-zinc-500 font-mono mb-1">{new Date(h2h.date_time).toLocaleDateString()}</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-black tabular-nums ${t1Score > t2Score ? 'text-white' : 'text-zinc-400'}`}>{t1Score}</span>
                          <span className="text-sm font-bold text-zinc-600">-</span>
                          <span className={`text-xl font-black tabular-nums ${t2Score > t1Score ? 'text-white' : 'text-zinc-400'}`}>{t2Score}</span>
                        </div>
                      </div>
                      
                      <div className="flex-1 flex justify-start items-center gap-3">
                        {h2h.team2?.logo_url ? (
                          <img src={h2h.team2.logo_url} className="w-6 h-6 object-contain shrink-0" alt="" />
                        ) : (
                          <div className="w-6 h-6 bg-zinc-800 rounded-full shrink-0" />
                        )}
                        <span className={`text-sm font-bold truncate ${t2Score > t1Score ? 'text-amber-500' : 'text-zinc-300'}`}>
                          {h2h.team2?.name || "TBD"}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
