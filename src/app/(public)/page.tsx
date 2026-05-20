"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trophy, ChevronRight, Play, CalendarDays, Sword, AlignEndHorizontal } from "lucide-react"
import { TournamentStandings } from "@/components/standings/tournament-standings"

type Tournament = {
  id: number
  name: string
  division: string
  phase: string
  show_champion_banner: boolean
}

type FixturePreview = {
  id: number
  tournament_id: number
  status: string
  date_time: string
  ground: string
  best_of: number
  team1?: { name: string }
  team2?: { name: string }
  score?: {
    resultMessage?: string
    sets?: { team1Points: number, team2Points: number }[]
    team1Score?: number
    team2Score?: number
  } | null
  winner?: { name: string }
  tournaments?: { name: string, division?: string, phase?: string }
}

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [upcomingFixtures, setUpcomingFixtures] = useState<FixturePreview[]>([])
  const [recentFixtures, setRecentFixtures] = useState<FixturePreview[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('tournaments').select('*').order('id', { ascending: false }),
      supabase.from('fixtures').select('id, tournament_id, team1_id, team2_id, status, date_time, ground, best_of, team1:teams!team1_id(name), team2:teams!team2_id(name), tournaments(name, division, phase)').eq('status', 'upcoming').order('date_time', { ascending: true }).limit(20),
      supabase.from('fixtures').select('id, tournament_id, team1_id, team2_id, status, date_time, ground, best_of, score, winner:teams!winner_team_id(name), team1:teams!team1_id(name), team2:teams!team2_id(name), tournaments(name, division, phase)').eq('status', 'completed').order('date_time', { ascending: false }).limit(5)
    ]).then(([tRes, uRes, rRes]) => {
      if (tRes.data) setTournaments(tRes.data)
      if (uRes.data) setUpcomingFixtures(uRes.data)
      if (rRes.data) setRecentFixtures(rRes.data)
    })
  }, [])

  const championTournament = tournaments.find(t => t.show_champion_banner)
  
  const activeTournaments = tournaments.filter(t => t.phase !== 'completed')
  const activeDiv1 = activeTournaments.find(t => t.division === 'Division 1')
  const activeDiv2 = activeTournaments.find(t => t.division === 'Division 2')

  const getNearestFixtures = (fixturesToFilter: FixturePreview[]) => {
    if (fixturesToFilter.length === 0) return [];
    const today = new Date().toDateString();
    const todayFixtures = fixturesToFilter.filter(f => new Date(f.date_time).toDateString() === today);
    if (todayFixtures.length > 0) return todayFixtures.slice(0, 3);
    
    const nearestDate = new Date(fixturesToFilter[0].date_time).toDateString();
    return fixturesToFilter.filter(f => new Date(f.date_time).toDateString() === nearestDate).slice(0, 3);
  }

  const upcomingDiv1 = getNearestFixtures(upcomingFixtures.filter(f => f.tournaments?.division === 'Division 1' && f.tournaments?.phase !== 'completed'))
  const upcomingDiv2 = getNearestFixtures(upcomingFixtures.filter(f => f.tournaments?.division === 'Division 2' && f.tournaments?.phase !== 'completed'))

  const renderUpcomingCard = (f: FixturePreview) => (
    <div key={f.id} className="p-4 border border-zinc-900 bg-zinc-950 hover:border-zinc-800 transition-colors">
       <div className="flex justify-between items-start mb-3">
         <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-zinc-900 text-zinc-500 border border-zinc-800">
           BO{f.best_of}
         </span>
         <div className="text-right">
           <span className="block text-[10px] font-mono text-zinc-500">
             {new Date(f.date_time).toLocaleDateString()} {new Date(f.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
         </div>
       </div>
       <div className="flex flex-col gap-2">
         <span className="text-sm font-bold text-white truncate">{f.team1?.name || 'TBD'}</span>
         <span className="text-[10px] text-zinc-600 font-bold uppercase">vs</span>
         <span className="text-sm font-bold text-white truncate">{f.team2?.name || 'TBD'}</span>
       </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1">
      {/* Hero Section */}
      <section className="relative px-6 md:px-10 py-24 flex flex-col gap-10 overflow-hidden flex-1 border-b border-zinc-900 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500/10 via-black to-black object-cover z-0" />
        <header className="relative z-10 max-w-3xl">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-500 font-bold mb-4 flex items-center">
             <Trophy className="mr-2 h-4 w-4" /> Season 04 Open
          </p>
          <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter leading-[0.85] uppercase italic select-none text-white mb-8">
            Elite<br/><span className="text-zinc-800">Championship</span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400 font-medium max-w-xl leading-relaxed mb-10">
            DVOC V2 is the elite circuit for sports professionals. Prove your worth on a premier platform designed for pure competition.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a href="#circuits" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-white text-black hover:bg-zinc-200 uppercase tracking-widest font-bold text-xs h-12">
                Enter the Arena
              </Button>
            </a>
          </div>
        </header>
        <div className="absolute -right-4 top-0 opacity-10 pointer-events-none select-none z-0">
          <span className="text-[16rem] md:text-[24rem] font-black leading-none text-white">V2</span>
        </div>
      </section>

      {/* Champion Banner Section */}
      {championTournament && (
        <section className="bg-gradient-to-r from-amber-500/20 to-amber-900/10 border-b border-amber-500/30 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay"></div>
           <Trophy className="h-12 w-12 text-amber-500 mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] z-10" />
           <p className="text-xs uppercase tracking-[0.3em] text-amber-500 font-bold mb-2 z-10">Current Champions</p>
           <h2 className="text-3xl md:text-5xl font-black italic tracking-tight text-white mb-6 z-10 drop-shadow-md">
             {championTournament.name}
           </h2>
           <Link to={`/tournaments/${championTournament.id}`} className="z-10">
             <Button variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black uppercase tracking-widest text-xs font-bold">
               View Path to Victory
             </Button>
           </Link>
        </section>
      )}

      {/* Fixtures Split Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-zinc-900">
         {/* Upcoming Matches */}
         <div className="p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-zinc-900 bg-zinc-950/50">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-lg font-bold tracking-tight italic text-white flex items-center gap-2">
                 <CalendarDays className="h-5 w-5 text-zinc-500" /> Upcoming Matches
               </h3>
            </div>
            
            <div className="space-y-8">
               {upcomingDiv1.length > 0 && (
                 <div>
                   <h4 className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-3 border-b border-amber-500/20 pb-2">Division 1</h4>
                   <div className="space-y-3">
                     {upcomingDiv1.map(f => renderUpcomingCard(f))}
                   </div>
                 </div>
               )}
               {upcomingDiv2.length > 0 && (
                 <div>
                   <h4 className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-3 border-b border-zinc-800 pb-2">Division 2</h4>
                   <div className="space-y-3">
                     {upcomingDiv2.map(f => renderUpcomingCard(f))}
                   </div>
                 </div>
               )}
               {upcomingDiv1.length === 0 && upcomingDiv2.length === 0 && (
                 <div className="p-8 border border-dashed border-zinc-800 text-center">
                   <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">No upcoming active fixtures</p>
                 </div>
               )}
            </div>
         </div>

         {/* Recent Results */}
         <div className="p-6 md:p-10 bg-zinc-950">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-lg font-bold tracking-tight italic text-white flex items-center gap-2">
                 <Sword className="h-5 w-5 text-amber-500" /> Recent Results
               </h3>
            </div>

            {recentFixtures.length === 0 ? (
               <div className="p-8 border border-dashed border-zinc-800 text-center">
                 <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">No recent results</p>
               </div>
            ) : (
               <div className="space-y-4">
                 {recentFixtures.map(f => {
                   const t1Winner = f.winner?.name && f.winner.name === f.team1?.name;
                   const t2Winner = f.winner?.name && f.winner.name === f.team2?.name;
                   
                   return (
                     <div key={f.id} className={`p-4 border transition-colors relative overflow-hidden ${f.winner ? 'border-amber-500/20 bg-zinc-950/80' : 'border-zinc-900 bg-zinc-950'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-zinc-800 text-white">
                            Result • BO{f.best_of}
                          </span>
                          <span className="block text-[10px] font-mono text-zinc-500">
                            {new Date(f.date_time).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-3 my-4">
                          <div className="flex justify-between items-center w-full gap-4">
                            <span className={`text-sm font-bold truncate ${t1Winner ? 'text-amber-500' : 'text-zinc-300'}`}>
                              {f.team1?.name || 'TBD'} {t1Winner && <span className="ml-1 opacity-80">🏆</span>}
                            </span>
                            <span className="text-lg font-black text-white shrink-0">{f.score?.team1Score ?? '-'}</span>
                          </div>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span className={`text-sm font-bold truncate ${t2Winner ? 'text-amber-500' : 'text-zinc-300'}`}>
                              {f.team2?.name || 'TBD'} {t2Winner && <span className="ml-1 opacity-80">🏆</span>}
                            </span>
                            <span className="text-lg font-black text-white shrink-0">{f.score?.team2Score ?? '-'}</span>
                          </div>
                        </div>
                        {f.score?.resultMessage && (
                          <div className="mt-3 pt-3 border-t border-zinc-900">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 truncate">
                                {f.score.resultMessage}
                              </span>
                          </div>
                        )}
                     </div>
                   )
                 })}
               </div>
            )}
         </div>
      </section>

      {/* Standings Preview */}
      {(activeDiv1 || activeDiv2) && (
        <section className="bg-black border-b border-zinc-900 p-6 md:p-10 flex flex-col flex-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
            <div>
               <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 font-semibold">Circuit Leaderboards</p>
               <h2 className="text-3xl font-bold tracking-tight italic text-white flex items-center gap-2">
                 <AlignEndHorizontal className="h-6 w-6 text-amber-500" /> Active Standings
               </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {activeDiv1 && (
               <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest">{activeDiv1.name}</h3>
                    <Link to={`/tournaments/${activeDiv1.id}`}>
                      <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 uppercase tracking-widest font-bold text-[10px] h-8 px-4">
                        Full <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  <div className="border border-zinc-900 bg-zinc-950 p-1 shadow-2xl overflow-hidden rounded-sm">
                     <TournamentStandings tournamentId={activeDiv1.id} />
                  </div>
               </div>
             )}
             {activeDiv2 && (
               <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">{activeDiv2.name}</h3>
                    <Link to={`/tournaments/${activeDiv2.id}`}>
                      <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-500 uppercase tracking-widest font-bold text-[10px] h-8 px-4">
                        Full <ChevronRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                  <div className="border border-zinc-900 bg-zinc-950 p-1 shadow-2xl overflow-hidden rounded-sm">
                     <TournamentStandings tournamentId={activeDiv2.id} />
                  </div>
               </div>
             )}
          </div>
        </section>
      )}

      {/* Tournament Showcase */}
      <section id="circuits" className="bg-zinc-950 p-6 md:p-10 flex flex-col flex-1">
        <div className="flex items-end justify-between mb-8">
          <div>
             <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 font-semibold">Global Events</p>
             <h2 className="text-3xl font-bold tracking-tight italic text-white">Active Circuits</h2>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <Card key={t.id} className="group overflow-hidden hover:border-amber-500/50 border-zinc-900 transition-colors p-0 flex flex-col bg-black">
                <div className="aspect-video bg-zinc-900 border-b border-zinc-800 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800 to-zinc-950 z-0"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                  <Trophy className="h-16 w-16 text-zinc-900 z-10 drop-shadow-xl" />
                  <div className="absolute bottom-6 left-6 z-20 pr-6">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">
                         {t.division || 'Major Tier'}
                       </span>
                       <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                         {t.phase}
                       </span>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight italic text-white line-clamp-2 leading-tight drop-shadow-md">{t.name}</h3>
                  </div>
                </div>
                <CardContent className="p-6 flex justify-between items-center bg-zinc-950 flex-1">
                  <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold group-hover:text-zinc-300 transition-colors">
                    Tournament Hub
                  </div>
                  <Link to={`/tournaments/${t.id}`}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-zinc-800 text-white group-hover:text-amber-500 group-hover:border-amber-500/50 uppercase tracking-widest text-[10px] h-8 font-bold"
                    >
                      Details <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}


