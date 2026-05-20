import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "@/lib/supabase/client"
import { Trophy, CalendarDays, ChevronLeft, ArrowLeft } from "lucide-react"
import { TournamentStandings } from "@/components/standings/tournament-standings"

type Tournament = {
  id: number
  name: string
  division: string
  phase: string
  show_champion_banner: boolean
}

type Fixture = {
  id: number
  team1_id: number | null
  team2_id: number | null
  status: string
  date_time: string
  ground: string
  best_of: number
  referee: string
  team1?: { name: string }
  team2?: { name: string }
  score: {
    resultMessage?: string
    sets?: { team1Points: number, team2Points: number }[]
    team1Score?: number
    team2Score?: number
  } | null
  winner?: { name: string }
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTournamentData = async () => {
      setLoading(true)
      try {
        const [tRes, fRes] = await Promise.all([
          supabase.from("tournaments").select("*").eq("id", id).single(),
          supabase.from("fixtures").select("id, team1_id, team2_id, status, date_time, ground, best_of, referee, score, team1:teams!team1_id(name), team2:teams!team2_id(name), winner:teams!winner_team_id(name)").eq("tournament_id", id).order("date_time", { ascending: true })
        ])
        
        if (tRes.error) throw tRes.error
        setTournament(tRes.data)
        if (!fRes.error && fRes.data) {
          setFixtures(fRes.data)
        }
      } catch (err: any) {
        setError(err.message || "Failed to load tournament")
      } finally {
        setLoading(false)
      }
    }
    
    if (id) loadTournamentData()
  }, [id])

  const upcomingFixtures = fixtures.filter(f => f.status === 'upcoming')
  const liveFixtures = fixtures.filter(f => f.status === 'live')
  const completedFixtures = fixtures.filter(f => f.status === 'completed')

  const renderSimpleCard = (f: Fixture, isLive: boolean) => (
    <div key={f.id} className={`p-4 border transition-colors ${isLive ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-900 bg-zinc-950 hover:border-zinc-800'}`}>
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm ${isLive ? 'bg-amber-500 text-black animate-pulse' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
          {f.status} • BO{f.best_of}
        </span>
        <div className="text-right">
          <span className="block text-[10px] font-mono text-zinc-500">
            {new Date(f.date_time).toLocaleDateString()} {new Date(f.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="block text-[10px] text-zinc-600 mt-0.5">{f.ground}</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 my-4">
        <div className="flex justify-between items-center w-full">
          <span className="text-sm font-bold text-white">
            {f.team1?.name || 'TBD'}
          </span>
        </div>
        <div className="text-[10px] text-zinc-600 font-bold uppercase">vs</div>
        <div className="flex justify-between items-center w-full">
          <span className="text-sm font-bold text-white">
            {f.team2?.name || 'TBD'}
          </span>
        </div>
      </div>
      
      {f.referee && (
        <div className="mt-4 pt-3 border-t border-zinc-900">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 truncate block">Ref: {f.referee}</span>
        </div>
      )}
    </div>
  )

  const renderCompletedCard = (f: Fixture) => {
    const t1Winner = f.winner?.name && f.winner.name === f.team1?.name;
    const t2Winner = f.winner?.name && f.winner.name === f.team2?.name;
    
    return (
      <div key={f.id} className={`p-4 border transition-colors relative overflow-hidden ${f.winner ? 'border-amber-500/20 bg-zinc-950' : 'border-zinc-900 bg-zinc-950 hover:border-zinc-800'}`}>
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm bg-zinc-800 text-white">
            Completed • BO{f.best_of}
          </span>
          <div className="text-right">
             <span className="block text-[10px] font-mono text-zinc-500">
               {new Date(f.date_time).toLocaleDateString()}
             </span>
             <span className="block text-[10px] text-zinc-600 mt-0.5">{f.ground}</span>
          </div>
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

        {f.score?.sets && f.score.sets.length > 0 && (
          <div className="mt-4 mb-2 flex flex-wrap gap-2">
            {f.score.sets.map((set, idx) => (
              <div key={idx} className="flex flex-col items-center bg-zinc-900 px-2.5 py-1.5 rounded-sm border border-zinc-800">
                 <span className="text-[8px] text-zinc-500 uppercase font-bold mb-1">Set {idx + 1}</span>
                 <span className={`text-[10px] font-bold ${set.team1Points > set.team2Points ? 'text-white' : 'text-zinc-400'}`}>{set.team1Points}</span>
                 <div className="w-full h-px bg-zinc-800 my-0.5" />
                 <span className={`text-[10px] font-bold ${set.team2Points > set.team1Points ? 'text-white' : 'text-zinc-400'}`}>{set.team2Points}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 truncate">
              {f.score?.resultMessage || 'No specific result recorded'}
            </span>
            {f.referee && <span className="text-[10px] text-zinc-600 truncate shrink-0">Ref: {f.referee}</span>}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{error || "Tournament not found"}</p>
        <Link to="/" className="text-amber-500 text-xs font-bold uppercase tracking-widest hover:underline flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" /> Return to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 pb-20">
      <div className="px-6 md:px-10 pt-10 pb-6">
        <Link to="/" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors mb-8">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Circuit
        </Link>

        {/* Section 1: Tournament Info */}
        <section className="mb-16">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              <Trophy className="w-10 h-10 text-amber-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-500 font-bold mb-2">
                {tournament.division || 'Major Tier'}
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic text-white leading-tight">
                {tournament.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-900 text-zinc-300 px-3 py-1 border border-zinc-800 rounded-sm">
                  Phase: {tournament.phase}
                </span>
                {tournament.show_champion_banner && (
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 px-3 py-1 border border-amber-500/20 rounded-sm">
                    Champion Banner Active
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
          {/* Section 2: Fixtures (Left Column) */}
          <section className="lg:col-span-1 space-y-6">
            <h2 className="text-xl font-bold tracking-tight italic text-white flex items-center gap-2 mb-6">
              <CalendarDays className="w-5 h-5 text-zinc-500" /> Match Fixtures
            </h2>
            
            {fixtures.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 bg-zinc-900/20">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No fixtures slated</p>
              </div>
            ) : (
              <div className="space-y-10">
                {liveFixtures.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-4 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                       Live Matches
                    </h3>
                    <div className="space-y-4">
                      {liveFixtures.map(f => renderSimpleCard(f, true))}
                    </div>
                  </div>
                )}
                
                {upcomingFixtures.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-4">Upcoming Matches</h3>
                    <div className="space-y-4">
                      {upcomingFixtures.map(f => renderSimpleCard(f, false))}
                    </div>
                  </div>
                )}

                {completedFixtures.length > 0 && (
                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-4">Completed Matches</h3>
                    <div className="space-y-4">
                      {completedFixtures.map(f => renderCompletedCard(f))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section 3: Standings (Right Column) */}
          <section className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold tracking-tight italic text-white flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-amber-500" /> Tournament Standings
            </h2>
            <div className="border border-zinc-800 bg-zinc-950 p-1 lg:p-6 shadow-2xl">
              <TournamentStandings tournamentId={id!} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
