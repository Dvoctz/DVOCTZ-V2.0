import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Trophy, Plus, X, Trash2 } from "lucide-react"

type TournamentTeam = {
  tournament_id: number | string
  team_id: number | string
}

type Tournament = {
  id: number | string
  name: string
  division: string
}

type Team = {
  id: number | string
  name: string
  division: string
}

export function TournamentTeamsManager({ filterDivision }: { filterDivision?: string }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedTournament, setSelectedTournament] = useState<string>("")
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [tournamentsRes, teamsRes, ttRes] = await Promise.all([
        supabase
          .from('tournaments')
          .select('id, name, division')
          .order('name', { ascending: true }),
        supabase
          .from('teams')
          .select('id, name, division')
          .order('name', { ascending: true }),
        supabase
          .from('tournament_teams')
          .select('tournament_id, team_id')
      ])
      
      if (tournamentsRes.error) throw tournamentsRes.error
      if (teamsRes.error) throw teamsRes.error
      if (ttRes.error) throw ttRes.error

      setTournaments(tournamentsRes.data || [])
      setTeams(teamsRes.data || [])
      setTournamentTeams(ttRes.data || [])

    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const displayedTournaments = filterDivision 
    ? tournaments.filter(t => t.division === filterDivision)
    : tournaments

  useEffect(() => {
    // Auto-select first tournament whenever displayed list changes
    if (displayedTournaments.length > 0 && !displayedTournaments.some(t => t.id.toString() === selectedTournament)) {
      setSelectedTournament(displayedTournaments[0].id.toString())
    } else if (displayedTournaments.length === 0) {
      setSelectedTournament("")
    }
  }, [displayedTournaments, selectedTournament])

  useEffect(() => {
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTournament || !selectedTeam) {
      setError("Please select both a tournament and a team")
      return
    }

    const exists = tournamentTeams.some(
      tt => tt.tournament_id.toString() === selectedTournament && tt.team_id.toString() === selectedTeam
    )
    if (exists) {
      setError("Team is already assigned to this tournament")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertErr } = await supabase
        .from('tournament_teams')
        .insert([{
          tournament_id: parseInt(selectedTournament),
          team_id: parseInt(selectedTeam)
        }])
        
      if (insertErr) throw insertErr
      
      setSelectedTeam("")
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Assignment failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (tournamentId: number | string, teamId: number | string) => {
    setError(null)
    try {
      const { error: delErr } = await supabase
        .from('tournament_teams')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('team_id', teamId)
        
      if (delErr) throw delErr
      
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Removal failed')
    }
  }

  const assignedTeams = teams.filter(t => 
    tournamentTeams.some(tt => tt.tournament_id.toString() === selectedTournament && tt.team_id.toString() === t.id.toString())
  )

  const availableTeams = teams.filter(t => 
    !tournamentTeams.some(tt => tt.tournament_id.toString() === selectedTournament && tt.team_id.toString() === t.id.toString())
  )

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-8 flex flex-col relative mt-10">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
            <Trophy className="h-6 w-6 text-amber-500" /> Tournament Enrollments
          </h2>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">Manage Participating Teams</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-4 font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {loading && tournaments.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Select Target Tournament</label>
            <select 
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-amber-500/50 text-white transition-colors"
              value={selectedTournament}
              onChange={e => setSelectedTournament(e.target.value)}
            >
              <option value="" disabled>Choose a tournament</option>
              {displayedTournaments.map((t) => (
                <option key={t.id} value={t.id}>{t.name} {t.division ? `(${t.division})` : ''}</option>
              ))}
            </select>
          </div>

          {selectedTournament && (
            <>
              <form onSubmit={handleAssign} className="flex gap-4 items-end bg-zinc-900/30 p-4 border border-zinc-900">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Assign New Team</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-amber-500/50 text-white transition-colors"
                    value={selectedTeam}
                    onChange={e => setSelectedTeam(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select an available team</option>
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} {t.division ? `[${t.division}]` : ''}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={isSubmitting || !selectedTeam || availableTeams.length === 0} className="bg-amber-500 text-black hover:bg-amber-400 h-[46px] px-8">
                  {isSubmitting ? 'Assigning...' : 'Assign Team'}
                </Button>
              </form>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Currently Enrolled Teams ({assignedTeams.length})
                </h3>
                
                {assignedTeams.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No teams enrolled in this tournament</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {assignedTeams.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 border border-zinc-800 bg-zinc-900/50 group">
                        <div>
                          <p className="text-sm font-medium text-white">{t.name}</p>
                          {t.division && <p className="text-[10px] text-zinc-500 tracking-widest uppercase">{t.division}</p>}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemove(selectedTournament, t.id)} 
                          className="h-8 px-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove from tournament"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
