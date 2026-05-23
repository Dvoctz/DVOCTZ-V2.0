"use client";

import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
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
  const navigate = useNavigate();
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
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
            
          const { data: playersRes } = await supabase
            .from("players")
            .select("*, teams(name, division)")
            .or(orFilter)
            .order("name");
            
          if (playersRes) setPlayers(playersRes);
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

  const renderStatistics = () => (
    <div className="text-center py-16 border border-zinc-900 bg-zinc-950/50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <BarChart2 className="w-8 h-8 text-zinc-700 mx-auto mb-4" />
      <span className="text-xl font-black italic text-zinc-600 uppercase tracking-tighter mb-2 block">Club Analytics</span>
      <p className="text-[10px] uppercase font-bold tracking-widest text-amber-500">Feature Coming Soon</p>
    </div>
  );

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
