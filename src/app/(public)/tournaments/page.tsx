import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import {
  CalendarDays,
  Trophy,
  Activity,
  Landmark,
  Shield,
  History,
  Users,
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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

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
              "team1_id, team2_id, winner_team_id, tournament_id, stage, teams!winner_team_id(id, name)",
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

          allFixtures.forEach((f: any) => {
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
              if (f.teams?.name) {
                statsMap[f.winner_team_id].name = f.teams.name;
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
          allFixtures.forEach((f: any) => {
            if (
              f.stage?.toLowerCase() === "final" &&
              f.winner_team_id &&
              f.tournament_id
            ) {
              tournamentChampions[f.tournament_id] = f.teams?.name;
            }
          });
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

  const activeTournaments = tournaments.filter(
    (t) =>
      t.phase === "upcoming" ||
      t.phase === "round-robin" ||
      t.phase === "knockout",
  );
  const historicTournaments = tournaments.filter(
    (t) => t.phase === "completed",
  );

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
      <section className="bg-zinc-950 border-b border-zinc-900 py-20 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950 to-zinc-950 z-0"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-start">
          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500 font-bold mb-4 flex items-center">
            <Landmark className="h-4 w-4 mr-2" /> Official Records
          </p>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-white mb-6">
            LEAGUE <span className="text-zinc-800">ARCHIVE</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-2xl text-sm md:text-base leading-relaxed">
            The central hub for all active competitions and historical
            tournament records. Review past champions, discover upcoming
            circuits, and analyze ecosystem statistics.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto w-full p-6 md:p-10 space-y-20">
        {/* LEAGUE STATISTICS SECTION */}
        <section>
          <h2 className="text-2xl font-black tracking-tight italic text-white flex items-center gap-3 mb-8">
            <Activity className="h-6 w-6 text-amber-500" /> League Ecosystem
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col">
              <span className="text-3xl font-black text-white italic mb-1">
                {tournaments.length}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                Total Circuits
              </span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col">
              <span className="text-3xl font-black text-white italic mb-1">
                {totalClubs}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                Registered Clubs
              </span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col">
              <span className="text-3xl font-black text-white italic mb-1">
                {totalFixtures}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                Fixtures Played
              </span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col">
              <span className="text-3xl font-black text-white italic mb-1">
                {totalPlayers}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                Active Athletes
              </span>
            </div>
          </div>
        </section>

        {/* ACTIVE TOURNAMENTS SECTION */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 mb-2 font-bold">
                Current Competitions
              </p>
              <h2 className="text-3xl font-black tracking-tight italic text-white">
                Active Circuits
              </h2>
            </div>
          </div>

          {activeTournaments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-900 bg-zinc-950/20">
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                No active tournaments currently
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTournaments.map((t) => (
                <Card
                  key={t.id}
                  className="bg-zinc-950 border-zinc-900 rounded-none overflow-hidden group hover:border-amber-500/30 transition-colors flex flex-col"
                >
                  {t.banner_url ? (
                    <div className="h-40 w-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10" />
                      <img
                        src={t.banner_url}
                        alt={t.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-zinc-900 flex items-center justify-center relative overflow-hidden group-hover:bg-zinc-800 transition-colors">
                      <Trophy className="h-10 w-10 text-zinc-800 group-hover:text-amber-500/20 transition-colors" />
                    </div>
                  )}
                  <CardHeader className="p-6">
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
                    {t.start_date && (
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mt-2 flex items-center">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        {new Date(t.start_date).toLocaleDateString()}{" "}
                        {t.end_date
                          ? ` - ${new Date(t.end_date).toLocaleDateString()}`
                          : ""}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="p-6 pt-0 mt-auto">
                    <Link to={`/tournaments/${t.id}`}>
                      <Button className="w-full bg-zinc-900 text-white hover:bg-amber-500 hover:text-black uppercase text-[10px] font-bold tracking-widest transition-all">
                        Enter Hub
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* HISTORIC TOURNAMENTS SECTION */}
        <section>
          <div className="flex items-end justify-between mb-8 pb-4 border-b border-zinc-900">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 font-bold flex items-center">
                <History className="h-3 w-3 mr-2" /> Legacy Records
              </p>
              <h2 className="text-3xl font-black tracking-tight italic text-zinc-300">
                Historic Tournaments
              </h2>
            </div>
          </div>

          {historicTournaments.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-900 bg-zinc-950/20">
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
                No historic records available
              </p>
            </div>
          ) : (
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
          )}
        </section>

        {/* BEST TEAMS SECTION */}
        {teamStats.length > 0 && (
          <section className="bg-zinc-950 border border-zinc-900 p-8">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-zinc-900">
              <Shield className="h-5 w-5 text-amber-500" />
              <h2 className="text-2xl font-black tracking-tight italic text-white">
                Prestigious Clubs
              </h2>
            </div>

            <div className="space-y-4">
              {teamStats.map((team, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-4 bg-zinc-900/40 border border-zinc-800 hover:border-amber-500/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black w-6 h-6 flex items-center justify-center bg-zinc-900 text-zinc-500 shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white uppercase tracking-wider">
                      {team.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
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
      </div>
    </div>
  );
}
