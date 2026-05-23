import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import {
  UserSquare2,
  Trophy,
  Flag,
  CalendarDays,
  Activity,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type PlayerProfile = {
  id: number;
  name: string;
  photo_url: string;
  role: string;
  created_at: string;
  teams?: { id: number; name: string; logo_url?: string };
  clubs?: { id: number; name: string };
};

type Fixture = {
  id: number;
  tournament_id: number;
  team1_id: number;
  team2_id: number;
  winner_team_id: number | null;
  status: string;
  score: any;
  tournaments: { id: number; name: string };
};

export default function PlayerProfilePage() {
  const { id } = useParams();
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    tournamentsPlayed: 0,
    motm: 0,
  });

  const [transfers, setTransfers] = useState<any[]>([]);
  const [eras, setEras] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);

      const { data: playerData, error } = await supabase
        .from("players")
        .select(
          `
          *,
          teams (id, name, logo_url),
          clubs (id, name)
        `,
        )
        .eq("id", id)
        .single();

      if (playerData) {
        setPlayer(playerData);

        const { data: transfersData } = await supabase
          .from("player_transfers")
          .select(
            `
            id, transfer_date, notes,
            from_team_id, to_team_id,
            from_team:teams!from_team_id(id, name),
            to_team:teams!to_team_id(id, name)
          `,
          )
          .eq("player_id", id)
          .order("transfer_date", { ascending: true }); // Need ASC to trace chronological eras

        const sortedTransfers = transfersData || [];
        setTransfers([...sortedTransfers].reverse()); // Reverse for transfer history UI (newest first)

        // Build Eras Timeline
        const calculatedEras: any[] = [];
        let currentStartDate =
          (playerData as any).joined_at || playerData.created_at;

        let currentTeamId =
          sortedTransfers.length > 0
            ? sortedTransfers[0].from_team_id
            : playerData.teams?.id;
        let currentTeamName =
          sortedTransfers.length > 0
            ? Array.isArray(sortedTransfers[0].from_team)
              ? (sortedTransfers[0].from_team[0] as any)?.name
              : (sortedTransfers[0].from_team as any)?.name
            : playerData.teams?.name;

        for (const tx of sortedTransfers) {
          calculatedEras.push({
            teamId: currentTeamId,
            teamName: currentTeamName,
            startDate: currentStartDate,
            endDate: tx.transfer_date,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            motm: 0,
          });
          currentStartDate = tx.transfer_date;
          currentTeamId = tx.to_team_id;
          currentTeamName = Array.isArray(tx.to_team)
            ? (tx.to_team[0] as any)?.name
            : (tx.to_team as any)?.name;
        }

        calculatedEras.push({
          teamId: currentTeamId,
          teamName: currentTeamName,
          startDate: currentStartDate,
          endDate: null,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          motm: 0,
        });

        // Use tournament_rosters to pinpoint exactly which team the player represented in which match
        const { data: rosters } = await supabase
          .from("tournament_rosters")
          .select("tournament_id, team_id")
          .eq("player_id", id);

        let tPlayed = 0;
        let totalMatches = 0;
        let totalWins = 0;
        let totalLosses = 0;
        let totalMotm = 0;

        if (rosters && rosters.length > 0) {
          const uniqueTournamentIds = Array.from(
            new Set(rosters.map((r) => r.tournament_id)),
          );
          tPlayed = uniqueTournamentIds.length;

          // Process matches dynamically
          const { data: fixturesData } = await supabase
            .from("fixtures")
            .select(
              `
              id, tournament_id, team1_id, team2_id, winner_team_id, man_of_the_match_id, score, date_time, status
            `,
            )
            .in("tournament_id", uniqueTournamentIds)
            .eq("status", "completed");

          if (fixturesData && fixturesData.length > 0) {
            fixturesData.forEach((f) => {
              // Find which team the player was representing in this specific tournament
              const rosterRec = rosters.find(
                (r) =>
                  r.tournament_id === f.tournament_id &&
                  (r.team_id === f.team1_id || r.team_id === f.team2_id),
              );

              if (!rosterRec) return; // Player was not playing in this specific match

              const myTeamId = rosterRec.team_id;

              const fDate = new Date(f.date_time).getTime();
              // Assign fixture to the corresponding era
              let era = calculatedEras.find((e) => {
                if (e.teamId !== myTeamId) return false;
                const eStart = new Date(e.startDate).getTime();
                const eEnd = e.endDate
                  ? new Date(e.endDate).getTime()
                  : Infinity;
                return fDate >= eStart && fDate <= eEnd;
              });

              // Fallback to strict team match if timezone offsets push date edges slightly out of transfer bound
              if (!era) {
                era = calculatedEras.find((e) => e.teamId === myTeamId);
              }

              if (!era) return;

              let isWin = false;
              let isLoss = false;

              if (f.winner_team_id) {
                if (f.winner_team_id === myTeamId) isWin = true;
                else isLoss = true;
              } else {
                const s1 = f.score?.team1Score || 0;
                const s2 = f.score?.team2Score || 0;
                if (f.team1_id === myTeamId) {
                  if (s1 > s2) isWin = true;
                  else if (s2 > s1) isLoss = true;
                } else if (f.team2_id === myTeamId) {
                  if (s2 > s1) isWin = true;
                  else if (s1 > s2) isLoss = true;
                }
              }

              const isMotm =
                f.man_of_the_match_id?.toString() === id.toString();

              era.matchesPlayed++;
              if (isWin) era.wins++;
              if (isLoss) era.losses++;
              if (isMotm) era.motm++;

              totalMatches++;
              if (isWin) totalWins++;
              if (isLoss) totalLosses++;
              if (isMotm) totalMotm++;
            });
          }
        }

        setStats({
          matchesPlayed: totalMatches,
          wins: totalWins,
          losses: totalLosses,
          tournamentsPlayed: tPlayed,
          motm: totalMotm,
        });

        // Remove unnamed free agent eras from presentation
        setEras(calculatedEras.filter((e) => e.teamId !== null));
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <UserSquare2 className="w-16 h-16 text-zinc-800 mb-6" />
        <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">
          Player Not Found
        </h2>
        <p className="text-zinc-500 mb-8 max-w-md">
          The requested player profile could not be located in our database.
        </p>
        <Link to="/">
          <Button
            variant="outline"
            className="border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black"
          >
            Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto pb-20 mt-8 px-4 md:px-0">
      <Link
        to="/"
        className="inline-flex items-center text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-amber-500 mb-8 transition-colors"
      >
        ← Back to Home
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-950 border border-zinc-900 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-black/80 pointer-events-none" />

            <div className="aspect-square bg-zinc-900 relative">
              {player.photo_url ? (
                <img
                  src={player.photo_url}
                  alt={player.name}
                  className="w-full h-full object-cover relative z-10"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center relative z-10">
                  <UserSquare2 className="w-24 h-24 text-zinc-800" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-zinc-950 to-transparent z-20" />

              <div className="absolute bottom-4 left-4 z-30">
                <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1 shadow-black drop-shadow-md">
                  {player.role}
                </p>
                <h1 className="text-3xl font-black italic text-white drop-shadow-md leading-none">
                  {player.name}
                </h1>
              </div>
            </div>

            <div className="p-6 relative z-30">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <Flag className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">
                      Current Team
                    </p>
                    <p className="text-sm font-semibold text-white">
                      {player.teams?.name || "Free Agent"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">
                      Club Affiliation
                    </p>
                    {player.clubs ? (
                      <Link to={`/club/${player.clubs.id}`} className="text-sm font-semibold text-white hover:text-amber-500 transition-colors">
                        {player.clubs.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-white">Unaffiliated</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">
                      Registered Since
                    </p>
                    <p className="text-sm font-semibold text-zinc-300">
                      {(() => {
                        const dateStr =
                          (player as any).joined_at || player.created_at;
                        if (!dateStr || isNaN(Date.parse(dateStr)))
                          return "DVOC Registered Player";
                        return new Date(dateStr).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Data */}
        <div className="md:col-span-2 space-y-8">
          <div>
            <h3 className="text-xs font-black tracking-widest text-white uppercase flex items-center gap-2 mb-6 border-b border-zinc-900 pb-3">
              <Activity className="w-4 h-4 text-amber-500" /> Career Statistics
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 border border-zinc-900 p-6 text-center group hover:border-amber-500/50 transition-colors">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">
                  Matches
                </p>
                <p className="text-4xl font-black italic text-white group-hover:text-amber-500 transition-colors">
                  {stats.matchesPlayed}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 p-6 text-center group hover:border-emerald-500/50 transition-colors">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">
                  Wins
                </p>
                <p className="text-4xl font-black italic text-white group-hover:text-emerald-500 transition-colors">
                  {stats.wins}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 p-6 text-center group hover:border-red-500/50 transition-colors">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">
                  Losses
                </p>
                <p className="text-4xl font-black italic text-white group-hover:text-red-500 transition-colors">
                  {stats.losses}
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 p-6 text-center group hover:border-amber-500/50 transition-colors">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 truncate">
                  Man of the Match
                </p>
                <p className="text-4xl font-black italic text-white group-hover:text-amber-500 transition-colors">
                  {stats.motm}
                </p>
              </div>
            </div>

            <div className="mt-4 flex">
              <div
                className="h-2 bg-emerald-500"
                style={{
                  width: `${stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0}%`,
                }}
              />
              <div
                className="h-2 bg-red-500"
                style={{
                  width: `${stats.matchesPlayed > 0 ? (stats.losses / stats.matchesPlayed) * 100 : 0}%`,
                }}
              />
              <div
                className="h-2 bg-zinc-800"
                style={{
                  width: `${stats.matchesPlayed > 0 ? ((stats.matchesPlayed - stats.wins - stats.losses) / stats.matchesPlayed) * 100 : 100}%`,
                }}
              />
            </div>
            <div className="mt-2 flex justify-between items-center text-right">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                {stats.tournamentsPlayed} Tournaments Played
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                WIN RATE:{" "}
                {(stats.matchesPlayed > 0
                  ? (stats.wins / stats.matchesPlayed) * 100
                  : 0
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-xs font-black tracking-widest text-white uppercase flex items-center gap-2 mb-6 border-b border-zinc-900 pb-3">
              <Activity className="w-4 h-4 text-emerald-500" /> Career Eras
            </h3>

            {eras.length === 0 ? (
              <div className="bg-zinc-950/50 border border-dashed border-zinc-900 p-8 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                No career eras recorded
              </div>
            ) : (
              <div className="space-y-4">
                {eras.map((era, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col sm:flex-row justify-between gap-6 hover:border-amber-500/30 transition-colors group"
                  >
                    <div className="space-y-1">
                      <h4 className="text-lg font-black italic uppercase text-white group-hover:text-amber-500 transition-colors">
                        {era.teamName || "Unknown Team"} Era
                      </h4>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                        {era.startDate
                          ? new Date(era.startDate).getFullYear()
                          : "Unknown"}{" "}
                        &rarr;{" "}
                        {era.endDate
                          ? new Date(era.endDate).getFullYear()
                          : "Present"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-6 sm:gap-8 justify-start sm:justify-end">
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
                          Matches
                        </p>
                        <p className="text-xl font-black text-white">
                          {era.matchesPlayed}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
                          Wins
                        </p>
                        <p className="text-xl font-black text-emerald-500">
                          {era.wins}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">
                          MOTM
                        </p>
                        <p className="text-xl font-black text-amber-500">
                          {era.motm}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-12">
            <h3 className="text-xs font-black tracking-widest text-white uppercase flex items-center gap-2 mb-6 border-b border-zinc-900 pb-3">
              <ArrowRightLeft className="w-4 h-4 text-emerald-500" /> Transfer
              History
            </h3>

            {transfers.length === 0 ? (
              <div className="bg-zinc-950/50 border border-dashed border-zinc-900 p-8 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                No transfer history
              </div>
            ) : (
              <div className="space-y-4">
                {transfers.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="bg-zinc-950 border border-zinc-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mb-1">
                          From
                        </span>
                        <span className="text-sm text-zinc-400 font-medium">
                          {Array.isArray(tx.from_team)
                            ? tx.from_team[0]?.name || "Free Agent"
                            : tx.from_team?.name || "Free Agent"}
                        </span>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-none mb-1">
                          To
                        </span>
                        <span className="text-sm text-white font-medium">
                          {Array.isArray(tx.to_team)
                            ? tx.to_team[0]?.name || "Free Agent"
                            : tx.to_team?.name || "Free Agent"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end">
                      <span className="text-sm font-semibold text-zinc-300">
                        {tx.transfer_date
                          ? new Date(tx.transfer_date).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )
                          : "Unknown Date"}
                      </span>
                      {tx.notes && (
                        <span className="text-xs text-zinc-500 mt-1">
                          {tx.notes}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
