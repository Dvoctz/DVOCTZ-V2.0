"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { Shield, Users, Activity, Landmark } from "lucide-react";

type ClubStats = {
  id: number;
  name: string;
  logo_url: string | null;
  team_count: number;
  player_count: number;
  win_rate: number;
};

export default function ClubsDirectoryPage() {
  const [clubs, setClubs] = useState<ClubStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubs = async () => {
      setLoading(true);
      try {
        const { data: clubsData, error } = await supabase
          .from("clubs")
          .select("id, name, logo_url, created_at")
          .order("name", { ascending: true });

        if (error) throw error;

        // Fetch overall stats for these clubs
        const { data: teamsData } = await supabase.from("teams").select("id, club_id");
        const { data: playersData } = await supabase.from("players").select("id, club_id, team_id");
        
        // This is a naive fetch for fixtures. 
        // We could fetch fixtures for all teams and calculate win rates per club.
        const { data: fixturesData } = await supabase
          .from("fixtures")
          .select("team1_id, team2_id, status, score")
          .eq("status", "completed");

        const clubList: ClubStats[] = (clubsData || []).map((club) => {
          const clubTeams = (teamsData || []).filter((t) => t.club_id === club.id);
          const teamIds = clubTeams.map((t) => t.id);
          
          const clubPlayers = (playersData || []).filter(
            (p) => p.club_id === club.id || (p.team_id && teamIds.includes(p.team_id))
          );

          let wins = 0;
          let totalMatches = 0;

          if (fixturesData && teamIds.length > 0) {
            fixturesData.forEach((f) => {
              const isTeam1 = teamIds.includes(f.team1_id);
              const isTeam2 = teamIds.includes(f.team2_id);
              
              if (!isTeam1 && !isTeam2) return;
              
              const s1 = typeof f.score?.team1Score === "number" ? f.score.team1Score : 0;
              const s2 = typeof f.score?.team2Score === "number" ? f.score.team2Score : 0;
              
              if (isTeam1) {
                totalMatches++;
                if (s1 > s2) wins++;
              }
              if (isTeam2) {
                totalMatches++;
                if (s2 > s1) wins++;
              }
            });
          }

          return {
            id: club.id,
            name: club.name,
            logo_url: club.logo_url,
            team_count: clubTeams.length,
            player_count: clubPlayers.length,
            win_rate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
          };
        });

        setClubs(clubList);
      } catch (err) {
        console.error("Failed to fetch clubs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-black">
      {/* HEADER SECTION */}
      <section className="bg-zinc-950 border-b border-zinc-900 py-20 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950 to-zinc-950 z-0"></div>
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-start">
          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500 font-bold mb-4 flex items-center">
            <Shield className="h-4 w-4 mr-2" /> Registered Organizations
          </p>
          <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter uppercase text-white mb-6">
            CLUB <span className="text-zinc-800">DIRECTORY</span>
          </h1>
          <p className="text-zinc-400 font-medium max-w-2xl text-sm md:text-base leading-relaxed">
            The official registry of all clubs competing in DVOC. Explore club profiles, active rosters, and affiliated teams.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto w-full p-6 md:p-10">
        {clubs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-900 bg-zinc-950/20">
            <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
              No clubs registered yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <Link
                key={club.id}
                to={`/club/${club.id}`}
                className="bg-zinc-950 border border-zinc-900 hover:border-amber-500/30 transition-colors p-6 group flex flex-col"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden group-hover:border-amber-500/20 transition-colors">
                    {club.logo_url ? (
                      <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <Shield className="w-8 h-8 text-zinc-800" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black italic text-white uppercase tracking-tighter group-hover:text-amber-500 transition-colors line-clamp-2">
                      {club.name}
                    </h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-auto">
                  <div className="bg-zinc-900/50 p-3 text-center border border-zinc-800/50">
                    <span className="block text-xl font-black text-white mb-1">{club.team_count}</span>
                    <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Teams</span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 text-center border border-zinc-800/50">
                    <span className="block text-xl font-black text-white mb-1">{club.player_count}</span>
                    <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Athletes</span>
                  </div>
                  <div className="bg-zinc-900/50 p-3 text-center border border-zinc-800/50">
                    <span className="block text-xl font-black text-amber-500 mb-1">{club.win_rate}%</span>
                    <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Win Rate</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
