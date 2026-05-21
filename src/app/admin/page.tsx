import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  Users,
  Flag,
  CalendarDays,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type FixtureData = {
  id: number;
  date_time: string;
  stage: string;
  status: string;
  score: any;
  team1: { name: string } | null;
  team2: { name: string } | null;
  tournaments: { division: string; name: string } | null;
};

export default function AdminOverview() {
  const [supabaseStatus, setSupabaseStatus] = useState<
    "testing" | "connected" | "failed"
  >("testing");

  const [metrics, setMetrics] = useState({
    activePlayers: 0,
    registeredTeams: 0,
    activeTournaments: 0,
    fixturesToday: 0,
  });

  const [div1Fixture, setDiv1Fixture] = useState<FixtureData | null>(null);
  const [div2Fixture, setDiv2Fixture] = useState<FixtureData | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [playerRes, teamRes, tournamentRes, fixtureRes] =
          await Promise.all([
            supabase
              .from("players")
              .select("*", { count: "exact", head: true }),
            supabase.from("teams").select("*", { count: "exact", head: true }),
            supabase
              .from("tournaments")
              .select("*", { count: "exact", head: true })
              .neq("phase", "completed"),
            supabase
              .from("fixtures")
              .select(
                `
            id, date_time, stage, status, score,
            team1:teams!team1_id(name),
            team2:teams!team2_id(name),
            tournaments(name, division)
          `,
              )
              .order("date_time", { ascending: false })
              .limit(50),
          ]);

        const hasAnyError =
          playerRes.error ||
          teamRes.error ||
          tournamentRes.error ||
          fixtureRes.error;
        if (hasAnyError) {
          console.error("Some Supabase queries failed", {
            playerError: playerRes.error,
            teamError: teamRes.error,
            tournamentError: tournamentRes.error,
            fixtureError: fixtureRes.error,
          });
          setSupabaseStatus(
            fixtureRes.data || playerRes.count ? "connected" : "failed",
          );
        } else {
          setSupabaseStatus("connected");
        }

        let todayCount = 0;
        const today = new Date().toDateString();

        let d1Fixture = null;
        let d2Fixture = null;

        if (fixtureRes.data) {
          fixtureRes.data.forEach((f: any) => {
            if (f.date_time && new Date(f.date_time).toDateString() === today) {
              todayCount++;
            }
            if (!d1Fixture && f.tournaments?.division === "Division 1")
              d1Fixture = f;
            if (!d2Fixture && f.tournaments?.division === "Division 2")
              d2Fixture = f;
          });
        }

        setMetrics({
          activePlayers: playerRes.count || 0,
          registeredTeams: teamRes.count || 0,
          activeTournaments: tournamentRes.count || 0,
          fixturesToday: todayCount,
        });

        setDiv1Fixture(d1Fixture);
        setDiv2Fixture(d2Fixture);
      } catch (err) {
        console.error("Supabase connection exception:", err);
        setSupabaseStatus("failed");
      }
    }
    loadDashboardData();
  }, []);

  const renderFixtureCard = (title: string, fixture: FixtureData | null) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-col group min-h-[160px]">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          {title}
        </p>
        {fixture && (
          <span
            className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 border ${
              fixture.status === "completed"
                ? "text-zinc-500 border-zinc-800"
                : fixture.status === "in_progress"
                  ? "text-amber-500 border-amber-500/30 bg-amber-500/10"
                  : "text-emerald-500 border-emerald-500/30"
            }`}
          >
            {fixture.status.replace("_", " ")}
          </span>
        )}
      </div>

      {fixture ? (
        <div className="flex-1 flex flex-col justify-center gap-1">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold text-white uppercase tracking-wider text-sm truncate pr-2">
              {fixture.team1?.name || "TBD"}
            </span>
            <span className="font-black italic text-2xl text-amber-500">
              {fixture.score?.team1Score ?? "-"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-white uppercase tracking-wider text-sm truncate pr-2">
              {fixture.team2?.name || "TBD"}
            </span>
            <span className="font-black italic text-2xl text-amber-500">
              {fixture.score?.team2Score ?? "-"}
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mt-4 line-clamp-1">
            {fixture.tournaments?.name} • {fixture.stage}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs uppercase tracking-widest text-zinc-600 font-bold">
          No recent fixtures
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto">
      <header className="relative flex justify-between items-start">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-amber-500 font-bold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> League Operations
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.85] uppercase italic select-none">
            Governance
            <br />
            <span className="text-zinc-800">Dashboard</span>
          </h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 shrink-0 flex items-center gap-3">
          {supabaseStatus === "testing" && (
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="w-3 h-3 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                System Check...
              </span>
            </div>
          )}
          {supabaseStatus === "connected" && (
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Systems Online
              </span>
            </div>
          )}
          {supabaseStatus === "failed" && (
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Live Data Unavailable
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Primary Metrics Layer */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 flex flex-col gap-1 group hover:border-amber-500/30 transition-colors">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 flex justify-between">
            Active Athletes <Users className="h-3 w-3" />
          </p>
          <p className="text-4xl font-black text-white italic tracking-tight">
            {metrics.activePlayers}
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 flex flex-col gap-1 group hover:border-amber-500/30 transition-colors">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 flex justify-between">
            Registered Teams <Flag className="h-3 w-3" />
          </p>
          <p className="text-4xl font-black text-white italic tracking-tight">
            {metrics.registeredTeams}
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 flex flex-col gap-1 group hover:border-amber-500/30 transition-colors">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 flex justify-between">
            Active Circuits <Trophy className="h-3 w-3 text-amber-500" />
          </p>
          <p className="text-4xl font-black text-amber-500 italic tracking-tight">
            {metrics.activeTournaments}
          </p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-6 flex flex-col gap-1 group hover:border-amber-500/30 transition-colors">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 flex justify-between">
            Fixtures Today <CalendarDays className="h-3 w-3" />
          </p>
          <p className="text-4xl font-black text-white italic tracking-tight">
            {metrics.fixturesToday}
          </p>
        </div>
      </section>

      {/* Match Operations Layer */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderFixtureCard("Div 1: Latest Fixture", div1Fixture)}
        {renderFixtureCard("Div 2: Latest Fixture", div2Fixture)}
      </section>
    </div>
  );
}
