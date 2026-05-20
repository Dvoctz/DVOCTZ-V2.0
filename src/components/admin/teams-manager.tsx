import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Edit2, Trash2, Plus, X } from "lucide-react"

type Team = {
  id: number | string
  name: string
  short_name: string
  logo_url: string
  division: string
  club_id: number | string
  clubs?: { name: string }
}

type Club = {
  id: number | string
  name: string
}

export function TeamsManager({ filterDivision }: { filterDivision?: string }) {
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

  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    logo_url: '',
    division: 'Division 1',
    club_id: ''
  })

  // Set default division in form based on active tab
  useEffect(() => {
    if (filterDivision) {
      setFormData(prev => ({ ...prev, division: filterDivision }))
    }
  }, [filterDivision])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [teamsRes, clubsRes] = await Promise.all([
        supabase
          .from('teams')
          .select('*, clubs(name)')
          .order('name', { ascending: true }),
        supabase
          .from('clubs')
          .select('id, name')
          .order('name', { ascending: true })
      ])
      
      if (teamsRes.error) throw teamsRes.error
      if (clubsRes.error) throw clubsRes.error

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

  const handleOpenModal = (t?: Team) => {
    if (t) {
      setEditingId(t.id)
      setFormData({
        name: t.name || '',
        short_name: t.short_name || '',
        logo_url: t.logo_url || '',
        division: t.division || 'Division 1',
        club_id: t.club_id?.toString() || ''
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        short_name: '',
        logo_url: '',
        division: filterDivision || 'Division 1',
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

    // Ensure club_id is treated as a number
    const submissionData = {
      ...formData,
      club_id: formData.club_id ? parseInt(formData.club_id) : null
    }

    try {
      if (editingId) {
        const { error: updateErr } = await supabase
          .from('teams')
          .update(submissionData)
          .eq('id', editingId)
          
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('teams')
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
      .from('teams')
      .delete()
      .eq('id', id)
      
    if (delErr) {
      setError(delErr.message)
    } else {
      setConfirmDeleteId(null)
      await loadData()
    }
  }

  const displayedTeams = teams.filter(t => {
    if (filterDivision && t.division !== filterDivision) return false
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-8 flex flex-col relative mt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
            <Users className="h-6 w-6 text-emerald-500" /> Team Roster Manager
          </h2>
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">Configured Teams</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Input 
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full md:w-64 bg-zinc-900 border-zinc-800 focus:border-emerald-500/50"
          />
          <Button onClick={() => handleOpenModal()} className="w-full md:w-auto text-xs border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black">
            <Plus className="h-4 w-4 mr-2" /> Register Team
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
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
        </div>
      ) : displayedTeams.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">No teams match the criteria</p>
          {searchQuery ? (
            <Button onClick={() => setSearchQuery("")} variant="outline" size="sm" className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black hover:border-emerald-500">
              Clear Search
            </Button>
          ) : (
            <Button onClick={() => handleOpenModal()} variant="outline" size="sm" className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black hover:border-emerald-500">
              Initialize First Team
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayedTeams.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-4 border-b border-zinc-900 hover:bg-zinc-900/40 px-3 transition-colors group cursor-default">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                   {t.logo_url ? (
                     <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
                   ) : (
                     <Users className="w-5 h-5 text-zinc-700" />
                   )}
                </div>
                <div>
                  <p className="text-[10px] text-emerald-500 font-bold tracking-widest uppercase mb-1">
                    [{t.division}] {t.short_name && `${t.short_name}`}
                  </p>
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    {t.name}
                    {t.clubs?.name && (
                      <span className="text-[10px] text-zinc-500 italic font-normal tracking-wide ml-2 block sm:inline">
                        Club: {t.clubs.name}
                      </span>
                    )}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(t)} className="h-8 px-2 text-zinc-400 hover:text-emerald-500">
                  <Edit2 className="h-4 w-4" />
                </Button>
                {confirmDeleteId === t.id ? (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="h-8 px-2 text-white bg-red-500 hover:bg-red-600">
                    Confirm
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(t.id)} className="h-8 px-2 text-zinc-400 hover:text-red-500">
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
          <div className="relative w-full max-w-lg bg-zinc-950 border border-emerald-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 ring-4 ring-zinc-950/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold mb-1">Database Op</p>
                <h3 className="text-2xl font-bold tracking-tight italic text-white">{editingId ? 'Modify Team' : 'Register Team'}</h3>
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
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Team Designation</label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Nordic Winter Wolves"
                  className="focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Short Name (Acronym)</label>
                <Input 
                  value={formData.short_name}
                  onChange={e => setFormData(p => ({ ...p, short_name: e.target.value }))}
                  placeholder="e.g. NWW"
                  className="focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Affiliated Club</label>
                <select 
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-emerald-500/50 text-white transition-colors"
                  value={formData.club_id}
                  onChange={e => setFormData(p => ({ ...p, club_id: e.target.value }))}
                >
                  <option value="" disabled>Select a Club</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Division Class</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-emerald-500/50 text-white transition-colors"
                  value={formData.division}
                  onChange={e => setFormData(p => ({ ...p, division: e.target.value }))}
                >
                  <option value="Division 1">Division 1</option>
                  <option value="Division 2">Division 2</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Logo Image URL</label>
                <Input 
                  type="url"
                  value={formData.logo_url}
                  onChange={e => setFormData(p => ({ ...p, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="focus:border-emerald-500/50"
                />
              </div>

              <div className="pt-6 flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={handleCloseModal}>
                  Abort
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-500 text-black hover:bg-emerald-400">
                  {isSubmitting ? 'Transmitting...' : (editingId ? 'Commit Alteration' : 'Deploy Team')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
