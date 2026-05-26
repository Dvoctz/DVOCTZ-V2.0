"use client";

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { usePageTracking } from "@/hooks/use-page-tracking";
import { MoveLeft, Trophy, Users, History, Activity, ChevronDown, ChevronUp } from "lucide-react";

type Team = {
  id: number;
  name: string;
  division: string;
  logo_url: string | null;
  club_id: number | null;
  clubs?: { id: number; name: string };
};

type Player = {
  id: number;
  name: string;
  role: string;
  photo_url: string | null;
};

type Fixture = {
  id: number;
  team1_id: number;
  team2_id: number;
  status: string;
  date_time: string;
  ground: string;
  best_of: number;
  stage?: string;
  score: any;
  tournaments?: { name: string; division: string };
  team1?: { name: string; logo_url: string };
  team2?: { name: string; logo_url: string };
};

export default function TeamDeepDivePage() {
  const { id } = useParams<{ id: string }>();
  usePageTracking({ pageType: "team", pageId: id });
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTournaments, setExpandedTournaments] = useState<Record<string, boolean>>({});

  const toggleTournament = (tName: string) => {
    setExpandedTournaments((prev) => ({ ...prev, [tName]: !prev[tName] }));
  };

  useEffect(() => {
    const loadTeamData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [teamRes, playersRes, fixturesRes] = await Promise.all([
          supabase.from("teams").select("*, clubs(id, name)").eq("id", id).single(),
          supabase.from("players").select("*").eq("team_id", id).order("name"),
          supabase
            .from("fixtures")
            .select("*, team1:teams!team1_id(name, logo_url), team2:teams!team2_id(name, logo_url), tournaments(name, division)")
            .or(`team1_id.eq.${id},team2_id.eq.${id}`)
            .order("date_time", { ascending: false })
        ]);

        if (teamRes.data) setTeam(teamRes.data);
        if (playersRes.data) setPlayers(playersRes.data);
        if (fixturesRes.data) setFixtures(fixturesRes.data);
      } catch (err) {
        console.error("Failed to load team data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTeamData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Team Not Found</h2>
        <button onClick={() => navigate(-1)} className="text-amber-500 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const completedFixtures = fixtures.filter((f) => f.status === "completed");
  const upcomingFixtures = fixtures.filter((f) => f.status === "upcoming");

  // Calculate form and stats
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let points = 0;
  const form: string[] = [];

  completedFixtures.forEach((f) => {
    const isTeam1 = f.team1_id === Number(id);
    const score = f.score;
    const s1 = typeof score?.team1Score === "number" ? score.team1Score : 0;
    const s2 = typeof score?.team2Score === "number" ? score.team2Score : 0;
    const teamScore = isTeam1 ? s1 : s2;
    const opponentScore = isTeam1 ? s2 : s1;

    let result = "D";
    if (teamScore > opponentScore) {
      wins++;
      result = "W";
      points += f.best_of === 2 ? 3 : (opponentScore === 0 ? 3 : 2);
    } else if (opponentScore > teamScore) {
      losses++;
      result = "L";
      points += f.best_of === 2 ? 0 : (teamScore === 0 ? 0 : 1);
    } else {
      draws++;
      points += 1;
    }
    
    // Recent form (add to beginning since fixtures are ordered descending)
    if (form.length < 5) form.unshift(result);
  });

  const renderFixtureCard = (f: Fixture) => {
    const isTeam1 = f.team1_id === Number(id);
    const opponent = isTeam1 ? f.team2 : f.team1;
    const teamScore = isTeam1 ? f.score?.team1Score : f.score?.team2Score;
    const oppScore = isTeam1 ? f.score?.team2Score : f.score?.team1Score;
    const result = f.status === "completed" 
      ? (teamScore > oppScore ? "W" : teamScore < oppScore ? "L" : "D")
      : "Upcoming";

    return (
      <Link
        key={f.id}
        to={`/matches/${f.id}`}
        className="flex flex-col bg-zinc-950 border border-zinc-900 hover:border-amber-500/30 transition-colors p-4 group"
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-mono text-zinc-500">
            {new Date(f.date_time).toLocaleDateString()}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">
            {f.tournaments?.name || "Tournament"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 flex gap-3 items-center">
             <div className="w-8 h-8 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0 border border-zinc-800">
               {opponent?.logo_url ? (
                  <img src={opponent.logo_url} alt="Logo" className="w-full h-full object-contain" />
               ) : (
                  <div className="w-4 h-4 bg-zinc-800 rounded-full" />
               )}
             </div>
             <div>
               <span className="text-xs font-bold text-zinc-600 block uppercase">vs</span>
               <span className="text-sm font-bold text-white truncate max-w-[120px] block group-hover:text-amber-500 transition-colors">
                 {opponent?.name || "TBD"}
               </span>
             </div>
          </div>
          <div className="flex flex-col items-end">
            {f.status === "completed" ? (
              <>
                <span className={`text-lg font-black tabular-nums leading-none ${result === 'W' ? 'text-amber-500' : result === 'L' ? 'text-red-500' : 'text-zinc-500'}`}>
                  {teamScore} - {oppScore}
                </span>
                <span className={`text-[10px] uppercase tracking-widest font-bold mt-1 ${result === 'W' ? 'text-amber-500' : result === 'L' ? 'text-red-500' : 'text-zinc-500'}`}>
                  {result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}
                </span>
              </>
            ) : (
              <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded-sm">
                VS
              </span>
            )}
          </div>
        </div>
      </Link>
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
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl relative z-10">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-3/4 h-3/4 object-contain brightness-110" />
          ) : (
            <div className="text-5xl font-black text-zinc-800">{team.name.substring(0, 2).toUpperCase()}</div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <div className="inline-flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
            <span className="text-[10px] font-bold text-amber-500 tracking-widest uppercase bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20">
              {team.division}
            </span>
            {team.clubs && (
              <Link to={`/club/${team.clubs.id}`} className="text-[10px] font-bold text-zinc-400 hover:text-amber-500 tracking-widest uppercase bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-sm transition-colors">
                {team.clubs.name}
              </Link>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white mb-6">
            {team.name}
          </h1>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 max-w-2xl">
            <div className="bg-zinc-950 border border-zinc-900 p-3">
              <span className="text-[9px] uppercase text-zinc-500 tracking-widest font-bold block mb-1">Matches</span>
              <span className="text-xl font-black text-white">{completedFixtures.length}</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 p-3">
              <span className="text-[9px] uppercase text-zinc-500 tracking-widest font-bold block mb-1">Wins</span>
              <span className="text-xl font-black text-amber-500">{wins}</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 p-3">
              <span className="text-[9px] uppercase text-zinc-500 tracking-widest font-bold block mb-1">Draws</span>
              <span className="text-xl font-black text-zinc-400">{draws}</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 p-3">
              <span className="text-[9px] uppercase text-zinc-500 tracking-widest font-bold block mb-1">Losses</span>
              <span className="text-xl font-black text-red-500">{losses}</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 p-3">
              <span className="text-[9px] uppercase text-zinc-500 tracking-widest font-bold block mb-1">Win Rate</span>
              <span className="text-xl font-black text-white">{completedFixtures.length > 0 ? Math.round((wins / completedFixtures.length) * 100) : 0}%</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-900 p-3">
              <span className="text-[9px] uppercase text-zinc-500 tracking-widest font-bold block mb-1">Form</span>
              <div className="flex gap-0.5 mt-1">
                {form.length > 0 ? form.map((r, i) => (
                  <span key={i} className={`w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold ${r === 'W' ? 'bg-amber-500/20 text-amber-500' : r === 'L' ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400'}`}>
                    {r}
                  </span>
                )) : (
                  <span className="text-xs text-zinc-600 font-bold">-</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-12">
          {/* Matches */}
          <section>
             <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-3 mb-6 flex items-center gap-2">
               <History className="w-4 h-4 text-amber-500" />
               Match History
             </h2>
             {fixtures.length === 0 ? (
               <div className="text-center py-12 bg-zinc-950/50 border border-dashed border-zinc-800">
                 <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">No fixtures recorded</p>
               </div>
             ) : (
               <div className="flex flex-col gap-4">
                 {Object.entries(
                   fixtures.reduce((acc, f) => {
                     const tName = f.tournaments?.name || "Unknown Tournament";
                     if (!acc[tName]) acc[tName] = [];
                     acc[tName].push(f);
                     return acc;
                   }, {} as Record<string, Fixture[]>)
                 ).map(([tName, tFixtures]: any) => {
                   const isExpanded = expandedTournaments[tName] ?? true;
                   return (
                     <div key={tName} className="border border-zinc-900 bg-zinc-950/50 overflow-hidden">
                       <button 
                         onClick={() => toggleTournament(tName)}
                         className="w-full flex items-center justify-between p-4 bg-zinc-900/50 hover:bg-zinc-900 transition-colors border-b border-zinc-900/50"
                       >
                         <span className="font-bold text-white tracking-widest uppercase text-xs flex items-center gap-3">
                           {tName}
                           <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20">{tFixtures.length} Matches</span>
                         </span>
                         {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                       </button>
                       {isExpanded && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 animate-in slide-in-from-top-2 duration-200">
                           {tFixtures.map(renderFixtureCard)}
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-12">
          <section>
             <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-800 pb-3 mb-6 flex items-center gap-2">
               <Users className="w-4 h-4 text-amber-500" />
               Active Roster
             </h2>
             <div className="bg-zinc-950 border border-zinc-900 group relative">
               {players.length === 0 ? (
                 <div className="p-8 text-center text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
                   No players registered
                 </div>
               ) : (
                 <div className="flex flex-col divide-y divide-zinc-900">
                   {players.map((p) => (
                     <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-zinc-900/50 transition-colors">
                       <div className="w-10 h-10 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800 flex items-center justify-center shrink-0">
                         {p.photo_url ? (
                           <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                         ) : (
                           <span className="text-xs font-bold text-zinc-600">{p.name.substring(0, 2).toUpperCase()}</span>
                         )}
                       </div>
                       <div className="flex-1 overflow-hidden">
                         <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                         <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 block truncate">
                           {p.role}
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
