import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { Trophy } from "lucide-react"

type Team = {
  id: number
  name: string
}

type Fixture = {
  id: number
  team1_id: number
  team2_id: number
  winner_team_id: number | null
  status: string
  best_of: number
  score: {
    resultMessage?: string
    team1Score?: number
    team2Score?: number
    sets?: { team1Points: number; team2Points: number }[]
  } | null
}

type Standing = {
  team_id: number
  team_name: string
  played: number
  wins: number
  draws: number
  losses: number
  points: number
  scored: number
  against: number
  difference: number
}

export function TournamentStandings({ tournamentId }: { tournamentId: number | string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [ttRes, fixRes] = await Promise.all([
          supabase.from('tournament_teams').select('team_id, teams!inner(id, name)').eq('tournament_id', tournamentId),
          supabase.from('fixtures').select('id, team1_id, team2_id, winner_team_id, status, best_of, score').eq('tournament_id', tournamentId).eq('status', 'completed')
        ])

        if (ttRes.error) throw ttRes.error
        if (fixRes.error) throw fixRes.error

        // @ts-ignore
        const fetchedTeams = (ttRes.data || []).map(row => row.teams as Team)
        setTeams(fetchedTeams)
        setFixtures(fixRes.data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load standings')
      } finally {
        setLoading(false)
      }
    }
    
    if (tournamentId) {
      loadData()
    }
  }, [tournamentId])

  const standings = useMemo(() => {
    const table = new Map<number, Standing>()
    
    teams.forEach(t => {
      table.set(t.id, {
        team_id: t.id,
        team_name: t.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        scored: 0,
        against: 0,
        difference: 0
      })
    })

    fixtures.forEach(f => {
      if (!f.score || f.status !== 'completed') return
      
      const t1 = table.get(f.team1_id)
      const t2 = table.get(f.team2_id)
      
      // If teams are not in the tournament teams list, initialize them
      if (!t1 && f.team1_id) table.set(f.team1_id, { team_id: f.team1_id, team_name: 'Unknown', played: 0, wins: 0, draws: 0, losses: 0, points: 0, scored: 0, against: 0, difference: 0 })
      if (!t2 && f.team2_id) table.set(f.team2_id, { team_id: f.team2_id, team_name: 'Unknown', played: 0, wins: 0, draws: 0, losses: 0, points: 0, scored: 0, against: 0, difference: 0 })

      const team1 = table.get(f.team1_id)!
      const team2 = table.get(f.team2_id)!

      if (!team1 || !team2) return

      team1.played++
      team2.played++

      // Points calculation
      let team1PointsScored = 0
      let team1PointsConceded = 0
      let team2PointsScored = 0
      let team2PointsConceded = 0

      if (f.score.sets && Array.isArray(f.score.sets)) {
        f.score.sets.forEach(set => {
          team1PointsScored += Number(set.team1Points || 0)
          team1PointsConceded += Number(set.team2Points || 0)
          team2PointsScored += Number(set.team2Points || 0)
          team2PointsConceded += Number(set.team1Points || 0)
        })
      }

      team1.scored += team1PointsScored
      team1.against += team1PointsConceded
      team1.difference = team1.scored - team1.against

      team2.scored += team2PointsScored
      team2.against += team2PointsConceded
      team2.difference = team2.scored - team2.against

      const s1 = typeof f.score.team1Score === 'number' ? f.score.team1Score : 0
      const s2 = typeof f.score.team2Score === 'number' ? f.score.team2Score : 0

      if (f.winner_team_id === f.team1_id || s1 > s2) {
        team1.wins++
        team1.points += 2
        team2.losses++
      } else if (f.winner_team_id === f.team2_id || s2 > s1) {
        team2.wins++
        team2.points += 2
        team1.losses++
      } else {
        // Draw definition strictly for BO2 1-1 scenario
        if (f.best_of === 2 && s1 === 1 && s2 === 1) {
          team1.draws++
          team2.draws++
          team1.points += 1
          team2.points += 1
        } else {
           // Fallback in case of another tie condition or missing winner
           team1.draws++
           team2.draws++
           team1.points += 1
           team2.points += 1
        }
      }
    })

    return Array.from(table.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return b.difference - a.difference
    })
  }, [teams, fixtures])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-4 font-bold uppercase tracking-widest text-center">
        {error}
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-zinc-800">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No standings available</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] uppercase tracking-widest text-zinc-500 bg-zinc-900/50 border-y border-zinc-800">
          <tr>
            <th className="px-4 py-3 font-semibold">Pos</th>
            <th className="px-4 py-3 font-semibold">Team</th>
            <th className="px-2 py-3 font-semibold text-center" title="Played">P</th>
            <th className="px-2 py-3 font-semibold text-center" title="Wins">W</th>
            <th className="px-2 py-3 font-semibold text-center" title="Draws">D</th>
            <th className="px-2 py-3 font-semibold text-center" title="Losses">L</th>
            <th className="px-2 py-3 font-semibold text-amber-500 text-center" title="Points">Pts</th>
            <th className="px-2 py-3 font-semibold text-center" title="Scored">PF</th>
            <th className="px-2 py-3 font-semibold text-center" title="Against">PA</th>
            <th className="px-2 py-3 font-semibold text-center" title="Difference">+/-</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, idx) => (
            <tr key={s.team_id} className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
              <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{idx + 1}</td>
              <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{s.team_name}</td>
              <td className="px-2 py-3 text-center text-zinc-400">{s.played}</td>
              <td className="px-2 py-3 text-center text-zinc-400">{s.wins}</td>
              <td className="px-2 py-3 text-center text-zinc-400">{s.draws}</td>
              <td className="px-2 py-3 text-center text-zinc-400">{s.losses}</td>
              <td className="px-2 py-3 text-center text-amber-500 font-bold">{s.points}</td>
              <td className="px-2 py-3 text-center text-zinc-400">{s.scored}</td>
              <td className="px-2 py-3 text-center text-zinc-400">{s.against}</td>
              <td className={`px-2 py-3 text-center font-bold ${s.difference > 0 ? 'text-emerald-500' : s.difference < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                {s.difference > 0 ? '+' : ''}{s.difference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
