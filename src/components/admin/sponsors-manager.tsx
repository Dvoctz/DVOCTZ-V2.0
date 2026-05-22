import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Briefcase, Edit2, Trash2, Plus, X } from "lucide-react"
import { ImageUpload } from "@/components/ui/image-upload"

type Sponsor = {
  id: number | string
  name: string
  logo_url?: string
}

export function SponsorsManager() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState("")

  const [formData, setFormData] = useState({
    name: '',
    logo_url: ''
  })

  // Set default form
  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('name', { ascending: true })
        
      if (error) {
        if (error.code === '42P01') {
          setSponsors([])
          return
        }
        throw error
      }

      setSponsors(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenModal = (s?: Sponsor) => {
    if (s) {
      setEditingId(s.id)
      setFormData({
        name: s.name || '',
        logo_url: s.logo_url || ''
      })
    } else {
      setEditingId(null)
      setFormData({
        name: '',
        logo_url: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (editingId) {
        const { error: updateErr } = await supabase
          .from('sponsors')
          .update(formData)
          .eq('id', editingId)
          
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('sponsors')
          .insert([formData])
          
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
      .from('sponsors')
      .delete()
      .eq('id', id)
      
    if (delErr) {
      setError(delErr.message)
    } else {
      setConfirmDeleteId(null)
      await loadData()
    }
  }

  const displayedSponsors = sponsors.filter(s => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-4 md:p-8 flex flex-col relative w-full overflow-hidden mt-6 md:mt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6 md:mb-8">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
             <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-amber-500" /> Sponsor Manager
          </h2>
          <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">Configured Sponsors</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Input 
            type="text"
            placeholder="Search sponsors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full md:w-64 bg-zinc-900 border-zinc-800 focus:border-amber-500/50"
          />
          <Button onClick={() => handleOpenModal()} className="w-full md:w-auto text-[10px] md:text-xs border-amber-500/20 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black">
            <Plus className="h-4 w-4 mr-2" /> Add Sponsor
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
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
        </div>
      ) : displayedSponsors.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">No sponsors configured</p>
          {searchQuery ? (
            <Button onClick={() => setSearchQuery("")} variant="outline" size="sm" className="border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black hover:border-amber-500">
              Clear Search
            </Button>
          ) : (
            <Button onClick={() => handleOpenModal()} variant="outline" size="sm" className="border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black hover:border-amber-500">
              Initialize First Sponsor
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {displayedSponsors.map((s) => (
            <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900/40 px-4 transition-colors group cursor-default gap-3 md:gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 p-1">
                   {s.logo_url ? (
                     <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain mix-blend-screen" />
                   ) : (
                     <Briefcase className="w-6 h-6 text-zinc-700" />
                   )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-white max-w-[200px] sm:max-w-none truncate">{s.name}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Partner</p>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end">
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(s)} className="h-8 px-2 text-zinc-400 hover:text-amber-500">
                  <Edit2 className="h-4 w-4" />
                </Button>
                {confirmDeleteId === s.id ? (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="h-8 px-2 text-white bg-red-500 hover:bg-red-600">
                    Confirm
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(s.id)} className="h-8 px-2 text-zinc-400 hover:text-red-500">
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
          <div className="relative w-full max-w-lg bg-zinc-950 border border-amber-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 ring-4 ring-zinc-950/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1">Database Op</p>
                <h3 className="text-2xl font-bold tracking-tight italic text-white">{editingId ? 'Modify Sponsor' : 'Add Sponsor'}</h3>
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
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Sponsor Name</label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Red Bull"
                  className="focus:border-amber-500/50"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Sponsor Logo</label>
                <ImageUpload 
                  bucket="sponsor-logos"
                  value={formData.logo_url}
                  onChange={(url) => setFormData(p => ({ ...p, logo_url: url }))}
                />
              </div>

              <div className="pt-6 flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={handleCloseModal}>
                  Abort
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-amber-500 text-black hover:bg-amber-400">
                  {isSubmitting ? 'Transmitting...' : (editingId ? 'Commit' : 'Deploy')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
