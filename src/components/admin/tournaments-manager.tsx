import React from "react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  Edit2,
  Trash2,
  Plus,
  X,
  AlignEndHorizontal,
  Lock,
} from "lucide-react";
import { TournamentStandings } from "@/components/standings/tournament-standings";

import { ImageUpload } from "@/components/ui/image-upload";

type Tournament = {
  id: number | string;
  name: string;
  division: string;
  phase: string;
  show_champion_banner: boolean;
  is_current_champion?: boolean;
  banner_url?: string;
};

export function TournamentsManager({
  filterDivision,
}: {
  filterDivision?: string;
}) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<
    number | string | null
  >(null);
  const [expandedStandingsId, setExpandedStandingsId] = useState<
    number | string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordOverrideTarget, setPasswordOverrideTarget] =
    useState<Tournament | null>(null);
  const [overridePassword, setOverridePassword] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    division: "Division 1",
    phase: "upcoming",
    show_champion_banner: false,
    is_current_champion: false,
    banner_url: "",
  });

  // Set default division in form based on active tab
  useEffect(() => {
    if (filterDivision) {
      setFormData((prev) => ({ ...prev, division: filterDivision }));
    }
  }, [filterDivision]);

  const loadTournaments = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setTournaments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  const handleOpenModal = (t?: Tournament) => {
    if (t) {
      setEditingId(t.id);
      setFormData({
        name: t.name || "",
        division: t.division || "Division 1",
        phase: t.phase || "upcoming",
        show_champion_banner: t.show_champion_banner || false,
        is_current_champion: t.is_current_champion || false,
        banner_url: t.banner_url || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        division: filterDivision || "Division 1",
        phase: "upcoming",
        show_champion_banner: false,
        is_current_champion: false,
        banner_url: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (formData.is_current_champion) {
        // Unset previous champion in the same division
        await supabase
          .from("tournaments")
          .update({ is_current_champion: false })
          .eq("division", formData.division);
      }

      if (editingId) {
        const { error: updateErr } = await supabase
          .from("tournaments")
          .update(formData)
          .eq("id", editingId);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("tournaments")
          .insert([formData]);

        if (insertErr) throw insertErr;
      }
      handleCloseModal();
      await loadTournaments();
    } catch (err: any) {
      setError(err.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    setError(null);
    const { error: delErr } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id);

    if (delErr) {
      setError(delErr.message);
    } else {
      setConfirmDeleteId(null);
      await loadTournaments();
    }
  };

  const handleVerifyOverride = async (e: any) => {
    e.preventDefault();
    setOverrideError(null);
    setIsVerifying(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("No active user found");

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: overridePassword,
      });

      if (authErr) throw authErr;

      if (passwordOverrideTarget) {
        handleOpenModal(passwordOverrideTarget);
      }
      setPasswordOverrideTarget(null);
      setOverridePassword("");
    } catch (err: any) {
      setOverrideError("Invalid authorization key");
    } finally {
      setIsVerifying(false);
    }
  };

  const displayedTournaments = filterDivision
    ? tournaments.filter((t) => t.division === filterDivision)
    : tournaments;

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-4 md:p-8 flex flex-col relative w-full overflow-hidden">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
            <Trophy className="h-5 w-5 md:h-6 md:w-6 text-amber-500" /> Event Manager
          </h2>
          <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">
            Configured Tournaments
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="text-xs w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" /> New Setup
        </Button>
      </div>

      {error && !isModalOpen && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-4 font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
        </div>
      ) : displayedTournaments.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800">
          <p className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
            No events discovered in network
          </p>
          <Button onClick={() => handleOpenModal()} variant="outline" size="sm">
            Initialize First Event
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedTournaments.map((t) => (
            <div
              key={t.id}
              className="flex flex-col border border-zinc-900 transition-colors group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between py-4 px-4 hover:bg-zinc-900/40 cursor-default gap-4 md:gap-3">
                <div className="w-full md:w-auto overflow-hidden">
                  <p className="text-[10px] text-amber-500 font-bold tracking-widest uppercase mb-1">
                    [{t.phase}] {t.division && `- ${t.division}`}
                  </p>
                  <h3 className="text-base md:text-lg font-medium text-white flex flex-wrap items-center gap-2 md:gap-3">
                    <span className="truncate">{t.name}</span>
                    {t.show_champion_banner && (
                      <span className="text-[8px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-zinc-700 shrink-0">
                        Banner
                      </span>
                    )}
                    {t.is_current_champion && (
                      <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-sm uppercase tracking-widest border border-amber-500/30 shrink-0">
                        Current
                      </span>
                    )}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  {t.phase === "completed" ? (
                    <div className="flex items-center gap-2 group w-full md:w-auto">
                      <Button
                        variant={
                          expandedStandingsId === t.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setExpandedStandingsId(
                            expandedStandingsId === t.id ? null : t.id,
                          )
                        }
                        className={`flex-1 md:flex-none h-8 px-2 md:px-3 text-[10px] md:text-xs uppercase tracking-widest font-bold ${expandedStandingsId === t.id ? "bg-amber-500 text-black hover:bg-amber-600" : "border-amber-500/20 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/50"}`}
                      >
                        <AlignEndHorizontal className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        {expandedStandingsId === t.id ? "Close" : "Standings"}
                      </Button>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 md:px-3 py-1.5 border border-zinc-800 bg-zinc-900 ml-1">
                        Done
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPasswordOverrideTarget(t)}
                        className="h-8 w-8 p-0 text-zinc-600 hover:text-amber-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        title="Unlock completed tournament"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Button
                        variant={
                          expandedStandingsId === t.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setExpandedStandingsId(
                            expandedStandingsId === t.id ? null : t.id,
                          )
                        }
                        className={`flex-1 md:flex-none h-8 px-2 md:px-3 text-[10px] md:text-xs uppercase tracking-widest font-bold ${expandedStandingsId === t.id ? "bg-amber-500 text-black hover:bg-amber-600" : "border-amber-500/20 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/50"}`}
                      >
                        <AlignEndHorizontal className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        {expandedStandingsId === t.id ? "Close" : "Standings"}
                      </Button>
                      <div className="flex items-center gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(t)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-amber-500"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {confirmDeleteId === t.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(t.id)}
                            className="h-8 px-2 text-[10px] text-white bg-red-500 hover:bg-red-600 font-bold"
                          >
                            Yes
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDeleteId(t.id)}
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {expandedStandingsId === t.id && (
                <div className="border-t border-zinc-900 bg-black/40 p-4 md:p-6 shadow-inner overflow-x-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] md:text-sm font-bold text-white uppercase tracking-widest">
                      Admin Standings
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-zinc-500 hover:text-white"
                      onClick={() => setExpandedStandingsId(null)}
                    >
                      Close
                    </Button>
                  </div>
                  <div className="min-w-[600px]">
                    <TournamentStandings tournamentId={t.id} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {passwordOverrideTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md p-6 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-zinc-500 hover:text-white"
              onClick={() => {
                setPasswordOverrideTarget(null);
                setOverridePassword("");
                setOverrideError(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="mb-6">
              <h3 className="text-xl font-bold tracking-tight italic text-amber-500 flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5" /> Override Protection
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed uppercase tracking-widest font-bold">
                The tournament "{passwordOverrideTarget.name}" is completed.
                Provide master password to unlock integrity protections.
              </p>
            </div>

            <form onSubmit={handleVerifyOverride} className="space-y-4">
              {overrideError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-3 font-bold uppercase tracking-widest text-center">
                  {overrideError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                  Authorization Key
                </label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="bg-black border-zinc-800 focus-visible:ring-amber-500 tracking-widest text-center"
                  value={overridePassword}
                  onChange={(e) => setOverridePassword(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setPasswordOverrideTarget(null);
                    setOverridePassword("");
                    setOverrideError(null);
                  }}
                  className="text-xs uppercase tracking-widest font-bold"
                >
                  Abort
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifying}
                  className="bg-amber-500 text-black hover:bg-amber-600 text-xs uppercase tracking-widest font-bold"
                >
                  {isVerifying ? "Verifying..." : "Unlock Editor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          ></div>
          <div className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 ring-4 ring-zinc-950/50">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1">
                  Database Op
                </p>
                <h3 className="text-2xl font-bold tracking-tight italic text-white">
                  {editingId ? "Modify Event" : "Create Event"}
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

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                  Event Name Designation
                </label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g. Nordic Winter Invitational"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                  Division Class
                </label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-amber-500/50 text-white transition-colors"
                  value={formData.division}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, division: e.target.value }))
                  }
                >
                  <option value="Division 1">Division 1</option>
                  <option value="Division 2">Division 2</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                  Current Phase
                </label>
                <select
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-amber-500/50 text-white transition-colors"
                  value={formData.phase}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, phase: e.target.value }))
                  }
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="round-robin">Round Robin</option>
                  <option value="knockout">Knockout</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">
                  Tournament Banner Background
                </label>
                <ImageUpload
                  bucket="tournament-banners"
                  value={formData.banner_url}
                  onChange={(url) =>
                    setFormData((p) => ({ ...p, banner_url: url }))
                  }
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="show_champion_banner"
                    checked={formData.show_champion_banner}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        show_champion_banner: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded-sm border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-950"
                  />
                  <label
                    htmlFor="show_champion_banner"
                    className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold cursor-pointer"
                  >
                    Activate Champion Banner Protocol
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_current_champion"
                    checked={formData.is_current_champion}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        is_current_champion: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded-sm border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-950"
                  />
                  <label
                    htmlFor="is_current_champion"
                    className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold cursor-pointer"
                  >
                    Set as Current {formData.division} Champion
                  </label>
                </div>
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
                  className="flex-1"
                >
                  {isSubmitting
                    ? "Transmitting..."
                    : editingId
                      ? "Commit Alteration"
                      : "Deploy Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
