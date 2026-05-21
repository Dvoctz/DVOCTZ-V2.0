import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { UserSquare2, Trophy, Flag, CalendarDays, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PlayerProfile = {
  id: number
  name: string
  photo_url: string
  role: string
  created_at: string
  teams?: { id: number, name: string, logo_url?: string }
  clubs?: { id: number, name: string }
}

type Fixture = {
  id: number
  tournament_id: number
  team1_id: number
  team2_id: number
  winner_team_id: number | null
  status: string
  score: any
  tournaments: { id: number, name: string }
}

export default function PlayerProfilePage() {
  const { id } = useParams()
  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [stats, setStats] = useState({
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    tournamentsPlayed: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      setLoading(true)
      
      const { data: playerData, error } = await supabase
        .from('players')
        .select(`
          *,
          teams (id, name, logo_url),
          clubs (id, name)
        `)
        .eq('id', id)
        .single()
        
      if (playerData) {
        setPlayer(playerData)
        
        if (playerData.teams?.id) {
          const { data: fixturesData } = await supabase
            .from('fixtures')
            .select(`
              id, tournament_id, team1_id, team2_id, winner_team_id, status, score,
              tournaments (id, name)
            `)
            .or(`team1_id.eq.${playerData.teams.id},team2_id.eq.${playerData.teams.id}`)
            .eq('status', 'completed')
            
          if (fixturesData && fixturesData.length > 0) {
            let matches = fixturesData.length
            let pWins = 0
            let pLosses = 0
            
            const uniqueTournaments = new Set(fixturesData.map(f => f.tournament_id))
            
            fixturesData.forEach(f => {
              // Since this is based on current team, checking if winner is current team
              if (f.winner_team_id === playerData.teams?.id) {
                pWins++
              } else if (f.winner_team_id) {
                pLosses++
              } else {
                // If it's a draw, or winner not set explicitly, check score
                const s1 = f.score?.team1Score || 0
                const s2 = f.score?.team2Score || 0
                if (f.team1_id === playerData.teams?.id) {
                  if (s1 > s2) pWins++
                  else if (s2 > s1) pLosses++
                } else if (f.team2_id === playerData.teams?.id) {
                  if (s2 > s1) pWins++
                  else if (s1 > s2) pLosses++
                }
              }
            })
            
            setStats({
              matchesPlayed: matches,
              wins: pWins,
              losses: pLosses,
              tournamentsPlayed: uniqueTournaments.size
            })
          }
        }
      }
      setLoading(false)
    }
    
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin"></div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <UserSquare2 className="w-16 h-16 text-zinc-800 mb-6" />
        <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Player Not Found</h2>
        <p className="text-zinc-500 mb-8 max-w-md">The requested player profile could not be located in our database.</p>
        <Link to="/">
          <Button variant="outline" className="border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1000px] mx-auto pb-20 mt-8 px-4 md:px-0">
      <Link to="/" className="inline-flex items-center text-[10px] uppercase font-bold tracking-widest text-zinc-500 hover:text-amber-500 mb-8 transition-colors">
        ← Back to Home
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-zinc-950 border border-zinc-900 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-black/80 pointer-events-none" />
            
            <div className="aspect-square bg-zinc-900 relative">
              {player.photo_url ? (
                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover relative z-10" />
              ) : (
                <div className="w-full h-full flex items-center justify-center relative z-10">
                  <UserSquare2 className="w-24 h-24 text-zinc-800" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-zinc-950 to-transparent z-20" />
              
              <div className="absolute bottom-4 left-4 z-30">
                <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-1 shadow-black drop-shadow-md">
                  {player.role}
                </p>
                <h1 className="text-3xl font-black italic text-white drop-shadow-md leading-none">
                  {player.name}
                </h1>
              </div>
            </div>
            
            <div className="p-6 relative z-30">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <Flag className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Current Team</p>
                    <p className="text-sm font-semibold text-white">{player.teams?.name || 'Free Agent'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Club Affiliation</p>
                    <p className="text-sm font-semibold text-white">{player.clubs?.name || 'Unaffiliated'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-0.5">Registered Since</p>
                    <p className="text-sm font-semibold text-zinc-300">
                      {new Date(player.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column: Stats & Data */}
        <div className="md:col-span-2 space-y-8">
          
          <div>
            <h3 className="text-xs font-black tracking-widest text-white uppercase flex items-center gap-2 mb-6 border-b border-zinc-900 pb-3">
              <Activity className="w-4 h-4 text-amber-500" /> Career Statistics
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-950 border border-zinc-900 p-6 text-center group hover:border-amber-500/50 transition-colors">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Matches</p>
                <p className="text-4xl font-black italic text-white group-hover:text-amber-500 transition-colors">{stats.matchesPlayed}</p>
              </div>
              
              <div className="bg-zinc-950 border border-zinc-900 p-6 text-center group hover:border-emerald-500/50 transition-colors">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Wins</p>
                <p className="text-4xl font-black italic text-white group-hover:text-emerald-500 transition-colors">{stats.wins}</p>
              </div>
              
              <div className="bg-zinc-950 border border-zinc-900 p-6 text-center group hover:border-red-500/50 transition-colors">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Losses</p>
                <p className="text-4xl font-black italic text-white group-hover:text-red-500 transition-colors">{stats.losses}</p>
              </div>
              
              <div className="bg-zinc-950 border border-zinc-900 p-6 text-center group hover:border-amber-500/50 transition-colors">
                <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2">Events</p>
                <p className="text-4xl font-black italic text-white group-hover:text-amber-500 transition-colors">{stats.tournamentsPlayed}</p>
              </div>
            </div>
            
            <div className="mt-4 flex">
              <div 
                className="h-2 bg-emerald-500" 
                style={{ width: `${stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0}%` }}
              />
              <div 
                className="h-2 bg-red-500" 
                style={{ width: `${stats.matchesPlayed > 0 ? (stats.losses / stats.matchesPlayed) * 100 : 0}%` }}
              />
              <div 
                className="h-2 bg-zinc-800" 
                style={{ width: `${stats.matchesPlayed > 0 ? ((stats.matchesPlayed - stats.wins - stats.losses) / stats.matchesPlayed) * 100 : 100}%` }}
              />
            </div>
            <div className="mt-2 text-right">
               <span className="text-[10px] text-zinc-500 font-mono">
                 WIN RATE: {(stats.matchesPlayed > 0 ? (stats.wins / stats.matchesPlayed) * 100 : 0).toFixed(1)}%
               </span>
            </div>
          </div>
          
          <div className="bg-zinc-950/50 border border-dashed border-zinc-900 p-8 text-center mt-8">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Detailed Match History</h4>
            <p className="text-zinc-600 text-sm mb-4">Detailed match history logging will be available in a future update.</p>
          </div>
          
        </div>
      </div>
    </div>
  )
}
