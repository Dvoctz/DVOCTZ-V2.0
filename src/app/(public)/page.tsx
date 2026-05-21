"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trophy,
  ChevronRight,
  Play,
  CalendarDays,
  Sword,
  AlignEndHorizontal,
} from "lucide-react";
import { TournamentStandings } from "@/components/standings/tournament-standings";

type Tournament = {
  id: number;
  name: string;
  division: string;
  phase: string;
  show_champion_banner: boolean;
  banner_url?: string;
};

type FixturePreview = {
  id: number;
  tournament_id: number;
  status: string;
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
  } | null;
  winner?: { name: string };
  tournaments?: { name: string; division?: string; phase?: string };
};

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState<FixturePreview[]>(
    [],
  );
  const [recentFixtures, setRecentFixtures] = useState<FixturePreview[]>([]);
  const [sponsors, setSponsors] = useState<
    { id: string; name: string; logo_url: string }[]
  >([]);
  const [div1Champion, setDiv1Champion] = useState<{
    teamName: string;
    tournamentName: string;
    tournamentId: number;
  } | null>(null);
  const [div2Champion, setDiv2Champion] = useState<{
    teamName: string;
    tournamentName: string;
    tournamentId: number;
  } | null>(null);

  useEffect(() => {
    const loadHomeData = async () => {
      const [tRes, uRes, rRes, sRes] = await Promise.all([
        supabase
          .from("tournaments")
          .select("*")
          .order("id", { ascending: false }),
        supabase
          .from("fixtures")
          .select(
            "id, tournament_id, team1_id, team2_id, status, date_time, ground, best_of, team1:teams!team1_id(name, logo_url), team2:teams!team2_id(name, logo_url), tournaments(name, division, phase)",
          )
          .eq("status", "upcoming")
          .order("date_time", { ascending: true })
          .limit(20),
        supabase
          .from("fixtures")
          .select(
            "id, tournament_id, team1_id, team2_id, status, date_time, ground, best_of, score, winner:teams!winner_team_id(name), team1:teams!team1_id(name, logo_url), team2:teams!team2_id(name, logo_url), tournaments(name, division, phase)",
          )
          .eq("status", "completed")
          .order("date_time", { ascending: false })
          .limit(5),
        supabase.from("sponsors").select("*"),
      ]);

      const loadedTournaments = tRes.data || [];
      setTournaments(loadedTournaments);
      if (uRes.data) setUpcomingFixtures(uRes.data);
      if (rRes.data) setRecentFixtures(rRes.data);
      if (sRes.data) setSponsors(sRes.data);

      // Champion extraction logic
      const latestDiv1 = loadedTournaments.find(
        (t) => t.division === "Division 1" && t.phase === "completed",
      );
      const latestDiv2 = loadedTournaments.find(
        (t) => t.division === "Division 2" && t.phase === "completed",
      );

      const fetchChampion = async (tournament: Tournament) => {
        const { data: fixtures } = await supabase
          .from("fixtures")
          .select(
            "*, team1:teams!team1_id(name), team2:teams!team2_id(name), winner:teams!winner_team_id(name)",
          )
          .eq("tournament_id", tournament.id)
          .eq("status", "completed");

        if (!fixtures || fixtures.length === 0) return null;

        if (tournament.phase === "knockout") {
          const finalMatch = fixtures.find((f) => f.stage === "final");
          if (finalMatch && finalMatch.winner) {
            return {
              teamName: finalMatch.winner.name,
              tournamentName: tournament.name,
              tournamentId: tournament.id,
            };
          }
          // Fallback if no specific 'final' stage found, try last match
          const lastMatch = fixtures.sort(
            (a, b) =>
              new Date(b.date_time).getTime() - new Date(a.date_time).getTime(),
          )[0];
          if (lastMatch && lastMatch.winner) {
            return {
              teamName: lastMatch.winner.name,
              tournamentName: tournament.name,
              tournamentId: tournament.id,
            };
          }
        } else {
          // Round Robin Standings calculation inline
          const table = new Map<
            number,
            { name: string; points: number; diff: number }
          >();
          fixtures.forEach((f) => {
            if (!table.has(f.team1_id) && f.team1_id)
              table.set(f.team1_id, {
                name: f.team1?.name || "Unknown",
                points: 0,
                diff: 0,
              });
            if (!table.has(f.team2_id) && f.team2_id)
              table.set(f.team2_id, {
                name: f.team2?.name || "Unknown",
                points: 0,
                diff: 0,
              });

            const t1 = table.get(f.team1_id);
            const t2 = table.get(f.team2_id);
            if (!t1 || !t2) return;

            let t1Scored = 0,
              t1Conceded = 0;
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

          if (standings.length > 0) {
            return {
              teamName: standings[0].name,
              tournamentName: tournament.name,
              tournamentId: tournament.id,
            };
          }
        }
        return null;
      };

      if (latestDiv1) {
        const champ = await fetchChampion(latestDiv1);
        if (champ) setDiv1Champion(champ);
      }
      if (latestDiv2) {
        const champ = await fetchChampion(latestDiv2);
        if (champ) setDiv2Champion(champ);
      }
    };

    loadHomeData();
  }, []);

  const championTournament = tournaments.find((t) => t.show_champion_banner);

  const activeTournaments = tournaments.filter((t) => t.phase !== "completed");
  const activeDiv1 = activeTournaments.find((t) => t.division === "Division 1");
  const activeDiv2 = activeTournaments.find((t) => t.division === "Division 2");

  const getNearestFixtures = (fixturesToFilter: FixturePreview[]) => {
    if (fixturesToFilter.length === 0) return [];
    const today = new Date().toDateString();
    const todayFixtures = fixturesToFilter.filter(
      (f) => new Date(f.date_time).toDateString() === today,
    );
    if (todayFixtures.length > 0) return todayFixtures.slice(0, 3);

    const nearestDate = new Date(fixturesToFilter[0].date_time).toDateString();
    return fixturesToFilter
      .filter((f) => new Date(f.date_time).toDateString() === nearestDate)
      .slice(0, 3);
  };

  const upcomingDiv1 = getNearestFixtures(
    upcomingFixtures.filter(
      (f) =>
        f.tournaments?.division === "Division 1" &&
        f.tournaments?.phase !== "completed",
    ),
  );
  const upcomingDiv2 = getNearestFixtures(
    upcomingFixtures.filter(
      (f) =>
        f.tournaments?.division === "Division 2" &&
        f.tournaments?.phase !== "completed",
    ),
  );

  const renderUpcomingCard = (f: FixturePreview) => (
    <div
      key={f.id}
      className="group p-5 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900/80 transition-colors flex flex-col justify-between"
    >
      <div className="flex justify-between items-center mb-5">
        <span
          className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm border ${f.tournaments?.division === "Division 1" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}
        >
          {f.tournaments?.division || "Div"}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-zinc-900 text-zinc-500 border border-zinc-800">
          BO{f.best_of}
        </span>
      </div>
      <div className="flex justify-between items-center gap-3 mb-5">
        <div className="flex-1 min-w-0 text-center flex flex-col items-center justify-center">
          {f.team1?.logo_url ? (
            <div className="w-8 h-8 mb-2 bg-white/5 rounded-full p-1 border border-zinc-800 flex items-center justify-center overflow-hidden">
              <img
                src={f.team1.logo_url}
                alt={f.team1.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 mb-2 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                {f.team1?.name?.substring(0, 2) || "T1"}
              </span>
            </div>
          )}
          <span className="block text-sm font-bold text-white truncate w-full">
            {f.team1?.name || "TBD"}
          </span>
        </div>
        <span className="text-[10px] text-zinc-600 font-bold uppercase shrink-0">
          vs
        </span>
        <div className="flex-1 min-w-0 text-center flex flex-col items-center justify-center">
          {f.team2?.logo_url ? (
            <div className="w-8 h-8 mb-2 bg-white/5 rounded-full p-1 border border-zinc-800 flex items-center justify-center overflow-hidden">
              <img
                src={f.team2.logo_url}
                alt={f.team2.name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 mb-2 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                {f.team2?.name?.substring(0, 2) || "T2"}
              </span>
            </div>
          )}
          <span className="block text-sm font-bold text-white truncate w-full">
            {f.team2?.name || "TBD"}
          </span>
        </div>
      </div>
      <div className="text-center pt-4 border-t border-zinc-900">
        <span className="block text-[10px] font-mono text-zinc-500 group-hover:text-zinc-400 transition-colors">
          {new Date(f.date_time).toLocaleDateString()} •{" "}
          {new Date(f.date_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="relative px-6 md:px-10 py-24 flex flex-col gap-10 overflow-hidden flex-1 border-b border-zinc-900 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500/10 via-black to-black object-cover z-0" />
        <header className="relative z-10 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-500 font-bold mb-4 flex items-center">
            <Trophy className="mr-2 h-4 w-4" /> Season 04 Open
          </p>
          <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter leading-[0.85] uppercase italic select-none text-white mb-8">
            DAR VOLLEYBALL
            <br />
            <span className="text-zinc-800">LEAGUE SYSTEM</span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400 font-medium max-w-xl leading-relaxed mb-10">
            DVOC V2 is the official league administration platform for Dar es
            Salaam's premier volleyball circuits. Experience professional
            governance, historic standing records, and elite competition
            tracking.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/tournaments" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full bg-white text-black hover:bg-zinc-200 uppercase tracking-widest font-bold text-xs h-12"
              >
                Access Standings
              </Button>
            </Link>
          </div>
        </header>
        <div className="absolute -right-4 top-0 opacity-10 pointer-events-none select-none z-0">
          <span className="text-[16rem] md:text-[24rem] font-black leading-none text-white">
            V2
          </span>
        </div>
      </section>

      {/* Champion Banner Section */}
      {(div1Champion || div2Champion) && (
        <section className="bg-gradient-to-b from-amber-500/10 to-black border-b border-amber-500/20 p-8 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>

          <div className="text-center mb-10 relative z-10">
            <Trophy className="h-8 w-8 text-amber-500 mx-auto mb-3 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            <h2 className="text-xl md:text-2xl font-black italic tracking-tight text-white uppercase">
              Current Champions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto relative z-10">
            {div1Champion && (
              <div className="bg-zinc-950/80 border border-amber-500/30 p-8 text-center relative group overflow-hidden hover:border-amber-500 transition-colors">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500 font-bold mb-2">
                  Division 1 Current Champions
                </p>
                <h3 className="text-3xl md:text-4xl font-black italic text-white mb-4 drop-shadow-sm">
                  {div1Champion.teamName}
                </h3>
                <p className="text-xs text-zinc-400 mb-6 font-medium">
                  {div1Champion.tournamentName}
                </p>
                <Link to={`/tournaments/${div1Champion.tournamentId}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-black uppercase tracking-widest text-[10px] font-bold"
                  >
                    View Path to Victory
                  </Button>
                </Link>
              </div>
            )}

            {div2Champion && (
              <div className="bg-zinc-950/80 border border-amber-500/30 p-8 text-center relative group overflow-hidden hover:border-amber-500 transition-colors">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500 font-bold mb-2">
                  Division 2 Current Champions
                </p>
                <h3 className="text-3xl md:text-4xl font-black italic text-white mb-4 drop-shadow-sm">
                  {div2Champion.teamName}
                </h3>
                <p className="text-xs text-zinc-400 mb-6 font-medium">
                  {div2Champion.tournamentName}
                </p>
                <Link to={`/tournaments/${div2Champion.tournamentId}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-black uppercase tracking-widest text-[10px] font-bold"
                  >
                    View Path to Victory
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      <section className="border-b border-zinc-900 bg-black p-6 md:p-10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-bold tracking-tight italic text-white flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-500" /> Upcoming Matches
          </h3>
        </div>

        {[...upcomingDiv1, ...upcomingDiv2].length === 0 ? (
          <div className="p-8 border border-dashed border-zinc-800 text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
              No upcoming active fixtures
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...upcomingDiv1, ...upcomingDiv2]
              .sort(
                (a, b) =>
                  new Date(a.date_time).getTime() -
                  new Date(b.date_time).getTime(),
              )
              .map((f) => renderUpcomingCard(f))}
          </div>
        )}
      </section>

      {/* Standings Preview */}
      {(activeDiv1 || activeDiv2) && (
        <section
          id="standings"
          className="bg-black border-b border-zinc-900 p-6 md:p-10 flex flex-col flex-1"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 font-semibold">
                League Leaderboards
              </p>
              <h2 className="text-3xl font-bold tracking-tight italic text-white flex items-center gap-2">
                <AlignEndHorizontal className="h-6 w-6 text-amber-500" />{" "}
                Official Standings
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {activeDiv1 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">
                    {activeDiv1.name}
                  </h3>
                  <Link to={`/tournaments/${activeDiv1.id}`}>
                    <Button
                      variant="outline"
                      className="border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 uppercase tracking-widest font-bold text-[10px] h-8 px-4"
                    >
                      Full <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <div className="border border-zinc-900 bg-zinc-950 p-1 shadow-2xl overflow-hidden rounded-sm">
                  <TournamentStandings tournamentId={activeDiv1.id} />
                </div>
              </div>
            )}
            {activeDiv2 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">
                    {activeDiv2.name}
                  </h3>
                  <Link to={`/tournaments/${activeDiv2.id}`}>
                    <Button
                      variant="outline"
                      className="border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 uppercase tracking-widest font-bold text-[10px] h-8 px-4"
                    >
                      Full <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <div className="border border-zinc-900 bg-zinc-950 p-1 shadow-2xl overflow-hidden rounded-sm">
                  <TournamentStandings tournamentId={activeDiv2.id} />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Sponsors Section */}
      {sponsors.length > 0 && (
        <section className="bg-black py-16 border-t border-zinc-900 border-b">
          <div className="max-w-[1200px] mx-auto px-6 md:px-10">
            <h3 className="text-xs font-black tracking-widest uppercase text-zinc-600 text-center mb-10">
              Official Partners
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 hover:opacity-100 transition-opacity duration-500">
              {sponsors.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="w-24 md:w-32 h-16 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-300"
                >
                  {sponsor.logo_url ? (
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="max-w-full max-h-full object-contain mix-blend-screen"
                    />
                  ) : (
                    <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                      {sponsor.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
