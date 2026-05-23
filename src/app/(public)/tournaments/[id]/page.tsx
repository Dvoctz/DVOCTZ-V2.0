import React from "react";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { LiveTimer } from "@/components/ui/live-timer";
import { Trophy, CalendarDays, ChevronLeft, ArrowLeft } from "lucide-react";
import { TournamentStandings } from "@/components/standings/tournament-standings";

type Tournament = {
  id: number;
  name: string;
  division: string;
  phase: string;
  show_champion_banner: boolean;
  banner_url?: string;
};

type Fixture = {
  id: number;
  team1_id: number | null;
  team2_id: number | null;
  status: string;
  stage?: string;
  date_time: string;
  ground: string;
  best_of: number;
  referee: string;
  team1?: { name: string; logo_url?: string };
  team2?: { name: string; logo_url?: string };
  score: {
    resultMessage?: string;
    sets?: { team1Points: number; team2Points: number; winnerOverrideId?: string }[];
    team1Score?: number;
    team2Score?: number;
  } | null;
  winner?: { name: string };
};

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [rosters, setRosters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTournamentData = async () => {
      setLoading(true);
      try {
        const [tRes, fRes, rRes] = await Promise.all([
          supabase.from("tournaments").select("*").eq("id", id).single(),
          supabase
            .from("fixtures")
            .select(
              "id, team1_id, team2_id, status, is_live, live_state, stage, date_time, ground, best_of, referee, score, team1:teams!team1_id(name, logo_url), team2:teams!team2_id(name, logo_url), winner:teams!winner_team_id(name)",
            )
            .eq("tournament_id", id)
            .order("date_time", { ascending: true }),
          supabase
            .from("tournament_rosters")
            .select("team_id, player_id, players(name, role), teams(name)")
            .eq("tournament_id", id),
        ]);

        if (tRes.error) throw tRes.error;
        setTournament(tRes.data);
        if (!fRes.error && fRes.data) {
          const processedFixtures = fRes.data.map((f: any) => {
             const isLive = (f.status === "live" || f.is_live) && f.status !== "completed";
             return {
               ...f,
               score: isLive && f.live_state ? f.live_state : f.score
             };
          });
          setFixtures(processedFixtures);
        }
        if (!rRes.error && rRes.data) {
          setRosters(rRes.data);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load tournament");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadTournamentData();
  }, [id]);

  const FIXTURE_STAGES = ["round-robin", "quarterfinal", "semifinal", "final"];

  const renderSimpleCard = (f: Fixture) => (
    <div
      key={f.id}
      className="p-4 border border-zinc-900 bg-zinc-950 hover:border-zinc-800 transition-colors"
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-zinc-900 text-zinc-500 border border-zinc-800">
          Upcoming • BO{f.best_of}
        </span>
        <div className="text-right">
          <span className="block text-[10px] font-mono text-zinc-500">
            {new Date(f.date_time).toLocaleDateString()}{" "}
            {new Date(f.date_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="block text-[10px] text-zinc-600 mt-0.5">
            {f.ground}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 my-4">
        <div className="flex justify-between items-center w-full">
          <span className="text-sm font-bold text-white">
            {f.team1?.name || "TBD"}
          </span>
        </div>
        <div className="text-[10px] text-zinc-600 font-bold uppercase">vs</div>
        <div className="flex justify-between items-center w-full">
          <span className="text-sm font-bold text-white">
            {f.team2?.name || "TBD"}
          </span>
        </div>
      </div>

      {f.referee && (
        <div className="mt-4 pt-3 border-t border-zinc-900">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 truncate block">
            Ref: {f.referee}
          </span>
        </div>
      )}
    </div>
  );

  const renderLiveCard = (f: Fixture) => (
    <div
      key={f.id}
      className="p-5 border-2 border-amber-500/50 bg-black hover:bg-zinc-950 transition-colors relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.1)]"
    >
      <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full" />
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="text-[10px] uppercase font-black tracking-widest text-amber-500 flex items-center gap-1.5">
            <span>LIVE NOW</span>
            {f.score?.timer && <LiveTimer timerState={f.score.timer} className="text-white font-mono bg-amber-500/10 px-1.5 py-0.5 rounded-sm" />}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400 ml-3">
            BO{f.best_of}
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-mono text-zinc-400">
            {new Date(f.date_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="block text-[10px] text-zinc-500 mt-0.5">
            {f.ground}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 my-2 relative z-10 p-5 bg-zinc-950/80 border border-zinc-900 rounded-sm">
        <div className="flex justify-between items-center w-full gap-4">
          <span className="text-lg font-bold text-white truncate flex items-center gap-2">
            {f.score?.servingTeam === "t1" && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>}
            {f.team1?.name || "TBD"}
          </span>
          <span className="text-3xl font-black text-amber-500 shrink-0 tabular-nums leading-none">
            {f.score?.team1Score ?? "-"}
          </span>
        </div>
        <div className="w-full h-px bg-zinc-900 my-1" />
        <div className="flex justify-between items-center w-full gap-4">
          <span className="text-lg font-bold text-white truncate flex items-center gap-2">
            {f.score?.servingTeam === "t2" && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></span>}
            {f.team2?.name || "TBD"}
          </span>
          <span className="text-3xl font-black text-amber-500 shrink-0 tabular-nums leading-none">
            {f.score?.team2Score ?? "-"}
          </span>
        </div>
      </div>

      {f.score?.sets && f.score.sets.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 relative z-10">
          {f.score.sets.map((set: any, idx: number) => (
            <div
              key={idx}
              className={`flex flex-col items-center px-4 py-2 rounded-sm border ${f.score?.activeSet === idx ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-zinc-900/80 border-zinc-800'}`}
            >
              <span className={`text-[9px] uppercase font-black tracking-widest mb-1.5 ${f.score?.activeSet === idx ? 'text-amber-500' : 'text-zinc-500'}`}>
                Set {idx + 1}
              </span>
              <span
                className={`text-sm font-bold leading-none ${
                  (set.winnerOverrideId &&
                    set.winnerOverrideId === f.team1_id?.toString()) ||
                  (!set.winnerOverrideId && set.team1Points > set.team2Points)
                    ? "text-white"
                    : "text-zinc-400"
                }`}
              >
                {set.team1Points}
              </span>
              <div className={`w-full h-px my-1.5 ${f.score?.activeSet === idx ? 'bg-amber-500/30' : 'bg-zinc-800'}`} />
              <span
                className={`text-sm font-bold leading-none ${
                  (set.winnerOverrideId &&
                    set.winnerOverrideId === f.team2_id?.toString()) ||
                  (!set.winnerOverrideId && set.team2Points > set.team1Points)
                    ? "text-white"
                    : "text-zinc-400"
                }`}
              >
                {set.team2Points}
              </span>
            </div>
          ))}
        </div>
      )}

      {f.referee && (
        <div className="mt-5 pt-4 border-t border-zinc-900 relative z-10 flex justify-end">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 truncate block">
            Ref: {f.referee}
          </span>
        </div>
      )}
    </div>
  );

  const renderCompletedCard = (f: Fixture) => {
    const t1Winner = f.winner?.name && f.winner.name === f.team1?.name;
    const t2Winner = f.winner?.name && f.winner.name === f.team2?.name;

    return (
      <div
        key={f.id}
        className={`p-4 border transition-colors relative overflow-hidden ${f.winner ? "border-amber-500/20 bg-zinc-950" : "border-zinc-900 bg-zinc-950 hover:border-zinc-800"}`}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-zinc-800 text-white">
            Completed • BO{f.best_of}
          </span>
          <div className="text-right">
            <span className="block text-[10px] font-mono text-zinc-500">
              {new Date(f.date_time).toLocaleDateString()}
            </span>
            <span className="block text-[10px] text-zinc-600 mt-0.5">
              {f.ground}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 my-4">
          <div className="flex justify-between items-center w-full gap-4">
            <span
              className={`text-sm font-bold truncate ${t1Winner ? "text-amber-500" : "text-zinc-300"}`}
            >
              {f.team1?.name || "TBD"}{" "}
              {t1Winner && <span className="ml-1 opacity-80">🏆</span>}
            </span>
            <span className="text-lg font-black text-white shrink-0">
              {f.score?.team1Score ?? "-"}
            </span>
          </div>
          <div className="flex justify-between items-center w-full gap-4">
            <span
              className={`text-sm font-bold truncate ${t2Winner ? "text-amber-500" : "text-zinc-300"}`}
            >
              {f.team2?.name || "TBD"}{" "}
              {t2Winner && <span className="ml-1 opacity-80">🏆</span>}
            </span>
            <span className="text-lg font-black text-white shrink-0">
              {f.score?.team2Score ?? "-"}
            </span>
          </div>
        </div>

        {f.score?.sets && f.score.sets.length > 0 && (
          <div className="mt-4 mb-2 flex flex-wrap gap-2">
            {f.score.sets.map((set, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center bg-zinc-900 px-2.5 py-1.5 rounded-sm border border-zinc-800"
              >
                <span className="text-[8px] text-zinc-500 uppercase font-bold mb-1">
                  Set {idx + 1}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    (set.winnerOverrideId &&
                      set.winnerOverrideId === f.team1_id?.toString()) ||
                    (!set.winnerOverrideId && set.team1Points > set.team2Points)
                      ? "text-white"
                      : "text-zinc-400"
                  }`}
                >
                  {set.team1Points}
                </span>
                <div className="w-full h-px bg-zinc-800 my-0.5" />
                <span
                  className={`text-[10px] font-bold ${
                    (set.winnerOverrideId &&
                      set.winnerOverrideId === f.team2_id?.toString()) ||
                    (!set.winnerOverrideId && set.team2Points > set.team1Points)
                      ? "text-white"
                      : "text-zinc-400"
                  }`}
                >
                  {set.team2Points}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 truncate">
            {f.score?.resultMessage || "No specific result recorded"}
          </span>
          {f.referee && (
            <span className="text-[10px] text-zinc-600 truncate shrink-0">
              Ref: {f.referee}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderBracketCard = (f: Fixture) => {
    const t1Winner = f.winner?.name && f.winner.name === f.team1?.name;
    const t2Winner = f.winner?.name && f.winner.name === f.team2?.name;
    const isLive = (f.status === "live" || f.is_live) && f.status !== "completed";
    const isUpcoming = f.status === "upcoming" && !isLive;

    return (
      <div
        key={f.id}
        className={`w-full p-4 border relative overflow-hidden transition-all ${t1Winner || t2Winner ? "border-amber-500/30 bg-zinc-950/80 shadow-[0_0_15px_rgba(245,158,11,0.05)]" : isLive ? "border-amber-500 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"}`}
      >
        <div className="flex justify-between items-center mb-4">
          <span
            className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm border flex items-center gap-1 ${isLive ? "bg-amber-500/20 text-amber-500 border-amber-500/30 animate-pulse" : isUpcoming ? "bg-zinc-900 text-zinc-500 border-zinc-800" : "bg-zinc-800/80 text-zinc-400 border-zinc-700"}`}
          >
            {isLive ? (
              <>
                {f.score?.activeSet !== undefined ? `Set ${f.score.activeSet + 1} LIVE` : "LIVE"}
                {f.score?.timer && <LiveTimer timerState={f.score.timer} className="ml-1 text-white opacity-90" />}
              </>
            ) : isUpcoming ? "Upcoming" : "Result"} • BO
            {f.best_of}
          </span>
          <span className="text-[9px] font-mono text-zinc-500">
            {new Date(f.date_time).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div
            className={`flex justify-between items-center p-2 rounded-sm border transition-colors ${t1Winner || (isLive && f.score?.servingTeam === "t1") ? "bg-amber-500/10 border-amber-500/20" : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900"}`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {f.team1?.logo_url ? (
                <img
                  src={f.team1.logo_url}
                  className="w-4 h-4 object-contain"
                  alt=""
                />
              ) : (
                <div className="w-4 h-4 bg-zinc-800 rounded-full" />
              )}
              <span
                className={`text-xs font-bold truncate flex items-center gap-1.5 ${t1Winner ? "text-amber-500" : "text-zinc-300"}`}
              >
                {isLive && f.score?.servingTeam === "t1" && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce shrink-0"></span>}
                {f.team1?.name || "TBD"}
              </span>
            </div>
            <span
              className={`text-sm font-black tabular-nums pl-2 ${t1Winner || isLive ? "text-amber-500" : "text-zinc-500"}`}
            >
              {f.score?.team1Score ?? "-"}
            </span>
          </div>
          <div
            className={`flex justify-between items-center p-2 rounded-sm border transition-colors ${t2Winner || (isLive && f.score?.servingTeam === "t2") ? "bg-amber-500/10 border-amber-500/20" : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900"}`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {f.team2?.logo_url ? (
                <img
                  src={f.team2.logo_url}
                  className="w-4 h-4 object-contain"
                  alt=""
                />
              ) : (
                <div className="w-4 h-4 bg-zinc-800 rounded-full" />
              )}
              <span
                className={`text-xs font-bold truncate flex items-center gap-1.5 ${t2Winner ? "text-amber-500" : "text-zinc-300"}`}
              >
                {f.team2?.name || "TBD"}
                {isLive && f.score?.servingTeam === "t2" && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce shrink-0"></span>}
              </span>
            </div>
            <span
              className={`text-sm font-black tabular-nums pl-2 ${t2Winner || isLive ? "text-amber-500" : "text-zinc-500"}`}
            >
              {f.score?.team2Score ?? "-"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderBracketColumn = (title: string, stageFilters: string[]) => {
    const columnFixtures = fixtures.filter((f) =>
      stageFilters.includes(f.stage || "round-robin"),
    );

    return (
      <div className="flex flex-col flex-1 min-w-[280px] snap-center">
        <div className="mb-6 pb-3 border-b-2 border-amber-500/20 text-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-amber-500">
            {title}
          </h3>
        </div>
        <div className="flex flex-col gap-8 justify-around flex-1 relative h-full">
          {columnFixtures.length === 0 ? (
            <div className="p-6 border border-dashed border-zinc-800 text-center bg-zinc-950/50 min-h-[140px] flex items-center justify-center">
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
                TBD
              </span>
            </div>
          ) : (
            columnFixtures.map(renderBracketCard)
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">
          {error || "Tournament not found"}
        </p>
        <Link
          to="/"
          className="text-amber-500 text-xs font-bold uppercase tracking-widest hover:underline flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-20">
      <div className="px-6 md:px-10 pt-10 pb-6">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Circuit
        </Link>

        {/* Section 1: Tournament Info */}
        <section
          className={`mb-16 relative overflow-hidden border border-zinc-900 ${tournament.banner_url ? "" : "p-8"}`}
        >
          {tournament.banner_url ? (
            <div className="relative h-64 md:h-80 w-full flex items-end p-8">
              <img
                src={tournament.banner_url}
                alt={tournament.name}
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.8)_0%,transparent_100%)] z-10" />
              <div className="relative z-20 flex items-start gap-6 w-full">
                <div className="w-20 h-20 bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)] hidden sm:flex">
                  <Trophy className="w-10 h-10 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-500 font-bold mb-2 drop-shadow-md">
                    {tournament.division || "Major Tier"}
                  </p>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic text-white leading-tight drop-shadow-lg max-w-4xl">
                    {tournament.name}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-900/80 backdrop-blur-sm text-zinc-300 px-3 py-1 border border-zinc-700/50 rounded-sm">
                      Phase: {tournament.phase}
                    </span>
                    {tournament.show_champion_banner && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 backdrop-blur-sm text-amber-400 px-3 py-1 border border-amber-500/30 rounded-sm">
                        Champion Banner Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                <Trophy className="w-10 h-10 text-amber-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-500 font-bold mb-2">
                  {tournament.division || "Major Tier"}
                </p>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic text-white leading-tight">
                  {tournament.name}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-900 text-zinc-300 px-3 py-1 border border-zinc-800 rounded-sm">
                    Phase: {tournament.phase}
                  </span>
                  {tournament.show_champion_banner && (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 px-3 py-1 border border-amber-500/20 rounded-sm">
                      Champion Banner Active
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {tournament.phase === "knockout" && (
          <section className="mb-16 bg-black border border-zinc-900 p-6 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
            <h2 className="text-xl font-black tracking-widest uppercase text-white flex items-center gap-3 mb-10 border-b border-zinc-800 pb-4 relative z-10">
              <div className="w-2 h-2 bg-amber-500 rotate-45" /> Knockout
              Bracket
            </h2>
            <div className="flex flex-col md:flex-row gap-8 overflow-x-auto pb-4 snap-x relative z-10 w-full min-h-[300px]">
              {renderBracketColumn("Quarterfinals", ["quarterfinal"])}
              {renderBracketColumn("Semifinals", ["semifinal"])}
              {renderBracketColumn("Final", ["final"])}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
          {/* Section 2: Fixtures (Left Column) */}
          <section className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-bold tracking-tight italic text-white flex items-center gap-2 mb-6">
              <CalendarDays className="w-5 h-5 text-zinc-500" /> Match Fixtures
            </h2>

            {fixtures.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 bg-zinc-900/20">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  No fixtures slated
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {FIXTURE_STAGES.map((stage) => {
                  const stageFixtures = fixtures.filter(
                    (f) => (f.stage || "round-robin") === stage,
                  );
                  if (stageFixtures.length === 0) return null;

                  const liveFixtures = stageFixtures.filter(
                    (f) => (f.status === "live" || f.is_live) && f.status !== "completed",
                  );
                  const upcomingFixtures = stageFixtures.filter(
                    (f) => f.status === "upcoming" && f.status !== "completed" && !(f.status === "live" || f.is_live),
                  );
                  const completedFixtures = stageFixtures.filter(
                    (f) => f.status === "completed",
                  );

                  const isKnockoutStage = stage !== "round-robin";

                  return (
                    <div
                      key={stage}
                      className={`space-y-6 relative ${isKnockoutStage && tournament.phase === "knockout" ? "bg-zinc-900/10 border border-zinc-800/50 p-4 -mx-4" : ""}`}
                    >
                      <h3
                        className={`text-xs font-black uppercase tracking-widest border-b pb-2 flex items-center gap-2 ${isKnockoutStage && tournament.phase === "knockout" ? "text-amber-500 border-amber-500/20" : "text-zinc-300 border-zinc-800"}`}
                      >
                        {isKnockoutStage && tournament.phase === "knockout" ? (
                          <div className="w-2 h-2 bg-amber-500 rotate-45" />
                        ) : (
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        )}
                        {stage.replace("-", " ")}
                      </h3>
                      <div className="space-y-8">
                        {liveFixtures.length > 0 && (
                          <div>
                            <h4 className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-3 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Live Matches
                            </h4>
                            <div className="space-y-4">
                              {liveFixtures.map((f) => renderLiveCard(f))}
                            </div>
                          </div>
                        )}

                        {upcomingFixtures.length > 0 && (
                          <div>
                            <h4 className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-3">
                              Upcoming Matches
                            </h4>
                            <div className="space-y-4">
                              {upcomingFixtures.map((f) => renderSimpleCard(f))}
                            </div>
                          </div>
                        )}

                        {completedFixtures.length > 0 && (
                          <div>
                            <h4 className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-3">
                              Completed Matches
                            </h4>
                            <div className="space-y-4">
                              {completedFixtures.map((f) =>
                                renderCompletedCard(f),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 3: Standings (Right Column) */}
          <section className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold tracking-tight italic text-white flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-amber-500" /> Tournament Standings
            </h2>
            <div className="border border-zinc-800 bg-zinc-950 p-1 lg:p-6 shadow-2xl">
              <TournamentStandings tournamentId={id!} />
            </div>
          </section>
        </div>

        {/* Section 4: Official Team Rosters */}
        <section className="mt-20">
          <h2 className="text-2xl font-black tracking-tight italic text-white flex items-center gap-3 mb-8 border-b border-zinc-900 pb-4">
            <div className="w-3 h-3 bg-amber-500 rotate-45" /> Official Team
            Rosters
          </h2>

          {rosters.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 bg-zinc-950/50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                No official rosters registered for this tournament yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {Object.entries(
                rosters.reduce((acc: any, r: any) => {
                  const teamId = r.team_id;
                  if (!acc[teamId]) {
                    acc[teamId] = {
                      teamName: r.teams?.name || "Unknown Team",
                      players: [],
                    };
                  }
                  acc[teamId].players.push(r);
                  return acc;
                }, {}),
              ).map(([teamId, data]: [string, any]) => (
                <div
                  key={teamId}
                  className="bg-zinc-950 border border-zinc-900 overflow-hidden flex flex-col group hover:border-amber-500/30 transition-colors"
                >
                  <div className="bg-zinc-900/50 border-b border-zinc-900 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-black text-white italic truncate pr-4 group-hover:text-amber-500 transition-colors">
                      {data.teamName}
                    </h3>
                    <span className="text-[10px] font-mono text-amber-500 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-sm shrink-0">
                      {data.players.length} / 12
                    </span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="space-y-3">
                      {data.players
                        .sort((a: any, b: any) =>
                          (a.players?.name || "").localeCompare(
                            b.players?.name || "",
                          ),
                        )
                        .map((r: any, idx: number) => (
                          <div
                            key={r.player_id}
                            className="flex justify-between items-center border-b border-zinc-900/50 pb-3 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-zinc-600 bg-zinc-900 w-5 h-5 flex items-center justify-center rounded-sm">
                                {idx + 1}
                              </span>
                              <Link
                                to={`/players/${r.player_id}`}
                                className="text-sm font-bold text-zinc-300 hover:text-white transition-colors truncate max-w-[140px] sm:max-w-[200px]"
                              >
                                {r.players?.name || "Unknown Player"}
                              </Link>
                            </div>
                            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold shrink-0">
                              {r.players?.role || "Player"}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
