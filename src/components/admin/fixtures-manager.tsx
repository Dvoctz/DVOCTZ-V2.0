import React from 'react';
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarDays, Edit2, Trash2, Plus, X } from "lucide-react"

type Fixture = {
  id: number | string
  tournament_id: number | string | null
  team1_id: number | string | null
  team2_id: number | string | null
  winner_team_id: number | string | null
  ground: string
  date_time: string
  status: string
  stage?: string
  referee: string
  man_of_the_match_id: number | string | null
  best_of: number
  score: any
  tournaments?: { name: string, division?: string, phase?: string }
  team1?: { name: string }
  team2?: { name: string }
  winner?: { name: string }
  players?: { name: string }
}

type Tournament = {
  id: number | string
  name: string
}

type Team = {
  id: number | string
  name: string
}

type Player = {
  id: number | string
  name: string
}

const FIXTURE_STATUSES = [
  'upcoming',
  'live',
  'completed'
]

const FIXTURE_STAGES = [
  'round-robin',
  'quarterfinal',
  'semifinal',
  'final'
]

export function FixturesManager({ filterDivision }: { filterDivision?: string }) {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [tournaments, setTournaments] = useState<{id: string | number, name: string, division?: string, phase?: string}[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState("")
  const [tournamentFilter, setTournamentFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  
  const [formData, setFormData] = useState({
    tournament_id: '',
    team1_id: '',
    team2_id: '',
    ground: '',
    date_time: '',
    status: FIXTURE_STATUSES[0],
    stage: 'round-robin',
    referee: '',
    man_of_the_match_id: '',
    winner_team_id: '',
    best_of: 3,
    score_sets: [] as { team1Points: number, team2Points: number }[]
  })

  // Pre-select tournament based on active tab filtering
  const displayedTournaments = filterDivision 
    ? tournaments.filter(t => t.division === filterDivision)
    : tournaments

  const displayedFixtures = tournamentFilter ? fixtures.filter(f => {
    // @ts-ignore - division may exist from joined select
    const div = f.tournaments?.division
    if (filterDivision && div !== filterDivision) return false
    if (f.tournament_id?.toString() !== tournamentFilter) return false
    if (statusFilter && f.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const t1 = f.team1?.name?.toLowerCase() || ''
      const t2 = f.team2?.name?.toLowerCase() || ''
      if (!t1.includes(q) && !t2.includes(q)) return false
    }
    return true
  }) : []

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [fixturesRes, tournamentsRes, teamsRes, playersRes] = await Promise.all([
        supabase
          .from('fixtures')
          .select('*, tournaments(name, division, phase), team1:teams!team1_id(name), team2:teams!team2_id(name), winner:teams!winner_team_id(name), players(name)')
          .order('date_time', { ascending: false }),
        supabase
          .from('tournaments')
          .select('id, name, division, phase')
          .order('name', { ascending: true }),
        supabase
          .from('teams')
          .select('id, name')
          .order('name', { ascending: true }),
        supabase
          .from('players')
          .select('id, name')
          .order('name', { ascending: true })
      ])
      
      if (fixturesRes.error) throw fixturesRes.error
      if (tournamentsRes.error) throw tournamentsRes.error
      if (teamsRes.error) throw teamsRes.error
      if (playersRes.error) throw playersRes.error

      setFixtures(fixturesRes.data || [])
      setTournaments(tournamentsRes.data || [])
      setTeams(teamsRes.data || [])
      setPlayers(playersRes.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatForInput = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      // Format as YYYY-MM-DDThh:mm
      return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  }

  const handleOpenModal = (f?: Fixture) => {
    if (f) {
      setEditingId(f.id)
      setFormData({
        tournament_id: f.tournament_id?.toString() || '',
        team1_id: f.team1_id?.toString() || '',
        team2_id: f.team2_id?.toString() || '',
        ground: f.ground || '',
        date_time: formatForInput(f.date_time),
        status: f.status || FIXTURE_STATUSES[0],
        stage: f.stage || 'round-robin',
        referee: f.referee || '',
        man_of_the_match_id: f.man_of_the_match_id?.toString() || '',
        winner_team_id: f.winner_team_id?.toString() || '',
        best_of: f.best_of || 3,
        score_sets: f.score?.sets || []
      })
    } else {
      setEditingId(null)
      
      const validTournaments = displayedTournaments.filter(t => t.phase !== 'completed')
      let defaultTournamentId = formData.tournament_id;
      
      if (!defaultTournamentId || !validTournaments.some(t => t.id.toString() === defaultTournamentId)) {
         defaultTournamentId = validTournaments.length > 0 ? validTournaments[0].id.toString() : '';
      }

      setFormData(prev => ({
        ...prev,
        tournament_id: defaultTournamentId,
        team1_id: '',
        team2_id: '',
        date_time: formatForInput(new Date().toISOString()),
        status: FIXTURE_STATUSES[0],
        stage: 'round-robin',
        referee: '',
        man_of_the_match_id: '',
        winner_team_id: '',
        best_of: 3,
        score_sets: []
      }))
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    
    if (formData.team1_id === formData.team2_id && formData.team1_id) {
      setError("Team 1 and Team 2 cannot be the same")
      return
    }

    if (formData.winner_team_id) {
      if (formData.winner_team_id !== formData.team1_id && formData.winner_team_id !== formData.team2_id) {
        setError("Winner must be one of the participating teams")
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    const parseDbId = (val: string) => val ? parseInt(val) : null

    let parsedDateTime = null;
    if (formData.date_time) {
      try {
        parsedDateTime = new Date(formData.date_time).toISOString();
      } catch (err) {
        setError('Invalid date time format');
        setIsSubmitting(false);
        return;
      }
    }

    let team1Score = 0;
    let team2Score = 0;
    
    formData.score_sets.forEach(set => {
      // Cast to number just in case inputs send as string
      const t1 = Number(set.team1Points);
      const t2 = Number(set.team2Points);
      if (t1 > t2) {
        team1Score++;
      } else if (t2 > t1) {
        team2Score++;
      }
    });

    const t1Name = teams.find(t => t.id.toString() === formData.team1_id)?.name || 'Team 1';
    const t2Name = teams.find(t => t.id.toString() === formData.team2_id)?.name || 'Team 2';

    const resultMessage = `${t1Name} ${team1Score} - ${team2Score} ${t2Name}`;

    let autoWinnerId = formData.winner_team_id;
    
    if (formData.best_of === 2) {
      if (team1Score > team2Score) autoWinnerId = formData.team1_id;
      else if (team2Score > team1Score) autoWinnerId = formData.team2_id;
    } else if (formData.best_of === 3) {
      if (team1Score >= 2) autoWinnerId = formData.team1_id;
      else if (team2Score >= 2) autoWinnerId = formData.team2_id;
    } else if (formData.best_of === 5) {
      if (team1Score >= 3) autoWinnerId = formData.team1_id;
      else if (team2Score >= 3) autoWinnerId = formData.team2_id;
    }

    const scoreData = {
      sets: formData.score_sets.map(s => ({ team1Points: Number(s.team1Points), team2Points: Number(s.team2Points) })),
      team1Score,
      team2Score,
      resultMessage
    };

    const submissionData = {
      tournament_id: parseDbId(formData.tournament_id),
      team1_id: parseDbId(formData.team1_id),
      team2_id: parseDbId(formData.team2_id),
      winner_team_id: parseDbId(autoWinnerId),
      ground: formData.ground,
      date_time: parsedDateTime,
      status: formData.status,
      stage: formData.stage,
      referee: formData.referee,
      man_of_the_match_id: parseDbId(formData.man_of_the_match_id),
      best_of: formData.best_of,
      score: scoreData
    }

    try {
      if (editingId) {
        const { error: updateErr } = await supabase
          .from('fixtures')
          .update(submissionData)
          .eq('id', editingId)
          
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('fixtures')
          .insert([submissionData])
          
        if (insertErr) throw insertErr
      }
      handleCloseModal()
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number | string) => {
    setError(null)
    const { error: delErr } = await supabase
      .from('fixtures')
      .delete()
      .eq('id', id)
      
    if (delErr) {
      setError(delErr.message)
    } else {
      setConfirmDeleteId(null)
      await loadData()
    }
  }

  const formatDateLabel = (isoString?: string) => {
    if (!isoString) return 'No Date'
    try {
      return new Date(isoString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    } catch {
      return 'Invalid Date'
    }
  }

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-8 flex flex-col relative mt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-purple-500" /> Match Fixtures
          </h2>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">Schedule & Results Manager</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Input 
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full md:w-48 bg-zinc-900 border-zinc-800 focus:border-purple-500/50"
          />
          <select 
            className="w-full md:w-auto bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50 text-white transition-colors h-10 rounded-md"
            value={tournamentFilter}
            onChange={e => setTournamentFilter(e.target.value)}
          >
            <option value="" disabled>-- Select a Tournament --</option>
            {displayedTournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select 
            className="w-full md:w-auto bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50 text-white transition-colors h-10 rounded-md"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {FIXTURE_STATUSES.map((status) => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
          <Button onClick={() => handleOpenModal()} disabled={!tournamentFilter} className="w-full md:w-auto text-xs border-purple-500/20 bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="h-4 w-4 mr-2" /> Schedule Match
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
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
        </div>
      ) : !tournamentFilter ? (
        <div className="text-center py-16 border border-dashed border-zinc-800 bg-zinc-900/20">
          <CalendarDays className="w-8 h-8 text-zinc-600 mx-auto mb-4" />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Tournament specific view</p>
          <p className="text-[10px] text-zinc-500 max-w-md mx-auto mb-4">You must select a tournament from the dropdown above to view and manage its fixtures.</p>
        </div>
      ) : displayedFixtures.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">No fixtures match the criteria</p>
          {(searchQuery || tournamentFilter || statusFilter) ? (
            <Button onClick={() => { setSearchQuery(""); setTournamentFilter(""); setStatusFilter(""); }} variant="outline" size="sm" className="border-purple-500/20 text-purple-500 hover:bg-purple-500 hover:text-black hover:border-purple-500">
              Clear Filters
            </Button>
          ) : (
            <Button onClick={() => handleOpenModal()} variant="outline" size="sm" className="border-purple-500/20 text-purple-500 hover:bg-purple-500 hover:text-black hover:border-purple-500">
              Initialize First Fixture
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {FIXTURE_STAGES.map(stage => {
            const stageFixtures = displayedFixtures.filter(f => (f.stage || 'round-robin') === stage);
            if (stageFixtures.length === 0) return null;
            
            return (
              <div key={stage} className="space-y-2">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-900 pb-2 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                   {stage.replace('-', ' ')}
                </h3>
                <div className="space-y-2">
                  {stageFixtures.map((f) => (
                    <div key={f.id} className={`flex items-center justify-between py-4 border-b hover:bg-zinc-900/40 px-3 transition-colors group cursor-default ${f.status === 'live' ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-900'}`}>
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-sm border flex items-center justify-center shrink-0 ${f.status === 'live' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                           <CalendarDays className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
                            {f.status === 'live' ? (
                              <span className="text-amber-500 flex items-center gap-1.5">
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                                </span>
                                <span>[LIVE]</span>
                              </span>
                            ) : (
                              <span className="text-purple-500">[{f.status}]</span>
                            )}
                            <span className="text-zinc-500">{formatDateLabel(f.date_time)}</span>
                          </p>
                          <h3 className="text-base sm:text-lg font-medium text-white flex items-center gap-2 flex-wrap">
                            <span className={!f.team1?.name ? "text-zinc-500 italic" : ""}>{f.team1?.name || 'TBD'}</span>
                            <span className="text-zinc-500 text-xs px-2">vs</span>
                            <span className={!f.team2?.name ? "text-zinc-500 italic" : ""}>{f.team2?.name || 'TBD'}</span>
                          </h3>
                          {f.score?.resultMessage && (
                            <div className="mt-1.5 flex items-center">
                              <span className="text-[12px] font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-sm">
                                {f.score.resultMessage}
                              </span>
                            </div>
                          )}
                          {f.winner?.name && (
                            <div className="mt-1.5 flex items-center">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20">
                                Winner: {f.winner.name}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {f.tournaments?.name && (
                              <span className="text-[10px] text-zinc-400 font-normal tracking-wide bg-zinc-900 px-1.5 py-0.5 rounded-sm">
                                {f.tournaments.name}
                              </span>
                            )}
                            {f.ground && (
                              <span className="text-[10px] text-zinc-500 italic font-normal tracking-wide">
                                Ground: {f.ground}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        {f.tournaments?.phase === 'completed' ? (
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-sm">Locked</span>
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(f)} className="h-8 px-2 text-zinc-400 hover:text-purple-500">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {confirmDeleteId === f.id ? (
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)} className="h-8 px-2 text-white bg-red-500 hover:bg-red-600">
                                Confirm
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(f.id)} className="h-8 px-2 text-zinc-400 hover:text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative w-full max-w-2xl bg-zinc-950 border border-purple-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 ring-4 ring-zinc-950/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-purple-500 font-bold mb-1">Database Op</p>
                <h3 className="text-2xl font-bold tracking-tight italic text-white">{editingId ? 'Modify Fixture' : 'Schedule Fixture'}</h3>
              </div>
              <button onClick={handleCloseModal} className="text-zinc-500 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && isModalOpen && (
              <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-3 font-bold uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Tournament</label>
                  <select 
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-purple-500/50 text-white transition-colors"
                    value={formData.tournament_id}
                    onChange={e => setFormData(p => ({ ...p, tournament_id: e.target.value }))}
                  >
                    <option value="" disabled>Select Tournament</option>
                    {displayedTournaments.filter(t => t.phase !== 'completed' || t.id.toString() === formData.tournament_id).map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                    Status
                    {formData.status === 'live' && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                    )}
                  </label>
                  <select 
                    required
                    className={`w-full border p-3 text-sm focus:outline-none focus:border-purple-500/50 transition-colors uppercase font-bold tracking-widest ${formData.status === 'live' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                    value={formData.status}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                  >
                    {FIXTURE_STATUSES.map((status) => (
                      <option key={status} value={status} className="bg-zinc-900 text-white uppercase">{status}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Stage</label>
                  <select 
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-purple-500/50 text-white transition-colors"
                    value={formData.stage}
                    onChange={e => setFormData(p => ({ ...p, stage: e.target.value }))}
                  >
                    {FIXTURE_STAGES.map((stage) => (
                      <option key={stage} value={stage} className="bg-zinc-900 text-white uppercase">{stage}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-zinc-900 p-4 bg-zinc-900/20">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Team 1 (Home)</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-purple-500/50 text-white transition-colors"
                    value={formData.team1_id}
                    onChange={e => setFormData(p => ({ ...p, team1_id: e.target.value }))}
                  >
                    <option value="">TBD</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Team 2 (Away)</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-purple-500/50 text-white transition-colors"
                    value={formData.team2_id}
                    onChange={e => setFormData(p => ({ ...p, team2_id: e.target.value }))}
                  >
                    <option value="">TBD</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Date & Time</label>
                  <Input 
                    type="datetime-local"
                    value={formData.date_time}
                    onChange={e => setFormData(p => ({ ...p, date_time: e.target.value }))}
                    className="focus:border-purple-500/50 [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Ground / Venue</label>
                  <Input 
                    value={formData.ground}
                    onChange={e => setFormData(p => ({ ...p, ground: e.target.value }))}
                    placeholder="e.g. Main Court"
                    className="focus:border-purple-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Referee</label>
                  <Input 
                    value={formData.referee}
                    onChange={e => setFormData(p => ({ ...p, referee: e.target.value }))}
                    placeholder="e.g. John Smith"
                    className="focus:border-purple-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Man of the Match</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-purple-500/50 text-white transition-colors"
                    value={formData.man_of_the_match_id}
                    onChange={e => setFormData(p => ({ ...p, man_of_the_match_id: e.target.value }))}
                  >
                    <option value="">None Selected</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border border-zinc-900 p-4 bg-zinc-900/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-white leading-none">Score Editor</h4>
                  <div className="w-32">
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 p-1.5 text-xs focus:outline-none focus:border-purple-500/50 text-white transition-colors"
                      value={formData.best_of}
                      onChange={e => {
                        const val = parseInt(e.target.value)
                        setFormData(p => ({ ...p, best_of: val, score_sets: p.score_sets.slice(0, val) }))
                      }}
                    >
                      <option value={2}>Best of 2</option>
                      <option value={3}>Best of 3</option>
                      <option value={5}>Best of 5</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.score_sets.map((set, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 text-[10px] font-bold text-zinc-500 uppercase">Set {idx + 1}</div>
                      <Input
                        type="number"
                        min="0"
                        className="flex-1 focus:border-purple-500/50 text-center h-9"
                        placeholder="T1 Pts"
                        value={set.team1Points}
                        onChange={e => {
                          const newSets = [...formData.score_sets]
                          newSets[idx].team1Points = parseInt(e.target.value) || 0
                          setFormData({ ...formData, score_sets: newSets })
                        }}
                      />
                      <span className="text-zinc-600 font-bold">-</span>
                      <Input
                        type="number"
                        min="0"
                        className="flex-1 focus:border-purple-500/50 text-center h-9"
                        placeholder="T2 Pts"
                        value={set.team2Points}
                        onChange={e => {
                          const newSets = [...formData.score_sets]
                          newSets[idx].team2Points = parseInt(e.target.value) || 0
                          setFormData({ ...formData, score_sets: newSets })
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => {
                          const newSets = formData.score_sets.filter((_, i) => i !== idx)
                          setFormData({ ...formData, score_sets: newSets })
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {formData.score_sets.length < formData.best_of && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full h-9 border-dashed border-zinc-700 text-zinc-400 hover:text-purple-500 hover:border-purple-500 hover:bg-purple-500/10 text-xs"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          score_sets: [...formData.score_sets, { team1Points: 0, team2Points: 0 }] 
                        })
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Set
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-purple-500/10 p-4 bg-purple-500/5">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold block">Match Winner (Auto-Calculated)</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-purple-500/50 text-white transition-colors"
                    value={formData.winner_team_id}
                    onChange={e => setFormData(p => ({ ...p, winner_team_id: e.target.value }))}
                  >
                    <option value="">Auto Calculate / None / TBD</option>
                    {formData.team1_id && (
                      <option value={formData.team1_id}>
                        {teams.find(t => t.id.toString() === formData.team1_id)?.name || 'Team 1'}
                      </option>
                    )}
                    {formData.team2_id && formData.team2_id !== formData.team1_id && (
                      <option value={formData.team2_id}>
                        {teams.find(t => t.id.toString() === formData.team2_id)?.name || 'Team 2'}
                      </option>
                    )}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">Leave empty to auto-calculate winner from score</p>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={handleCloseModal}>
                  Abort
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-purple-500 text-black hover:bg-purple-400">
                  {isSubmitting ? 'Transmitting...' : (editingId ? 'Commit Alteration' : 'Deploy Fixture')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
