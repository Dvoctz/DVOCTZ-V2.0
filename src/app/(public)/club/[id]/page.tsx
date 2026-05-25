"use client";

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { MoveLeft, Shield, Users, Activity, BarChart2 } from "lucide-react";

type Club = {
  id: number;
  name: string;
  logo_url: string | null;
  created_at: string;
};

type Team = {
  id: number;
  name: string;
  division: string;
  logo_url: string | null;
};

type Player = {
  id: number;
  name: string;
  role: string;
  photo_url: string | null;
  team_id: number;
  teams?: { name: string; division: string };
};

export default function ClubDeepDivePage() {
  const { id } = useParams<{ id: string }>();
  usePageTracking({ pageType: "club", pageId: id });
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [rosters, setRosters] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "teams" | "players" | "statistics">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClubData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [clubRes, teamsRes] = await Promise.all([
          supabase.from("clubs").select("*").eq("id", id).single(),
          supabase.from("teams").select("*").eq("club_id", id).order("name")
        ]);

        if (clubRes.data) setClub(clubRes.data);
        if (teamsRes.data) {
          setTeams(teamsRes.data);
          
          const teamIds = teamsRes.data.map(t => t.id);
          const orFilter = teamIds.length > 0 
            ? `club_id.eq.${id},team_id.in.(${teamIds.join(",")})`
            : `club_id.eq.${id}`;
            
          const playersPromise = supabase
            .from("players")
            .select("*, teams(name, division)")
            .or(orFilter)
            .order("name");

          const fixturesPromise = teamIds.length > 0 
            ? supabase
                .from("fixtures")
                .select("*")
                .or(`team1_id.in.(${teamIds.join(",")}),team2_id.in.(${teamIds.join(",")})`)
                .order("date_time", { ascending: false })
            : Promise.resolve({ data: [] });

          const tournamentTeamsPromise = teamIds.length > 0
            ? supabase
                .from("tournament_teams")
                .select("tournament_id")
                .in("team_id", teamIds)
            : Promise.resolve({ data: [] });

          const [playersRes, fixturesRes, tournamentTeamsRes] = await Promise.all([playersPromise, fixturesPromise, tournamentTeamsPromise]);

          if (playersRes.data) setPlayers(playersRes.data);
          if (fixturesRes.data) setFixtures(fixturesRes.data);
          if (tournamentTeamsRes.data) setRosters(tournamentTeamsRes.data);
        }
      } catch (err) {
        console.error("Failed to load club data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadClubData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Organization Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-amber-500 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col items-center text-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Total Teams</span>
          <span className="text-4xl font-black text-amber-500">{teams.length}</span>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col items-center text-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Total Players</span>
          <span className="text-4xl font-black text-white">{players.length}</span>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col items-center text-center justify-center">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Established</span>
          <span className="text-2xl font-black text-zinc-300">{new Date(club.created_at).getFullYear()}</span>
        </div>
      </div>
    </div>
  );

  const renderTeams = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {teams.length === 0 ? (
        <div className="col-span-full text-center py-12 border border-dashed border-zinc-800 bg-zinc-950/50">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No teams registered</p>
        </div>
      ) : (
        teams.map((t) => (
          <Link
            key={t.id}
            to={`/team/${t.id}`}
            className="flex items-center gap-4 p-4 border border-zinc-900 bg-zinc-950 hover:border-amber-500/50 transition-colors group"
          >
            <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
              {t.logo_url ? (
                <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-black text-zinc-600">{t.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-amber-500 block mb-1">
                {t.division}
              </span>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-500 transition-colors truncate">
                {t.name}
              </h3>
            </div>
          </Link>
        ))
      )}
    </div>
  );

  const renderPlayers = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {players.length === 0 ? (
        <div className="col-span-full text-center py-12 border border-dashed border-zinc-800 bg-zinc-950/50">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No players registered</p>
        </div>
      ) : (
        players.map((p) => (
          <Link
            key={p.id}
            to={`/players/${p.id}`}
            className="flex items-center gap-4 p-4 border border-zinc-900 bg-zinc-950 hover:border-amber-500/50 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-zinc-600">{p.name.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-500 transition-colors">{p.name}</h4>
              {p.teams ? (
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block truncate">
                  {p.teams.name} • {p.teams.division}
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 block truncate">
                  Unaffiliated
                </span>
              )}
            </div>
          </Link>
        ))
      )}
    </div>
  );

  const renderStatistics = () => {
    const teamIds = teams.map(t => t.id);
    const validFixtures = fixtures.filter(f => f.status === "completed" && (teamIds.includes(f.team1_id) || teamIds.includes(f.team2_id)));
    
    let totalWins = 0;
    let totalMatches = 0;
    let totalLosses = 0;
    let totalDraws = 0;

    let finalsReached = 0;
    let tournamentsWon = 0;

    const uniqueTournaments = new Set<string>();

    rosters.forEach(r => {
      if (r.tournament_id) {
        uniqueTournaments.add(String(r.tournament_id));
      }
    });

    let tournamentsEntered = uniqueTournaments.size;

    const teamStats: any[] = teams.map(t => ({ id: t.id, name: t.name, division: t.division, matches: 0, wins: 0, losses: 0, draws: 0 }));

    const recentForm: string[] = [];

    const sortedFixtures = [...validFixtures].sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime());

    // Fix for duplicate final checks
    const checkedFinals = new Set<number>();

    sortedFixtures.forEach(f => {
      const isTeam1 = teamIds.includes(f.team1_id);
      const isTeam2 = teamIds.includes(f.team2_id);

      const s1 = typeof f.score?.team1Score === "number" ? f.score.team1Score : 0;
      const s2 = typeof f.score?.team2Score === "number" ? f.score.team2Score : 0;

      let winnerId = f.winner_team_id;
      if (!winnerId) {
        if (s1 > s2) winnerId = f.team1_id;
        else if (s2 > s1) winnerId = f.team2_id;
      }

      let clubWon = false;
      let clubLost = false;
      let clubDraw = false;

      if (isTeam1) {
        const stats = teamStats.find(t => t.id === f.team1_id);
        if (stats) {
          stats.matches++;
          totalMatches++;
          if (winnerId === f.team1_id) { stats.wins++; totalWins++; clubWon = true; }
          else if (winnerId === f.team2_id) { stats.losses++; totalLosses++; clubLost = true; }
          else { stats.draws++; totalDraws++; clubDraw = true; }
        }
      }

      if (isTeam2) {
        const stats = teamStats.find(t => t.id === f.team2_id);
        if (stats) {
          stats.matches++;
          totalMatches++;
          if (winnerId === f.team2_id) { stats.wins++; totalWins++; clubWon = true; }
          else if (winnerId === f.team1_id) { stats.losses++; totalLosses++; clubLost = true; }
          else { stats.draws++; totalDraws++; clubDraw = true; }
        }
      }
      
      // Prevent intra-club form duplication
      if (clubWon) recentForm.push("W");
      else if (clubLost && !clubWon) recentForm.push("L");
      else if (clubDraw && !clubWon && !clubLost) recentForm.push("D"); 

      if (f.stage?.toLowerCase() === "final" && !checkedFinals.has(f.id)) {
        checkedFinals.add(f.id);
        if (isTeam1 || isTeam2) finalsReached++;
        if (winnerId && teamIds.includes(winnerId)) tournamentsWon++;
      }
    });

    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

    const liveFixtures = fixtures.filter(f => (f.status === "live" || f.is_live) && f.status !== "completed");
    
    const latestForm = recentForm.slice(0, 5).reverse();

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10 w-full">
        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-amber-500/30 transition-colors">
             <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
               <Activity className="w-8 h-8 text-white" />
             </div>
             <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 relative z-10">Matches</span>
             <span className="text-4xl font-black text-white relative z-10">{totalMatches}</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-amber-500/30 transition-colors">
             <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 relative z-10">Wins</span>
             <span className="text-4xl font-black text-amber-500 relative z-10">{totalWins}</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col items-center justify-center relative overflow-hidden group hover:border-amber-500/30 transition-colors">
             <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 relative z-10">Losses</span>
             <span className="text-4xl font-black text-white relative z-10">{totalLosses}</span>
          </div>
          <div className="bg-zinc-950 border border-amber-500/30 p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.05)]">
             <span className="text-[10px] uppercase font-bold tracking-widest text-amber-500 mb-2 relative z-10">Win Rate</span>
             <span className="text-4xl font-black text-amber-500 relative z-10">{winRate}%</span>
          </div>
        </div>

        {/* Secondary KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tournament Overview */}
          <div className="col-span-1 md:col-span-2 bg-zinc-950 border border-zinc-900 p-6 relative overflow-hidden">
            <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-6">Tournament Record</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="block text-2xl md:text-3xl font-black text-white">{tournamentsEntered}</span>
                <span className="block text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-zinc-600 mt-1">Entered</span>
              </div>
               <div>
                <span className="block text-2xl md:text-3xl font-black text-white">{finalsReached}</span>
                <span className="block text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-zinc-600 mt-1">Finals</span>
              </div>
               <div>
                <span className="block text-2xl md:text-3xl font-black text-amber-500">{tournamentsWon}</span>
                <span className="block text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-amber-500 mt-1">Titles</span>
              </div>
            </div>
          </div>
          
          {/* Status & Form */}
          <div className="bg-zinc-950 border border-zinc-900 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-4">Live Status</h3>
              <div className="flex items-center gap-3">
                 {liveFixtures.length > 0 ? (
                   <>
                     <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                     <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{liveFixtures.length} Active Match{(liveFixtures.length > 1 ? "es" : "")}</span>
                   </>
                 ) : (
                   <>
                     <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 shrink-0" />
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No Active Matches</span>
                   </>
                 )}
              </div>
            </div>
            
            <div className="mt-6 md:mt-0 pt-6 border-t border-zinc-900">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-3">Recent Form</h3>
              <div className="flex items-center gap-2">
                {latestForm.length > 0 ? latestForm.map((result, i) => (
                  <div key={i} className={`w-6 h-6 flex items-center justify-center text-[10px] font-black rounded-sm ${result === 'W' ? 'bg-amber-500 text-black' : result === 'L' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                    {result}
                  </div>
                )) : (
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No Matches</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Team Breakdown */}
        <div className="bg-zinc-950 border border-zinc-900 overflow-hidden w-full">
           <div className="p-4 border-b border-zinc-900 bg-zinc-950/50">
             <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Team Breakdown</h3>
           </div>
           <div className="overflow-x-auto w-full">
             <table className="w-full text-left border-collapse min-w-[600px]">
               <thead>
                 <tr className="bg-zinc-900/20 border-b border-zinc-900">
                   <th className="p-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500">Team</th>
                   <th className="p-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500 text-center">Played</th>
                   <th className="p-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500 text-center">W</th>
                   <th className="p-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500 text-center">D</th>
                   <th className="p-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500 text-center">L</th>
                   <th className="p-4 text-[10px] uppercase font-bold tracking-widest text-zinc-500 text-right">Win Rate</th>
                 </tr>
               </thead>
               <tbody>
                 {teamStats.sort((a,b) => b.matches - a.matches).map(t => {
                   const trRate = t.matches > 0 ? Math.round((t.wins / t.matches) * 100) : 0;
                   return (
                     <tr key={t.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/20 transition-colors">
                       <td className="p-4">
                         <div className="flex flex-col">
                           <span className="text-sm font-bold text-white truncate">{t.name}</span>
                           <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{t.division}</span>
                         </div>
                       </td>
                       <td className="p-4 text-center text-sm text-zinc-400 font-medium">{t.matches}</td>
                       <td className="p-4 text-center text-sm text-white font-bold">{t.wins}</td>
                       <td className="p-4 text-center text-sm text-zinc-500 font-medium">{t.draws}</td>
                       <td className="p-4 text-center text-sm text-zinc-400 font-medium">{t.losses}</td>
                       <td className="p-4 text-right text-sm font-black text-amber-500">{trRate}%</td>
                     </tr>
                   )
                 })}
                 {teamStats.length === 0 && (
                   <tr>
                     <td colSpan={6} className="p-8 text-center text-[10px] uppercase tracking-widest font-bold text-zinc-600">No Teams Found</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col pt-20 pb-20 p-6 md:p-10 max-w-7xl mx-auto w-full">
      <Link
        to={-1 as any}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors w-fit mb-8 group"
      >
        <MoveLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">
          Back
        </span>
      </Link>

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12 relative">
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="w-32 h-32 md:w-48 md:h-48 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl relative z-10 p-4">
          {club.logo_url ? (
            <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain brightness-110" />
          ) : (
            <Shield className="w-16 h-16 text-zinc-800" />
          )}
        </div>
        <div className="flex-1 text-center md:text-left relative z-10 pt-4">
          <div className="inline-flex items-center gap-2 mb-2">
             <Shield className="w-4 h-4 text-red-500" />
             <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">
               Parent Organization
             </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-4">
            {club.name}
          </h1>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-zinc-900 pb-px">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "teams", label: "Teams", icon: Shield },
          { id: "players", label: "Players", icon: Users },
          { id: "statistics", label: "Statistics", icon: BarChart2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-[10px] uppercase tracking-widest font-bold transition-all relative border-b-2 ${
                isActive 
                  ? "text-amber-500 border-amber-500 bg-amber-500/5" 
                  : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "teams" && renderTeams()}
        {activeTab === "players" && renderPlayers()}
        {activeTab === "statistics" && renderStatistics()}
      </div>
    </div>
  );
}
