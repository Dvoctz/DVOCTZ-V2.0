import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ArrowRightLeft } from 'lucide-react'

type Transfer = {
  id: number
  player_id: number
  from_team_id: number | null
  to_team_id: number | null
  transfer_date: string
  notes: string | null
  player: { name: string, photo_url: string | null }
  from_team?: { name: string } | null
  to_team?: { name: string } | null
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransfers = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('player_transfers')
        .select(`
          id, player_id, transfer_date, notes,
          player:players(name, photo_url),
          from_team:teams!from_team_id(name),
          to_team:teams!to_team_id(name)
        `)
        .order('transfer_date', { ascending: false })
        
      if (data) {
        setTransfers(data)
      }
      setLoading(false)
    }
    fetchTransfers()
  }, [])

  return (
    <div className="max-w-[1000px] mx-auto pb-24 mt-12 px-4 md:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase flex items-center justify-center gap-4">
          <ArrowRightLeft className="w-10 h-10 text-emerald-500" /> Transfer Market
        </h1>
        <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mt-2">
          Latest Roster Moves & Activity
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
        </div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-900 bg-zinc-950/50">
          <ArrowRightLeft className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
          <p className="text-zinc-500 uppercase tracking-widest text-sm font-bold">No Transfers Found</p>
          <p className="text-zinc-600 text-xs mt-2">There have been no recent player movements.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {transfers.map(tx => (
            <div key={tx.id} className="group bg-zinc-950 border border-zinc-900 p-6 hover:border-emerald-500/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 min-w-[200px]">
                  <Link to={`/players/${tx.player_id}`} className="shrink-0 w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden hover:border-amber-500/50 transition-colors">
                    {tx.player?.photo_url ? (
                      <img src={tx.player.photo_url} alt={tx.player.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 bg-zinc-800 rounded-full" />
                    )}
                  </Link>
                  <Link to={`/players/${tx.player_id}`} className="hover:text-amber-500 transition-colors">
                    <h3 className="text-lg font-black uppercase text-white truncate max-w-[200px]">{tx.player?.name || 'Unknown Player'}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Transfer Event</p>
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-4 flex-1">
                  <div className="flex flex-col items-end flex-1">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mb-1">Departure</span>
                    <span className="text-sm font-semibold text-zinc-400 text-right">{tx.from_team?.name || 'Free Agent'}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-emerald-500 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/50 transition-colors">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start flex-1">
                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mb-1">Arrival</span>
                    <span className="text-sm font-semibold text-white text-left">{tx.to_team?.name || 'Free Agent'}</span>
                  </div>
                </div>

                <div className="flex flex-col md:items-end min-w-[150px] border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-4">
                  <span className="text-xs font-bold text-zinc-300">
                    {tx.transfer_date ? new Date(tx.transfer_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}
                  </span>
                  {tx.notes && (
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 max-w-[200px] truncate">{tx.notes}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
