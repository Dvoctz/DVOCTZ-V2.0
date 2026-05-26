import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { LiveTimer } from "@/components/ui/live-timer";
import { SetScoreHistory } from "@/components/ui/set-score-history";
import {
  CalendarDays,
  Trophy,
  Activity,
  Landmark,
  Shield,
  History,
  Users,
  ChevronRight,
  Play,
  Radio,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Tournament = {
  id: number;
  name: string;
  division?: string;
  start_date?: string;
  end_date?: string;
  banner_url?: string;
  phase?: string;
  champion_name?: string;
  created_at: string;
};

type Fixture = {
  winner_team_id: number | null;
  stage: string;
};

export default function TournamentsArchivePage() {
  usePageTracking({ pageType: "tournaments_archive" });
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [liveFixtures, setLiveFixtures] = useState<any[]>([]);
  const [tournamentMeta, setTournamentMeta] = useState<Record<number, any>>({});

  // Analytics
  const [totalClubs, setTotalClubs] = useState(0);
  const [totalFixtures, setTotalFixtures] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Advanced Analytics
  const [teamStats, setTeamStats] = useState<
    { name: string; wins: number; finals: number }[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          { data: tData },
          { count: cCount },
          { count: fCount },
          { count: pCount },
          { data: allFixtures },
        ] = await Promise.all([
          supabase
            .from("tournaments")
            .select("*")
            .order("id", { ascending: false }),
          supabase.from("clubs").select("*", { count: "exact", head: true }),
          supabase.from("fixtures").select("*", { count: "exact", head: true }),
          supabase.from("players").select("*", { count: "exact", head: true }),
          supabase
            .from("fixtures")
            .select(
              "id, team1_id, team2_id, winner_team_id, tournament_id, stage, status, is_live, live_state, score, date_time, ground, best_of, winner:teams!winner_team_id(id, name), team1:teams!team1_id(id, name, logo_url), team2:teams!team2_id(id, name, logo_url), tournaments(name, division)",
            ),
        ]);

        if (tData) setTournaments(tData);
        setTotalClubs(cCount || 0);
        setTotalFixtures(fCount || 0);
        setTotalPlayers(pCount || 0);

        if (allFixtures) {
          const statsMap: Record<
            number,
            {
              name: string;
              wins: number;
              finals: number;
              totalMatches: number;
              matchesWon: number;
            }
          > = {};

          const meta: Record<number, any> = {};
          const live: any[] = [];

          allFixtures.forEach((f: any) => {
            const isFixtureLive = (f.status === "live" || f.is_live) && f.status !== "completed";
            if (isFixtureLive) {
              live.push({
                ...f,
                score: isFixtureLive && f.live_state ? f.live_state : f.score
              });
            }

            if (f.tournament_id) {
              if (!meta[f.tournament_id]) {
                meta[f.tournament_id] = {
                  matchCount: 0,
                  liveCount: 0,
                  teams: new Set(),
                  latestResult: null,
                };
              }
              const tm = meta[f.tournament_id];
              tm.matchCount++;
              if (isFixtureLive) tm.liveCount++;
              if (f.team1_id) tm.teams.add(f.team1_id);
              if (f.team2_id) tm.teams.add(f.team2_id);
              
              if (f.status === "completed") {
                if (!tm.latestResult || new Date(f.date_time) > new Date(tm.latestResult.date_time)) {
                  tm.latestResult = f;
                }
              }
            }

            // Record participation
            const addParticipation = (teamId: number) => {
              if (!statsMap[teamId]) {
                // Name will be populated if they win, otherwise we might not have it unless we query it.
                // Let's populate name later if possible, or just rely on teams that won at least once.
                statsMap[teamId] = {
                  name: "Team",
                  wins: 0,
                  finals: 0,
                  totalMatches: 0,
                  matchesWon: 0,
                };
              }
              statsMap[teamId].totalMatches += 1;
            };

            if (f.team1_id) addParticipation(f.team1_id);
            if (f.team2_id) addParticipation(f.team2_id);

            if (f.winner_team_id) {
              if (!statsMap[f.winner_team_id]) {
                statsMap[f.winner_team_id] = {
                  name: f.teams?.name || "Team",
                  wins: 0,
                  finals: 0,
                  totalMatches: 0,
                  matchesWon: 0,
                };
              }
              statsMap[f.winner_team_id].matchesWon += 1;

              // Update name robustly
              if (f.winner?.name) {
                statsMap[f.winner_team_id].name = f.winner.name;
              }

              if (f.stage?.toLowerCase() === "final") {
                statsMap[f.winner_team_id].wins += 1;
              }
            }

            if (f.stage?.toLowerCase() === "final") {
              if (f.team1_id && statsMap[f.team1_id])
                statsMap[f.team1_id].finals += 1;
              if (f.team2_id && statsMap[f.team2_id])
                statsMap[f.team2_id].finals += 1;
            }
          });

          // Map latest champions per tournament
          const tournamentChampions: Record<number, string> = {};
          
          // First pass: find explicit final winners
          allFixtures.forEach((f: any) => {
            if (
              f.stage?.toLowerCase() === "final" &&
              f.status === "completed" &&
              f.winner_team_id &&
              f.tournament_id
            ) {
              tournamentChampions[f.tournament_id] = f.winner?.name;
            }
          });

          // Second pass: fallback to standings leader for completed tournaments without a final
          const fixturesByTourney = allFixtures.reduce((acc: any, f: any) => {
            if (!acc[f.tournament_id]) acc[f.tournament_id] = [];
            acc[f.tournament_id].push(f);
            return acc;
          }, {});

          Object.keys(fixturesByTourney).forEach((tIdStr) => {
            const tId = parseInt(tIdStr);
            if (tournamentChampions[tId]) return; // already has a champion

            const tFixtures = fixturesByTourney[tIdStr];
            
            // Calculate standings
            const table = new Map<number, { name: string; points: number; diff: number }>();
            tFixtures.forEach((f: any) => {
              if (f.status !== "completed") return;

              if (!table.has(f.team1_id) && f.team1_id)
                table.set(f.team1_id, { name: f.team1?.name || "Unknown", points: 0, diff: 0 });
              if (!table.has(f.team2_id) && f.team2_id)
                table.set(f.team2_id, { name: f.team2?.name || "Unknown", points: 0, diff: 0 });

              const t1 = table.get(f.team1_id);
              const t2 = table.get(f.team2_id);
              if (!t1 || !t2) return;

              let t1Scored = 0, t1Conceded = 0;
              if (f.score?.sets) {
                f.score.sets.forEach((set: any) => {
                  t1Scored += Number(set.team1Points || 0);
                  t1Conceded += Number(set.team2Points || 0);
                });
              }
              t1.diff += t1Scored - t1Conceded;
              t2.diff += t1Conceded - t1Scored;

              const s1 = f.score?.team1Score || 0;
              const s2 = f.score?.team2Score || 0;

              if (f.winner_team_id === f.team1_id || s1 > s2) {
                t1.points += 2;
              } else if (f.winner_team_id === f.team2_id || s2 > s1) {
                t2.points += 2;
              } else {
                t1.points += 1;
                t2.points += 1;
              }
            });

            const standings = Array.from(table.values()).sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              return b.diff - a.diff;
            });

            if (standings.length > 0 && standings[0].points > 0) {
              tournamentChampions[tId] = standings[0].name;
              if (meta[tId]) {
                meta[tId].currentLeader = standings[0].name;
              }
            }
          });

          setTournamentMeta(meta);
          setLiveFixtures(live.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime()));

          setTournaments((prev) =>
            prev.map((t) => ({
              ...t,
              champion_name: tournamentChampions[t.id],
            })),
          );

          const sortedStats = Object.values(statsMap)
            .filter((t) => t.wins > 0 || t.finals > 0)
            .sort(
              (a, b) =>
                b.wins - a.wins ||
                b.finals - a.finals ||
                b.matchesWon / Math.max(b.totalMatches, 1) -
                  a.matchesWon / Math.max(a.totalMatches, 1),
            )
            .slice(0, 5);
          setTeamStats(sortedStats);
        }
      } catch (err) {
        console.error("Failed to load tournament data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredTournaments = tournaments.filter((t) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "LIVE") return tournamentMeta[t.id]?.liveCount > 0;
    if (activeFilter === "ACTIVE")
      return (
        t.phase === "upcoming" ||
        t.phase === "round-robin" ||
        t.phase === "knockout"
      );
    if (activeFilter === "COMPLETED") return t.phase === "completed";
    if (activeFilter === "DIVISION 1") return t.division === "Division 1";
    if (activeFilter === "DIVISION 2") return t.division === "Division 2";
    return true;
  });

  const featuredTournaments = filteredTournaments.filter(
    (t) => t.phase !== "completed" || activeFilter === "COMPLETED"
  );

  const historicTournaments = activeFilter === "ALL" 
    ? tournaments.filter((t) => t.phase === "completed")
    : [];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-black">
      {/* HEADER SECTION */}
      <section className="bg-zinc-950 border-b border-zinc-900 py-12 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950 to-zinc-950 z-0"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-start w-full">
          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500 font-bold mb-4 flex items-center">
            <Landmark className="h-4 w-4 mr-2" /> Official Records
          </p>
          <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-white mb-4">
            LEAGUE <span className="text-zinc-800">ARCHIVE</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-2xl text-[10px] md:text-sm leading-relaxed mb-8">
            The central hub for all active competitions and historical
            tournament records. Review past champions, discover upcoming
            circuits, and analyze ecosystem statistics.
          </p>

          {/* COMPACT ECOSYSTEM STATS */}
          <div className="flex flex-wrap gap-4 md:gap-8 items-center pt-6 border-t border-zinc-900/50 w-full max-w-3xl">
            <div>
              <span className="block text-xl font-black text-white italic leading-none mb-1">{tournaments.length}</span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Circuits</span>
            </div>
            <div className="hidden md:block w-px h-6 bg-zinc-900"></div>
            <div>
              <span className="block text-xl font-black text-white italic leading-none mb-1">{totalFixtures}</span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Matches</span>
            </div>
            <div className="hidden md:block w-px h-6 bg-zinc-900"></div>
            <div>
              <span className="block text-xl font-black text-white italic leading-none mb-1">{totalClubs}</span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Clubs</span>
            </div>
            <div className="hidden md:block w-px h-6 bg-zinc-900"></div>
            <div>
              <span className="block text-xl font-black text-white italic leading-none mb-1">{totalPlayers}</span>
              <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Athletes</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto w-full p-6 md:p-10 space-y-12">
        
        {/* LIVE NOW SECTION */}
        {liveFixtures.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight italic text-white uppercase">LIVE NOW</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               {liveFixtures.map(f => (
                 <div key={f.id} onClick={() => navigate(`/live`)} className="bg-zinc-950 border border-zinc-900 p-4 flex flex-col items-start gap-4 cursor-pointer hover:border-amber-500/50 transition-colors group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500 hidden group-hover:block"></div>
                    <div className="flex justify-between items-center w-full">
                       <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">{f.tournaments?.name || "Tournament Match"}</span>
                       <LiveTimer timerState={f.score?.timer} className="text-white font-mono ml-1" />
                    </div>
                    
                    <div className="w-full flex justify-between items-center bg-zinc-900/50 p-3">
                       <div className="flex items-center gap-3 w-2/5">
                         {f.team1?.logo_url ? (
                           <img src={f.team1.logo_url} className="w-6 h-6 object-cover bg-zinc-900" alt="team1" />
                         ) : (
                           <div className="w-6 h-6 bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-white flex items-center justify-center">T1</div>
                         )}
                         <span className="text-xs md:text-sm font-bold text-white truncate">{f.team1?.name}</span>
                       </div>
                       
                       <div className="flex-1 flex justify-center px-2">
                           <SetScoreHistory 
                              sets={f.score?.sets} 
                              activeSet={f.score?.activeSet} 
                              team1Id={f.team1_id} 
                              team2Id={f.team2_id} 
                           />
                       </div>

                       <div className="flex items-center justify-end gap-3 w-2/5">
                         <span className="text-xs md:text-sm font-bold text-white truncate text-right">{f.team2?.name}</span>
                         {f.team2?.logo_url ? (
                           <img src={f.team2.logo_url} className="w-6 h-6 object-cover bg-zinc-900" alt="team2" />
                         ) : (
                           <div className="w-6 h-6 bg-zinc-900 border border-zinc-800 text-[8px] font-bold text-white flex items-center justify-center">T2</div>
                         )}
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </section>
        )}

        {/* QUICK FILTERS */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4 pb-4 border-b border-zinc-900">
           <Filter className="h-4 w-4 text-zinc-500 mr-2" />
           {["ALL", "LIVE", "ACTIVE", "COMPLETED", "DIVISION 1", "DIVISION 2"].map(f => (
             <button
               key={f}
               onClick={() => setActiveFilter(f)}
               className={`text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 transition-colors ${
                 activeFilter === f 
                   ? "bg-amber-500 text-black" 
                   : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
               }`}
             >
               {f}
             </button>
           ))}
        </div>

        {/* FEATURED COMPETITIONS SECTION */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-2 font-bold flex items-center">
                <Trophy className="h-4 w-4 mr-2" /> Premier Events
              </p>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight italic text-white uppercase">
                Featured Competitions
              </h2>
            </div>
          </div>

          {featuredTournaments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-900 bg-zinc-950/20">
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                No active competitions match your filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTournaments.map((t) => {
                const meta = tournamentMeta[t.id];
                const isLive = meta?.liveCount > 0;
                
                return (
                <Card
                  key={t.id}
                  className="bg-zinc-950 border-zinc-900 rounded-none overflow-hidden group hover:border-amber-500/30 transition-colors flex flex-col"
                >
                  {t.banner_url ? (
                    <div className="h-40 w-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10" />
                      {isLive && (
                        <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 flex items-center">
                           <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1.5"></span> LIVE
                        </div>
                      )}
                      <img
                        src={t.banner_url}
                        alt={t.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-zinc-900 flex items-center justify-center relative overflow-hidden group-hover:bg-zinc-800 transition-colors">
                      {isLive && (
                        <div className="absolute top-4 left-4 z-20 bg-red-500 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 flex items-center">
                           <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1.5"></span> LIVE
                        </div>
                      )}
                      <Trophy className="h-10 w-10 text-zinc-800 group-hover:text-amber-500/20 transition-colors" />
                    </div>
                  )}
                  <CardHeader className="p-6 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded-sm border border-amber-500/20">
                        {t.division || "Open Division"}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold">
                        {t.phase || "Active"}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-black italic text-white group-hover:text-amber-500 transition-colors line-clamp-2">
                      {t.name}
                    </CardTitle>
                    
                    <div className="flex items-center gap-4 mt-4">
                       <div className="flex flex-col">
                          <span className="text-lg font-black text-white leading-none">{meta?.teams?.size || 0}</span>
                          <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Teams</span>
                       </div>
                       <div className="w-px h-6 bg-zinc-800"></div>
                       <div className="flex flex-col">
                          <span className="text-lg font-black text-white leading-none">{meta?.matchCount || 0}</span>
                          <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Matches</span>
                       </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 mt-auto flex flex-col gap-4">
                    {meta?.currentLeader && (
                      <div className="bg-zinc-900/50 p-2.5 flex items-center gap-2">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[9px] uppercase text-zinc-400 font-bold">Leader:</span>
                        <span className="text-[10px] uppercase font-black text-white truncate">{meta.currentLeader}</span>
                      </div>
                    )}

                    <Link to={`/tournaments/${t.id}`}>
                      <Button className="w-full h-10 bg-zinc-900 text-white hover:bg-amber-500 hover:text-black uppercase text-[10px] font-bold tracking-widest transition-all">
                        Enter Hub
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )})}
            </div>
          )}
        </section>

        {/* BEST TEAMS / STORYLINES SECTION */}
        {teamStats.length > 0 && (
          <section className="bg-zinc-950 border border-zinc-900 p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-zinc-900">
              <Shield className="h-5 w-5 text-amber-500" />
              <h2 className="text-2xl font-black tracking-tight italic text-white uppercase">
                Prestigious Clubs
              </h2>
            </div>

            <div className="space-y-4">
              {teamStats.map((team, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-4 bg-zinc-900/40 border border-zinc-800 hover:border-amber-500/20 transition-colors group cursor-default"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black w-6 h-6 flex items-center justify-center bg-zinc-900 text-zinc-500 shrink-0 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                      {team.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <span className="block text-xl font-black italic text-zinc-400">
                        {team.totalMatches > 0
                          ? Math.round(
                              (team.matchesWon / team.totalMatches) * 100,
                            )
                          : 0}
                        %
                      </span>
                      <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
                        Win Rate
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xl font-black italic text-zinc-400">
                        {team.finals}
                      </span>
                      <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
                        Finals
                      </span>
                    </div>
                    <div className="text-right min-w-[3rem]">
                      <span className="block text-xl font-black italic text-amber-500">
                        {team.wins}
                      </span>
                      <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
                        Wins
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* HISTORIC TOURNAMENTS SECTION */}
        {historicTournaments.length > 0 && activeFilter === "ALL" && (
          <section>
            <div className="flex items-end justify-between mb-8 pb-4 border-b border-zinc-900">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 font-bold flex items-center">
                  <History className="h-3 w-3 mr-2" /> Legacy Records
                </p>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight italic text-zinc-300 uppercase">
                  Historic Tournaments
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {historicTournaments.map((t) => (
                <Link
                  to={`/tournaments/${t.id}`}
                  key={t.id}
                  className="block group"
                >
                  <div className="bg-zinc-950 border border-zinc-900 rounded-none overflow-hidden hover:border-zinc-700 transition-all h-full flex flex-col opacity-80 hover:opacity-100">
                    {t.banner_url ? (
                      <div className="h-32 w-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-black/60 group-hover:bg-black/30 transition-colors z-10" />
                        <img
                          src={t.banner_url}
                          alt={t.name}
                          className="w-full h-full object-cover grayscale transition-all duration-500 opacity-50 group-hover:opacity-100"
                        />
                      </div>
                    ) : (
                      <div className="h-2 bg-zinc-900 w-full" />
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold border border-zinc-800 px-2 py-0.5">
                          {t.division || "Open"}
                        </span>
                        {t.end_date && (
                          <span className="text-[9px] font-mono text-zinc-600">
                            {new Date(t.end_date).getFullYear()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-black italic text-zinc-400 group-hover:text-white transition-colors mb-2 line-clamp-1">
                        {t.name}
                      </h3>
                      {t.champion_name && (
                        <p className="text-[10px] text-amber-500 uppercase tracking-widest font-bold mt-auto flex items-center">
                          <Trophy className="h-3 w-3 mr-1" />
                          {t.champion_name}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
