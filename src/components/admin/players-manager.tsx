import React from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserSquare2,
  Edit2,
  Trash2,
  Plus,
  X,
  TriangleAlert,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

type Player = {
  id: number | string;
  name: string;
  photo_url: string;
  role: string;
  team_id: number | string | null;
  club_id: number | string | null;
  joined_at?: string;
  created_at?: string;
  teams?: { name: string };
  clubs?: { name: string };
  player_transfers?: any[];
};

type Team = {
  id: number | string;
  name: string;
  club_id?: number | string | null;
};

type Club = {
  id: number | string;
  name: string;
};

const PLAYER_ROLES = [
  "Main Netty",
  "Left Front",
  "Right Front",
  "Net Center",
  "Back Center",
  "Left Back",
  "Right Back",
  "Right Netty",
  "Left Netty",
  "Service Man",
];

export function PlayersManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<
    number | string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transfer Warning / Override State
  const [transferWarning, setTransferWarning] = useState<string | null>(null);
  const [warningRemaining, setWarningRemaining] = useState<string | null>(null);
  const [pendingTransferData, setPendingTransferData] = useState<any | null>(
    null,
  );

  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [clubFilter, setClubFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    photo_url: "",
    role: PLAYER_ROLES[0],
    team_id: "",
    club_id: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [playersRes, teamsRes, clubsRes] = await Promise.all([
        supabase
          .from("players")
          .select(
            "*, teams(name), clubs(name), player_transfers(transfer_date, from_team:teams!from_team_id(name), to_team:teams!to_team_id(name))",
          )
          .order("name", { ascending: true }),
        supabase
          .from("teams")
          .select("id, name, club_id")
          .order("name", { ascending: true }),
        supabase
          .from("clubs")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      if (playersRes.error) throw playersRes.error;
      if (teamsRes.error) throw teamsRes.error;
      if (clubsRes.error) throw clubsRes.error;

      setPlayers(playersRes.data || []);
      setTeams(teamsRes.data || []);
      setClubs(clubsRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (p?: Player) => {
    if (p) {
      setEditingId(p.id);
      setFormData({
        name: p.name || "",
        photo_url: p.photo_url || "",
        role: p.role || PLAYER_ROLES[0],
        team_id: p.team_id?.toString() || "",
        club_id: p.club_id?.toString() || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        photo_url: "",
        role: PLAYER_ROLES[0],
        team_id: "",
        club_id: clubs.length > 0 ? clubs[0].id.toString() : "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setTransferWarning(null);
    setWarningRemaining(null);
    setPendingTransferData(null);
  };

  const executeTransfer = async (
    playerId: any,
    data: any,
    fromTeamId: any,
    toTeamId: any,
  ) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from("players")
        .update(data)
        .eq("id", playerId);

      if (updateErr) throw updateErr;

      const { error: txErr } = await supabase.from("player_transfers").insert([
        {
          player_id: playerId,
          from_team_id: fromTeamId,
          to_team_id: toTeamId,
          transfer_date: new Date().toISOString(),
          notes: "Admin transfer",
        },
      ]);

      if (txErr) console.warn("Could not record transfer history:", txErr);

      setTransferWarning(null);
      setWarningRemaining(null);
      setPendingTransferData(null);
      handleCloseModal();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const submissionData = {
      name: formData.name,
      photo_url: formData.photo_url,
      role: formData.role,
      team_id: formData.team_id ? parseInt(formData.team_id) : null,
      club_id: formData.club_id ? parseInt(formData.club_id) : null,
    };

    try {
      if (editingId) {
        const originalPlayer = players.find((p) => p.id === editingId);
        const teamChanged =
          originalPlayer &&
          (originalPlayer.team_id || null) !== (submissionData.team_id || null);

        if (teamChanged) {
          const { data: latestTransferList } = await supabase
            .from("player_transfers")
            .select("*")
            .eq("player_id", editingId)
            .order("transfer_date", { ascending: false })
            .limit(1);

          const latestTransfer = latestTransferList?.[0];

          let violation = null;
          let remaining = null;

          const now = new Date();

          if (!latestTransfer) {
            const joinedAtStr =
              originalPlayer?.joined_at || originalPlayer?.created_at;
            const joinedAtDate = joinedAtStr ? new Date(joinedAtStr) : now;
            const sixMonthsLater = new Date(joinedAtDate);
            sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

            if (now < sixMonthsLater) {
              violation =
                "First Transfer Rule: A player's first transfer is only allowed after 6 months from initial registration.";
              const diffMs = sixMonthsLater.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              remaining = `${diffDays} days remaining until eligible`;
            }
          } else {
            const transferDate = new Date(latestTransfer.transfer_date);
            const oneYearLater = new Date(transferDate);
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

            if (now < oneYearLater) {
              const diffMs = oneYearLater.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              remaining = `${diffDays} days remaining until eligible`;

              if (latestTransfer.to_team_id === null) {
                violation =
                  "Free Agent Rule: A released Free Agent cannot join another team for 1 year after their release date.";
              } else {
                violation =
                  "Transfer Rule: Player must remain with current team for 1 year before another transfer.";
              }
            }
          }

          if (violation) {
            setTransferWarning(violation);
            setWarningRemaining(remaining);
            setPendingTransferData({
              id: editingId,
              submissionData,
              fromTeamId: originalPlayer?.team_id || null,
              toTeamId: submissionData.team_id || null,
            });
            setIsSubmitting(false);
            return;
          }

          await executeTransfer(
            editingId,
            submissionData,
            originalPlayer?.team_id || null,
            submissionData.team_id || null,
          );
        } else {
          const { error: updateErr } = await supabase
            .from("players")
            .update(submissionData)
            .eq("id", editingId);

          if (updateErr) throw updateErr;
          handleCloseModal();
          await loadData();
        }
      } else {
        const { error: insertErr } = await supabase
          .from("players")
          .insert([submissionData]);

        if (insertErr) throw insertErr;
        handleCloseModal();
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    setError(null);
    const { error: delErr } = await supabase
      .from("players")
      .delete()
      .eq("id", id);

    if (delErr) {
      setError(delErr.message);
    } else {
      setConfirmDeleteId(null);
      await loadData();
    }
  };

  const filteredPlayers = players.filter((p) => {
    if (
      searchQuery &&
      !p.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (clubFilter && p.club_id?.toString() !== clubFilter) return false;
    if (teamFilter && p.team_id?.toString() !== teamFilter) return false;
    return true;
  });

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-8 flex flex-col relative mt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
            <UserSquare2 className="h-6 w-6 text-blue-500" /> Player Directory
          </h2>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">
            Registered Athletes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-48 bg-zinc-900 border-zinc-800 focus:border-blue-500/50"
          />
          <select
            className="w-full md:w-auto bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors h-10 rounded-md"
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
          >
            <option value="">All Clubs</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="w-full md:w-auto bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors h-10 rounded-md"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto text-xs border-blue-500/20 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-black"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Player
          </Button>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-4 font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
            No players match the criteria
          </p>
          {searchQuery || clubFilter || teamFilter ? (
            <Button
              onClick={() => {
                setSearchQuery("");
                setClubFilter("");
                setTeamFilter("");
              }}
              variant="outline"
              size="sm"
              className="border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-black hover:border-blue-500"
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              onClick={() => handleOpenModal()}
              variant="outline"
              size="sm"
              className="border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-black hover:border-blue-500"
            >
              Initialize First Player
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-4 border-b border-zinc-900 hover:bg-zinc-900/40 px-3 transition-colors group cursor-default"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserSquare2 className="w-5 h-5 text-zinc-700" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-blue-500 font-bold tracking-widest uppercase mb-1">
                    {p.role}
                  </p>
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <a
                      href={`/players/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-amber-500 transition-colors"
                    >
                      {p.name}
                    </a>
                  </h3>

                  {(() => {
                    const sortedTransfers = p.player_transfers
                      ? [...p.player_transfers].sort(
                          (a, b) =>
                            new Date(a.transfer_date).getTime() -
                            new Date(b.transfer_date).getTime(),
                        )
                      : [];

                    const getTeamName = (teamObj: any) =>
                      Array.isArray(teamObj) ? teamObj[0]?.name : teamObj?.name;

                    const initialTeamName =
                      sortedTransfers.length > 0
                        ? getTeamName(sortedTransfers[0].from_team) ||
                          "Free Agent"
                        : p.teams?.name || "Free Agent";

                    const pathNodes = [initialTeamName];

                    sortedTransfers.forEach((tx) => {
                      pathNodes.push(getTeamName(tx.to_team) || "Free Agent");
                    });

                    const isFreeAgent = !p.team_id;
                    const currentTeamDisplay = p.teams?.name || "Free Agent";

                    return (
                      <div className="mt-3 flex flex-col gap-2">
                        {p.clubs?.name && (
                          <span className="text-[10px] text-zinc-500 italic font-normal tracking-wide">
                            Club: {p.clubs.name}
                          </span>
                        )}

                        <div className="bg-zinc-950/50 border border-zinc-800/50 p-2.5 rounded-sm mt-1 max-w-xl">
                          <div className="grid grid-cols-3 items-center gap-4 text-[9px] uppercase tracking-widest font-bold">
                            <div className="flex flex-col">
                              <span className="text-zinc-600 mb-1">
                                Initial
                              </span>
                              <span
                                className="text-zinc-500 truncate"
                                title={initialTeamName}
                              >
                                {initialTeamName}
                              </span>
                            </div>

                            <div className="flex flex-col items-center text-center">
                              <span className="text-zinc-600 mb-1">Path</span>
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {pathNodes.map((node, i) => (
                                  <React.Fragment key={i}>
                                    {i > 0 && (
                                      <span className="text-zinc-700">
                                        &rarr;
                                      </span>
                                    )}
                                    <span
                                      className={
                                        i === pathNodes.length - 1
                                          ? node === "Free Agent"
                                            ? "text-amber-500"
                                            : "text-emerald-500"
                                          : i === 0
                                            ? "text-zinc-500"
                                            : "text-zinc-400"
                                      }
                                      title={node}
                                    >
                                      {node === "Free Agent" ? "FA" : node}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
                              <span className="text-zinc-600 mb-1">
                                Current
                              </span>
                              {isFreeAgent ? (
                                <span
                                  className="text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-sm border border-amber-500/20 truncate max-w-full"
                                  title="Free Agent"
                                >
                                  Free Agent
                                </span>
                              ) : (
                                <span
                                  className="text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-sm border border-emerald-500/20 truncate max-w-full"
                                  title={currentTeamDisplay}
                                >
                                  {currentTeamDisplay}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenModal(p)}
                  className="h-8 px-2 text-zinc-400 hover:text-blue-500"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                {confirmDeleteId === p.id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                    className="h-8 px-2 text-white bg-red-500 hover:bg-red-600"
                  >
                    Confirm
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteId(p.id)}
                    className="h-8 px-2 text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          ></div>
          <div className="relative w-full max-w-lg bg-zinc-950 border border-blue-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 ring-4 ring-zinc-950/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mb-1">
                  Database Op
                </p>
                <h3 className="text-2xl font-bold tracking-tight italic text-white">
                  {editingId ? "Modify Player" : "Register Player"}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && isModalOpen && (
              <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-3 font-bold uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            {transferWarning ? (
              <div className="space-y-6">
                <div className="bg-amber-500/10 border border-amber-500/20 p-6 flex flex-col items-center text-center rounded-sm">
                  <TriangleAlert className="w-12 h-12 text-amber-500 mb-4" />
                  <h4 className="text-lg font-bold text-white mb-2 italic tracking-tight">
                    Transfer Rule Violation
                  </h4>
                  <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                    {transferWarning}
                  </p>

                  {warningRemaining && (
                    <div className="bg-black/50 px-4 py-2 border border-zinc-900 rounded-sm">
                      <span className="text-amber-500 font-mono text-xs font-bold uppercase tracking-widest">
                        {warningRemaining}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    onClick={() => {
                      setTransferWarning(null);
                      setWarningRemaining(null);
                      setPendingTransferData(null);
                    }}
                  >
                    Cancel Transfer
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (pendingTransferData) {
                        executeTransfer(
                          pendingTransferData.id,
                          pendingTransferData.submissionData,
                          pendingTransferData.fromTeamId,
                          pendingTransferData.toTeamId,
                        );
                      }
                    }}
                    disabled={isSubmitting}
                    className="flex-1 bg-amber-500 text-black hover:bg-amber-400"
                  >
                    {isSubmitting ? "Processing..." : "Override & Confirm"}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                    Player Name
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g. John Doe"
                    className="focus:border-blue-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                    Role
                  </label>
                  <select
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, role: e.target.value }))
                    }
                  >
                    {PLAYER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                    Club Affiliation
                  </label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors"
                    value={formData.club_id}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, club_id: e.target.value }))
                    }
                  >
                    <option value="">No Club</option>
                    {clubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                    Team Assignment
                  </label>
                  <select
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors"
                    value={formData.team_id}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, team_id: e.target.value }))
                    }
                  >
                    <option value="">No Team</option>
                    {teams
                      .filter(
                        (t) =>
                          !formData.club_id ||
                          t.club_id?.toString() ===
                            formData.club_id?.toString(),
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                    Player Photo
                  </label>
                  <ImageUpload
                    bucket="player-photos"
                    value={formData.photo_url}
                    onChange={(url) =>
                      setFormData((p) => ({ ...p, photo_url: url }))
                    }
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleCloseModal}
                  >
                    Abort
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-500 text-black hover:bg-blue-400"
                  >
                    {isSubmitting
                      ? "Transmitting..."
                      : editingId
                        ? "Commit Alteration"
                        : "Deploy Player"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
