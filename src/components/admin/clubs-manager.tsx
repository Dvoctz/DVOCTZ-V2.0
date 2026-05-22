import React from 'react';
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Shield, Edit2, Trash2, Plus, X } from "lucide-react"

type Club = {
  id: number | string
  name: string
  logo_url: string
  created_at?: string
}

export function ClubsManager() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    logo_url: ''
  })

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchErr } = await supabase
        .from('clubs')
        .select('*')
        .order('name', { ascending: true })
        
      if (fetchErr) throw fetchErr

      setClubs(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenModal = (c?: Club) => {
    if (c) {
      setEditingId(c.id)
      setFormData({
        name: c.name || '',
        logo_url: c.logo_url || ''
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

    const submissionData = {
      name: formData.name,
      logo_url: formData.logo_url
    }

    try {
      if (editingId) {
        const { error: updateErr } = await supabase
          .from('clubs')
          .update(submissionData)
          .eq('id', editingId)
          
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('clubs')
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
      .from('clubs')
      .delete()
      .eq('id', id)
      
    if (delErr) {
      setError(delErr.message)
    } else {
      setConfirmDeleteId(null)
      await loadData()
    }
  }

  return (
    <section className="border border-zinc-800 bg-zinc-950 p-4 md:p-8 flex flex-col relative w-full overflow-hidden mt-6 md:mt-10">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight italic text-white flex items-center gap-3">
            <Shield className="h-5 w-5 md:h-6 md:w-6 text-red-500" /> Club Directory
          </h2>
          <p className="text-[10px] md:text-xs text-zinc-500 font-semibold uppercase tracking-widest mt-1">Founding Organizations</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="text-[10px] md:text-xs border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Register Club
        </Button>
      </div>

      {error && !isModalOpen && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-4 font-bold uppercase tracking-widest">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin"></div>
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">No clubs discovered in network</p>
          <Button onClick={() => handleOpenModal()} variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500 hover:text-black hover:border-red-500">
            Initialize First Club
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((c) => (
            <div key={c.id} className="flex items-start justify-between p-4 border border-zinc-900 hover:bg-zinc-900/40 transition-colors group cursor-default">
              <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <Shield className="w-6 h-6 text-zinc-700" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(c)} className="h-8 px-2 text-zinc-400 hover:text-red-500">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {confirmDeleteId === c.id ? (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="h-8 px-2 text-white bg-red-500 hover:bg-red-600">
                        Confirm
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(c.id)} className="h-8 px-2 text-zinc-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white break-words">
                    {c.name}
                  </h3>
                  {c.created_at && (
                    <p className="text-[10px] text-zinc-500 tracking-widest uppercase mt-1">
                      Est. {new Date(c.created_at).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative w-full max-w-md bg-zinc-950 border border-red-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 ring-4 ring-zinc-950/50 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-red-500 font-bold mb-1">Database Op</p>
                <h3 className="text-2xl font-bold tracking-tight italic text-white">{editingId ? 'Modify Club' : 'Register Club'}</h3>
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
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Organization Name</label>
                <Input 
                  required
                  value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Unity Power Volleyball Club"
                  className="focus:border-red-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block">Logo Image URL</label>
                <Input 
                  type="url"
                  value={formData.logo_url}
                  onChange={e => setFormData(p => ({ ...p, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="focus:border-red-500/50"
                />
              </div>

              <div className="pt-6 flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={handleCloseModal}>
                  Abort
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1 bg-red-500 text-black hover:bg-red-400">
                  {isSubmitting ? 'Transmitting...' : (editingId ? 'Commit Alteration' : 'Deploy Club')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
