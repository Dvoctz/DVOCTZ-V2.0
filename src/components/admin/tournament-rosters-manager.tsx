import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2, AlertTriangle } from "lucide-react";

type Tournament = {
  id: number | string;
  name: string;
  division: string;
};

type Team = {
  id: number | string;
  name: string;
  division: string;
  club_id?: number | string | null;
};

type Player = {
  id: number | string;
  name: string;
  role: string;
  team_id: number | string | null;
  club_id?: number | string | null;
  division?: string;
  team_name?: string;
};

type TournamentTeam = {
  tournament_id: number | string;
  team_id: number | string;
};

type TournamentRoster = {
  id?: number | string;
  tournament_id: number | string;
  team_id: number | string;
  player_id: number | string;
  players?: { name: string; role: string };
};

export function TournamentRostersManager({
  filterDivision,
}: {
  filterDivision?: string;
}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rosters, setRosters] = useState<TournamentRoster[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [tournamentsRes, teamsRes, ttRes, playersRes, rostersRes] =
        await Promise.all([
          supabase
            .from("tournaments")
            .select("id, name, division")
            .order("name", { ascending: true }),
          supabase
            .from("teams")
            .select("id, name, division, club_id")
            .order("name", { ascending: true }),
          supabase.from("tournament_teams").select("tournament_id, team_id"),
          supabase
            .from("players")
            .select("id, name, role, team_id, club_id, teams(name, division)")
            .order("name", { ascending: true }),
          supabase
            .from("tournament_rosters")
            .select(
              "id, tournament_id, team_id, player_id, players(name, role)",
            ),
        ]);

      if (tournamentsRes.error) throw tournamentsRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (ttRes.error) throw ttRes.error;
      if (playersRes.error) throw playersRes.error;
      if (rostersRes.error) throw rostersRes.error;

      setTournaments(tournamentsRes.data || []);
      setTeams(teamsRes.data || []);
      setTournamentTeams(ttRes.data || []);

      const formattedPlayers = (playersRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        team_id: p.team_id,
        club_id: p.club_id,
        division: p.teams?.division,
        team_name: p.teams?.name,
      }));
      setPlayers(formattedPlayers);

      setRosters(rostersRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const displayedTournaments = filterDivision
    ? tournaments.filter((t) => t.division === filterDivision)
    : tournaments;

  useEffect(() => {
    if (
      displayedTournaments.length > 0 &&
      !displayedTournaments.some((t) => t.id.toString() === selectedTournament)
    ) {
      setSelectedTournament(displayedTournaments[0].id.toString());
      setSelectedTeam("");
    } else if (displayedTournaments.length === 0) {
      setSelectedTournament("");
      setSelectedTeam("");
    }
  }, [displayedTournaments, selectedTournament]);

  useEffect(() => {
    loadData();
  }, []);

  const enrolledTeamsForSelectedTournament = teams.filter((t) =>
    tournamentTeams.some(
      (tt) =>
        tt.tournament_id.toString() === selectedTournament &&
        tt.team_id.toString() === t.id.toString(),
    ),
  );

  useEffect(() => {
    if (
      enrolledTeamsForSelectedTournament.length > 0 &&
      !enrolledTeamsForSelectedTournament.some(
        (t) => t.id.toString() === selectedTeam,
      )
    ) {
      setSelectedTeam(enrolledTeamsForSelectedTournament[0].id.toString());
    } else if (enrolledTeamsForSelectedTournament.length === 0) {
      setSelectedTeam("");
    }
  }, [selectedTournament, enrolledTeamsForSelectedTournament, selectedTeam]);

  const currentRoster = rosters.filter(
    (r) =>
      r.tournament_id.toString() === selectedTournament &&
      r.team_id.toString() === selectedTeam,
  );

  const selectedTournamentObj = tournaments.find(
    (t) => t.id.toString() === selectedTournament,
  );

  const currentTournamentDivision = selectedTournamentObj?.division;

  // Calculate crossovers for the current roster
  let div1InDiv2Count = 0;
  for (const r of currentRoster) {
    const playerRecord = players.find(
      (p) => p.id.toString() === r.player_id.toString(),
    );
    if (
      playerRecord?.division === "Division 1" &&
      currentTournamentDivision === "Division 2"
    ) {
      div1InDiv2Count++;
    }
  }

  const handleAddPlayer = async (e: any) => {
    e.preventDefault();

    if (!selectedTournament || !selectedTeam || !selectedPlayer) {
      setError("Please select tournament, team, and player");
      return;
    }

    if (currentRoster.length >= 12) {
      setError("Maximum roster limit reached (12 players). Cannot add more.");
      return;
    }

    const player = players.find((p) => p.id.toString() === selectedPlayer);
    if (!player) return;

    if (
      player.division === "Division 1" &&
      currentTournamentDivision === "Division 2"
    ) {
      if (div1InDiv2Count >= 2) {
        setError(
          "Cross-division Eligibility Rule Violation: Division 2 rosters can have a maximum of 2 Division 1 players.",
        );
        return;
      }
    }

    const exists = currentRoster.some(
      (r) => r.player_id.toString() === selectedPlayer,
    );
    if (exists) {
      setError("Player is already in this roster");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertErr } = await supabase
        .from("tournament_rosters")
        .insert([
          {
            tournament_id: parseInt(selectedTournament),
            team_id: parseInt(selectedTeam),
            player_id: parseInt(selectedPlayer),
          },
        ]);

      if (insertErr) throw insertErr;

      setSelectedPlayer("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to add player");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePlayer = async (rosterRecordOrId: any) => {
    setError(null);
    try {
      let query = supabase.from("tournament_rosters").delete();

      if (rosterRecordOrId.id) {
        query = query.eq("id", rosterRecordOrId.id);
      } else {
        query = query
          .eq("tournament_id", rosterRecordOrId.tournament_id)
          .eq("team_id", rosterRecordOrId.team_id)
          .eq("player_id", rosterRecordOrId.player_id);
      }

      const { error: delErr } = await query;
      if (delErr) throw delErr;
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to remove player");
    }
  };

  const selectedTeamObj = teams.find((t) => t.id.toString() === selectedTeam);

  const availablePlayers = players.filter(
    (p) =>
      (!selectedTeamObj?.club_id ||
        p.club_id?.toString() === selectedTeamObj.club_id?.toString()) &&
      !currentRoster.some((r) => r.player_id.toString() === p.id.toString()),
  );

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-8 flex flex-col relative mt-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
            <Users className="h-6 w-6 text-indigo-500" /> Roster Governance
          </h2>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">
            Official Tournament Registration
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-4 font-bold uppercase tracking-widest flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && tournaments.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                Target Tournament
              </label>
              <select
                className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-indigo-500/50 text-white transition-colors"
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
              >
                <option value="" disabled>
                  Choose a tournament
                </option>
                {displayedTournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.division ? `(${t.division})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                Target Team Roster
              </label>
              <select
                className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-indigo-500/50 text-white transition-colors"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                disabled={!selectedTournament}
              >
                <option value="" disabled>
                  {enrolledTeamsForSelectedTournament.length > 0
                    ? "Select an enrolled team"
                    : "No teams enrolled"}
                </option>
                {enrolledTeamsForSelectedTournament.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTournament && selectedTeam && (
            <div className="mt-8 border-t border-zinc-900 pt-8">
              <div className="flex flex-col lg:flex-row justify-between gap-6 mb-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold italic text-white flex items-center gap-3">
                    Active Roster{" "}
                    <span className="text-xs font-mono px-2 py-0.5 bg-zinc-900 text-indigo-400 rounded-sm">
                      {" "}
                      {currentRoster.length} / 12
                    </span>
                  </h3>
                  {currentTournamentDivision === "Division 2" &&
                    div1InDiv2Count > 0 && (
                      <p className="text-[10px] uppercase tracking-widest font-bold text-amber-500 flex items-center gap-1.5 mt-2">
                        <AlertTriangle className="h-3 w-3" />
                        Cross-Division Quota: {div1InDiv2Count}/2 Division 1
                        players used
                      </p>
                    )}
                </div>

                <form
                  onSubmit={handleAddPlayer}
                  className="flex gap-4 items-end bg-zinc-900/30 p-4 border border-zinc-900 w-full lg:w-1/2 shrink-0"
                >
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                      Register Player
                    </label>
                    <select
                      className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-indigo-500/50 text-white transition-colors"
                      value={selectedPlayer}
                      onChange={(e) => setSelectedPlayer(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Select player...
                      </option>
                      {availablePlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.team_name ? `— ${p.team_name}` : ""}{" "}
                          {p.division ? `(${p.division})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !selectedPlayer ||
                      currentRoster.length >= 12
                    }
                    className="bg-indigo-500 text-black hover:bg-indigo-400 h-[46px] px-6 shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Register
                  </Button>
                </form>
              </div>

              {currentRoster.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">
                    Roster is empty
                    <br />
                    Register official athletes above
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {currentRoster.map((r, i) => {
                    const playerDetails =
                      r.players ||
                      players.find(
                        (p) => p.id.toString() === r.player_id.toString(),
                      );
                    const playerRecord = players.find(
                      (p) => p.id.toString() === r.player_id.toString(),
                    );
                    const isDiv1InDiv2 =
                      currentTournamentDivision === "Division 2" &&
                      playerRecord?.division === "Division 1";

                    return (
                      <div
                        key={
                          r.id ||
                          `${r.tournament_id}-${r.team_id}-${r.player_id}`
                        }
                        className={`flex items-center justify-between p-3 border ${isDiv1InDiv2 ? "border-amber-500/20 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/50"} group`}
                      >
                        <div className="flex gap-4 items-center">
                          <div
                            className={`w-6 h-6 flex items-center justify-center rounded-sm text-[9px] font-bold ${isDiv1InDiv2 ? "text-amber-500 bg-amber-500/10" : "text-zinc-500 bg-zinc-900"}`}
                          >
                            #{i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white flex items-center gap-2">
                              {playerDetails?.name || "Unknown Player"}
                              {isDiv1InDiv2 && (
                                <span
                                  className="text-[8px] uppercase tracking-widest text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded-sm border border-amber-500/20"
                                  title="Cross-Division Player"
                                >
                                  Div 1
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-zinc-500 tracking-widest uppercase mt-0.5">
                              {playerDetails?.role || "Unknown"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePlayer(r)}
                          className="h-8 px-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          title="Remove from roster"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
