import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UserSquare2, Edit2, Trash2, Plus, X } from "lucide-react"

type Player = {
  id: number | string
  name: string
  photo_url: string
  role: string
  team_id: number | string | null
  club_id: number | string | null
  teams?: { name: string }
  clubs?: { name: string }
}

type Team = {
  id: number | string
  name: string
}

type Club = {
  id: number | string
  name: string
}

const PLAYER_ROLES = [
  'Main Netty',
  'Left Front',
  'Right Front',
  'Net Center',
  'Back Center',
  'Left Back',
  'Right Back',
  'Right Netty',
  'Left Netty',
  'Service Man'
]

export function PlayersManager() {
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState("")
  const [clubFilter, setClubFilter] = useState("")
  const [teamFilter, setTeamFilter] = useState("")
  
  const [formData, setFormData] = useState({
    name: '',
    photo_url: '',
    role: PLAYER_ROLES[0],
    team_id: '',
    club_id: ''
  })

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [playersRes, teamsRes, clubsRes] = await Promise.all([
        supabase
          .from('players')
          .select('*, teams(name), clubs(name)')
          .order('name', { ascending: true }),
        supabase
          .from('teams')
          .select('id, name')
          .order('name', { ascending: true }),
        supabase
          .from('clubs')
          .select('id, name')
          .order('name', { ascending: true })
      ])
      
      if (playersRes.error) throw playersRes.error
      if (teamsRes.error) throw teamsRes.error
      if (clubsRes.error) throw clubsRes.error

      setPlayers(playersRes.data || [])
      setTeams(teamsRes.data || [])
      setClubs(clubsRes.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenModal = (p?: Player) => {
    if (p) {
      setEditingId(p.id)
      setFormData({
        name: p.name || '',
        photo_url: p.photo_url || '',
        role: p.role || PLAYER_ROLES[0],
        team_id: p.team_id?.toString() || '',
        club_id: p.club_id?.toString() || ''
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        photo_url: '',
        role: PLAYER_ROLES[0],
        team_id: '',
        club_id: clubs.length > 0 ? clubs[0].id.toString() : ''
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const submissionData = {
      name: formData.name,
      photo_url: formData.photo_url,
      role: formData.role,
      team_id: formData.team_id ? parseInt(formData.team_id) : null,
      club_id: formData.club_id ? parseInt(formData.club_id) : null,
    }

    try {
      if (editingId) {
        const { error: updateErr } = await supabase
          .from('players')
          .update(submissionData)
          .eq('id', editingId)
          
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('players')
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
      .from('players')
      .delete()
      .eq('id', id)
      
    if (delErr) {
      setError(delErr.message)
    } else {
      setConfirmDeleteId(null)
      await loadData()
    }
  }

  const filteredPlayers = players.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (clubFilter && p.club_id?.toString() !== clubFilter) return false
    if (teamFilter && p.team_id?.toString() !== teamFilter) return false
    return true
  })

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-8 flex flex-col relative mt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
            <UserSquare2 className="h-6 w-6 text-blue-500" /> Player Directory
          </h2>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">Registered Athletes</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Input 
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full md:w-48 bg-zinc-900 border-zinc-800 focus:border-blue-500/50"
          />
          <select 
            className="w-full md:w-auto bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors h-10 rounded-md"
            value={clubFilter}
            onChange={e => setClubFilter(e.target.value)}
          >
            <option value="">All Clubs</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select 
            className="w-full md:w-auto bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors h-10 rounded-md"
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <Button onClick={() => handleOpenModal()} className="w-full md:w-auto text-xs border-blue-500/20 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-black">
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
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">No players match the criteria</p>
          {(searchQuery || clubFilter || teamFilter) ? (
            <Button onClick={() => { setSearchQuery(""); setClubFilter(""); setTeamFilter(""); }} variant="outline" size="sm" className="border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-black hover:border-blue-500">
              Clear Filters
            </Button>
          ) : (
            <Button onClick={() => handleOpenModal()} variant="outline" size="sm" className="border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-black hover:border-blue-500">
              Initialize First Player
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-4 border-b border-zinc-900 hover:bg-zinc-900/40 px-3 transition-colors group cursor-default">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                   {p.photo_url ? (
                     <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                   ) : (
                     <UserSquare2 className="w-5 h-5 text-zinc-700" />
                   )}
                </div>
                <div>
                  <p className="text-[10px] text-blue-500 font-bold tracking-widest uppercase mb-1">
                    {p.role}
                  </p>
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    {p.clubs?.name && (
                      <span className="text-[10px] text-zinc-500 italic font-normal tracking-wide">
                        Club: {p.clubs.name}
                      </span>
                    )}
                    {p.teams?.name && (
                      <span className="text-[10px] text-zinc-400 font-normal tracking-wide bg-zinc-900 px-1.5 py-0.5 rounded-sm">
                        Team: {p.teams.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(p)} className="h-8 px-2 text-zinc-400 hover:text-blue-500">
                  <Edit2 className="h-4 w-4" />
                </Button>
                {confirmDeleteId === p.id ? (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-8 px-2 text-white bg-red-500 hover:bg-red-600">
                    Confirm
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(p.id)} className="h-8 px-2 text-zinc-400 hover:text-red-500">
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative w-full max-w-lg bg-zinc-950 border border-blue-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 ring-4 ring-zinc-950/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-blue-500 font-bold mb-1">Database Op</p>
                <h3 className="text-2xl font-bold tracking-tight italic text-white">{editingId ? 'Modify Player' : 'Register Player'}</h3>
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Player Name</label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Role</label>
                <select 
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors"
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                >
                  {PLAYER_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Club Affiliation</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors"
                  value={formData.club_id}
                  onChange={e => setFormData(p => ({ ...p, club_id: e.target.value }))}
                >
                  <option value="">No Club</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Team Assignment</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-blue-500/50 text-white transition-colors"
                  value={formData.team_id}
                  onChange={e => setFormData(p => ({ ...p, team_id: e.target.value }))}
                >
                  <option value="">No Team</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Photo URL</label>
                <Input 
                  type="url"
                  value={formData.photo_url}
                  onChange={e => setFormData(p => ({ ...p, photo_url: e.target.value }))}
                  placeholder="https://example.com/photo.jpg"
                  className="focus:border-blue-500/50"
                />
              </div>

              <div className="pt-6 flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={handleCloseModal}>
                  Abort
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-500 text-black hover:bg-blue-400">
                  {isSubmitting ? 'Transmitting...' : (editingId ? 'Commit Alteration' : 'Deploy Player')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
