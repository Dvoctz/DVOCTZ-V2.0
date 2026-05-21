import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { UserSquare2, Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Player = {
  id: number
  name: string
  photo_url: string
  role: string
  teams?: { id: number, name: string, division: string }
  clubs?: { id: number, name: string }
}

export default function PlayersDirectory() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [teamFilter, setTeamFilter] = useState('')

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('players')
        .select(`
          id, name, photo_url, role,
          teams (id, name, division),
          clubs (id, name)
        `)
        .order('name', { ascending: true })
        
      if (data) {
        setPlayers(data)
      }
      setLoading(false)
    }
    fetchPlayers()
  }, [])

  // Derived options for filters
  const divisions = Array.from(new Set(players.map(p => p.teams?.division).filter(Boolean))) as string[]
  const teams = Array.from(new Set(players.map(p => p.teams?.name).filter(Boolean))) as string[]

  const filteredPlayers = players.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (divisionFilter && p.teams?.division !== divisionFilter) return false
    if (teamFilter && p.teams?.name !== teamFilter) return false
    return true
  })

  return (
    <div className="max-w-[1200px] mx-auto pb-24 mt-12 px-4 md:px-8">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase">Player Directory</h1>
        <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mt-2">
          Discover the athletes competing across all divisions
        </p>
      </div>

      <div className="mb-10 bg-zinc-950 border border-zinc-900 p-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full md:flex-1 space-y-2">
           <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Search</label>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
             <Input 
               placeholder="Search by name..." 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="pl-9 bg-zinc-900 border-zinc-800 text-white focus:border-amber-500/50"
             />
           </div>
        </div>
        
        <div className="w-full md:w-48 space-y-2">
           <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Division</label>
           <select 
             value={divisionFilter}
             onChange={e => setDivisionFilter(e.target.value)}
             className="w-full h-10 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none"
           >
             <option value="">All Divisions</option>
             {divisions.map(d => <option key={d} value={d}>{d}</option>)}
           </select>
        </div>

        <div className="w-full md:w-64 space-y-2">
           <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Team</label>
           <select 
             value={teamFilter}
             onChange={e => setTeamFilter(e.target.value)}
             className="w-full h-10 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-white focus:outline-none focus:border-amber-500/50 appearance-none"
           >
             <option value="">All Teams</option>
             {teams.map(t => <option key={t} value={t}>{t}</option>)}
           </select>
        </div>
        
        {(searchQuery || divisionFilter || teamFilter) && (
          <Button 
            variant="ghost" 
            onClick={() => {
              setSearchQuery('')
              setDivisionFilter('')
              setTeamFilter('')
            }}
            className="w-full md:w-auto text-xs uppercase tracking-widest text-zinc-400 hover:text-white"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-800 bg-zinc-950/50">
          <UserSquare2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 uppercase tracking-widest text-sm font-bold">No players found</p>
          <p className="text-zinc-600 text-xs mt-2">Adjust your filters to see more results</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPlayers.map(player => (
            <Link 
              key={player.id} 
              to={`/players/${player.id}`}
              className="group bg-zinc-950 border border-zinc-900 hover:border-amber-500/50 transition-all duration-300 overflow-hidden flex flex-col items-center p-6"
            >
              <div className="w-24 h-24 mb-4 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-amber-500/50 transition-colors">
                {player.photo_url ? (
                  <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <UserSquare2 className="w-12 h-12 text-zinc-700" />
                )}
              </div>
              <div className="text-center w-full">
                <h3 className="text-lg font-black uppercase text-white truncate max-w-full drop-shadow-sm group-hover:text-amber-500 transition-colors">
                  {player.name}
                </h3>
                <p className="text-[10px] font-bold text-amber-500 tracking-[0.2em] uppercase mt-1 mb-3">
                  {player.role || 'Player'}
                </p>
                
                <div className="space-y-1.5 w-full flex flex-col items-center">
                  {player.teams ? (
                    <span className="text-xs text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-sm w-full truncate border border-zinc-800/50">
                      {player.teams.name}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600 bg-black px-2.5 py-1 rounded-sm w-full truncate border border-dashed border-zinc-900">
                      Free Agent
                    </span>
                  )}
                  {player.clubs && (
                     <span className="text-[10px] text-zinc-500 w-full truncate">
                       {player.clubs.name}
                     </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
