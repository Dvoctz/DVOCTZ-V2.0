import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { ShieldAlert, Play, Pause, RotateCcw, Trophy, ChevronLeft, Save } from "lucide-react";

export default function RefereeConsole() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState<any | null>(null);

  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTenths, setTimerTenths] = useState(0); // in tenths of a second for precision
  const [serviceSide, setServiceSide] = useState<"t1" | "t2">("t1");
  const [history, setHistory] = useState<any[]>([]); // To support undo
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchFixtures();
  }, []);

  const fetchFixtures = async () => {
    try {
      const { data, error } = await supabase
        .from("fixtures")
        .select(`
          *,
          team1:teams!team1_id(name, logo_url),
          team2:teams!team2_id(name, logo_url),
          tournaments(name, division)
        `)
        .neq('status', 'completed')
        .order("date_time", { ascending: true });

      if (error) throw error;
      setFixtures(data || []);
    } catch (err: any) {
      console.error("Error fetching fixtures:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFixture = (f: any) => {
    setSelectedFixture(f);
    
    // Initialize score if it doesn't have structure yet
    const sets = f.score?.sets?.length > 0 
      ? f.score.sets 
      : Array.from({ length: f.best_of || 3 }, () => ({ team1Points: 0, team2Points: 0 }));
    
    // Find the first set where a team hasn't won yet, or we'll just take the last active set
    let currentSetIdx = 0;
    while(currentSetIdx < sets.length - 1 && (sets[currentSetIdx].team1Points >= 25 || sets[currentSetIdx].team2Points >= 25)) {
      currentSetIdx++;
    }
    
    setActiveSetIdx(currentSetIdx);
    setHistory([]);
    setTimerTenths(0);
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTimer = (totalTenths: number) => {
    const totalSeconds = Math.floor(totalTenths / 10);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    if (timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);
    } else {
      setTimerRunning(true);
      timerRef.current = setInterval(() => {
        setTimerTenths((prev) => prev + 1);
      }, 100);
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerTenths(0);
  };
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const changeScore = async (team: "t1" | "t2") => {
    if (!selectedFixture) return;

    let currentSets = selectedFixture.score?.sets?.length > 0 
      ? JSON.parse(JSON.stringify(selectedFixture.score.sets))
      : Array.from({ length: selectedFixture.best_of || 3 }, () => ({ team1Points: 0, team2Points: 0 }));
    
    // Ensure activeSetIdx exists
    while (currentSets.length <= activeSetIdx) {
      currentSets.push({ team1Points: 0, team2Points: 0 });
    }

    const activeSet = currentSets[activeSetIdx];
    
    // Push to history for undo
    setHistory((prev) => [...prev, { sets: JSON.parse(JSON.stringify(currentSets)), serviceSide }]);
      
    if (serviceSide === team) {
      // Serving team won rally: add point, keep service
      if (team === "t1") {
        activeSet.team1Points = (activeSet.team1Points || 0) + 1;
      } else {
        activeSet.team2Points = (activeSet.team2Points || 0) + 1;
      }
    } else {
      // Receiving team won rally: NO point added, change service
      setServiceSide(team);
    }

    // Determine total scores
    let team1Score = 0;
    let team2Score = 0;
    currentSets.forEach(set => {
      // Simplified winner logic for live preview, accurate determination in admin
      if (set.winnerOverrideId) {
         if (set.winnerOverrideId === selectedFixture.team1_id?.toString()) team1Score++;
         else if (set.winnerOverrideId === selectedFixture.team2_id?.toString()) team2Score++;
      } else {
         if (set.team1Points > set.team2Points && set.team1Points >= 25 && set.team1Points - set.team2Points >= 2) team1Score++;
         else if (set.team2Points > set.team1Points && set.team2Points >= 25 && set.team2Points - set.team1Points >= 2) team2Score++;
      }
    });

    const newScore = {
      ...selectedFixture.score,
      sets: currentSets,
      team1Score,
      team2Score
    };

    const updatedFixture = {
      ...selectedFixture,
      score: newScore,
      status: "live"
    };

    setSelectedFixture(updatedFixture);
  };
  
  const handleUndo = () => {
    if (history.length === 0 || !selectedFixture) return;
    const previousState = history[history.length - 1];
    
    let team1Score = 0;
    let team2Score = 0;
    previousState.sets.forEach((set: any) => {
      if (set.winnerOverrideId) {
         if (set.winnerOverrideId === selectedFixture.team1_id?.toString()) team1Score++;
         else if (set.winnerOverrideId === selectedFixture.team2_id?.toString()) team2Score++;
      } else {
         if (set.team1Points > set.team2Points && set.team1Points >= 25 && set.team1Points - set.team2Points >= 2) team1Score++;
         else if (set.team2Points > set.team1Points && set.team2Points >= 25 && set.team2Points - set.team1Points >= 2) team2Score++;
      }
    });

    const updatedFixture = {
      ...selectedFixture,
      score: {
        ...selectedFixture.score,
        sets: previousState.sets,
        team1Score,
        team2Score
      }
    };
    
    if (previousState.serviceSide) {
      setServiceSide(previousState.serviceSide);
    }
    
    setSelectedFixture(updatedFixture);
    setHistory((prev) => prev.slice(0, -1));
  };
  
  const handleSaveToDb = async () => {
    if (!selectedFixture) return;
    try {
      const { error } = await supabase
        .from('fixtures')
        .update({ 
          score: selectedFixture.score,
          status: 'live' 
        })
        .eq('id', selectedFixture.id);
        
      if (error) throw error;
      alert("Match data synced successfully.");
    } catch (err: any) {
      alert("Failed to sync: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
         <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!selectedFixture) {
    return (
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-start relative">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none"></div>
        <div className="w-full max-w-2xl relative z-10 flex flex-col h-full gap-6">
           <div className="text-center mt-6">
              <h1 className="text-3xl font-bold tracking-tighter italic text-amber-500">OPERATIONS</h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mt-1">Select an active fixture to officiate</p>
           </div>
           
           <div className="space-y-4">
             {fixtures.length === 0 ? (
               <div className="bg-zinc-950 border border-zinc-900 p-8 text-center rounded-sm">
                 <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">No active fixtures found.</p>
               </div>
             ) : (
               fixtures.map(f => (
                 <button 
                   key={f.id} 
                   onClick={() => handleSelectFixture(f)}
                   className="w-full bg-zinc-950 border border-zinc-800 p-4 hover:border-amber-500/50 hover:bg-zinc-900 transition-all flex flex-col items-start gap-4"
                 >
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5">{f.tournaments?.division || 'Court 1'}</span>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{f.tournaments?.name}</span>
                    </div>
                    <div className="w-full flex items-center justify-between text-lg md:text-xl font-bold italic tracking-tight text-white gap-4">
                      <span className="truncate">{f.team1?.name || 'TBA'}</span>
                      <span className="text-zinc-700 font-normal">vs</span>
                      <span className="truncate text-right">{f.team2?.name || 'TBA'}</span>
                    </div>
                 </button>
               ))
             )}
           </div>
        </div>
      </div>
    );
  }

  const currentSets = selectedFixture.score?.sets || [];
  const t1Pts = currentSets[activeSetIdx]?.team1Points || 0;
  const t2Pts = currentSets[activeSetIdx]?.team2Points || 0;
  const t1Name = selectedFixture.team1?.name || "T1";
  const t2Name = selectedFixture.team2?.name || "T2";

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-zinc-950">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-zinc-900 flex items-center justify-between px-4 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-20">
        <button 
          onClick={() => setSelectedFixture(null)}
          className="h-10 px-3 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
           <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500">Match Official</span>
          <span className="text-xs font-bold text-white tracking-widest uppercase">Court Control</span>
        </div>
        <button 
          onClick={handleSaveToDb}
          className="h-10 px-3 flex items-center justify-center text-amber-500 hover:bg-amber-500/10 transition-colors border border-amber-500/30 rounded-sm"
        >
           <Save className="h-4 w-4 mr-2" />
           <span className="text-[10px] font-bold uppercase tracking-widest">Sync</span>
        </button>
      </header>

      {/* Main Board */}
      <div className="flex-1 flex flex-col p-4 overflow-y-auto w-full max-w-3xl mx-auto gap-6 mb-8">
         {/* Timer Component */}
         <div className="flex flex-col items-center p-6 bg-black border border-zinc-800 rounded-lg shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Match Clock</p>
            <div className="text-5xl font-mono font-bold tracking-tighter text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] mb-6">
              {formatTimer(timerTenths)}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={toggleTimer}
                className={`h-12 px-8 rounded-full flex items-center justify-center text-sm font-black uppercase tracking-widest transition-all ${timerRunning ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105'}`}
              >
                {timerRunning ? <Pause className="h-5 w-5 mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              <button 
                onClick={resetTimer}
                className="h-12 w-12 rounded-full border border-zinc-700 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                title="Reset Clock"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
         </div>

         {/* Sets Navigation */}
         <div className="flex items-center justify-center gap-2">
            {Array.from({length: selectedFixture.best_of || 3}).map((_, i) => (
              <button 
                key={i}
                onClick={() => setActiveSetIdx(i)}
                className={`flex flex-col items-center px-4 py-2 border rounded-sm transition-all ${activeSetIdx === i ? 'bg-amber-500/10 border-amber-500 text-amber-500 scale-105' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
              >
                <span className="text-[8px] uppercase font-bold tracking-widest mb-1">Set {i + 1}</span>
                <span className="text-xs font-bold font-mono">
                  {currentSets[i]?.team1Points || 0} - {currentSets[i]?.team2Points || 0}
                </span>
              </button>
            ))}
         </div>

         {/* Score Controls */}
         <div className="grid grid-cols-2 gap-4 flex-1 min-h-[300px]">
            {/* Team 1 Panel */}
            <div className="bg-black border border-zinc-800 rounded-xl relative overflow-hidden flex flex-col shadow-2xl">
              {serviceSide === "t1" && <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"></div>}
              
              <div 
                className="p-4 border-b border-zinc-900 flex justify-center cursor-pointer hover:bg-zinc-900/50 transition-colors"
                onClick={() => setServiceSide("t1")}
              >
                <div className="flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 max-w-full truncate px-2">{t1Name}</span>
                  {serviceSide === "t1" && <span className="text-[8px] text-amber-500 uppercase tracking-widest font-black flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Serving</span>}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center items-center py-6">
                <span className="text-8xl md:text-[10rem] font-black font-mono tracking-tighter text-white leading-none">{t1Pts}</span>
              </div>
              
              <button 
                onClick={() => changeScore("t1")}
                className="p-8 bg-zinc-900 hover:bg-zinc-800 text-white transition-colors border-t border-zinc-800 select-none active:bg-amber-500 active:text-black flex justify-center"
              >
                <div className="text-4xl font-black">+1</div>
              </button>
            </div>

            {/* Team 2 Panel */}
            <div className="bg-black border border-zinc-800 rounded-xl relative overflow-hidden flex flex-col shadow-2xl">
              {serviceSide === "t2" && <div className="absolute top-0 inset-x-0 h-1 bg-amber-500"></div>}
              
              <div 
                className="p-4 border-b border-zinc-900 flex justify-center cursor-pointer hover:bg-zinc-900/50 transition-colors"
                onClick={() => setServiceSide("t2")}
              >
                <div className="flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 max-w-full truncate px-2">{t2Name}</span>
                  {serviceSide === "t2" && <span className="text-[8px] text-amber-500 uppercase tracking-widest font-black flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Serving</span>}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center items-center py-6">
                <span className="text-8xl md:text-[10rem] font-black font-mono tracking-tighter text-white leading-none">{t2Pts}</span>
              </div>
              
              <button 
                onClick={() => changeScore("t2")}
                className="p-8 bg-zinc-900 hover:bg-zinc-800 text-white transition-colors border-t border-zinc-800 select-none active:bg-amber-500 active:text-black flex justify-center"
              >
                <div className="text-4xl font-black">+1</div>
              </button>
            </div>
         </div>

         {/* Footer Actions */}
         <div className="flex gap-4">
           <button 
             onClick={handleUndo}
             disabled={history.length === 0}
             className="flex-1 h-14 bg-black border border-zinc-800 text-white flex items-center justify-center font-bold uppercase tracking-widest text-xs disabled:opacity-50 hover:bg-zinc-900 transition-colors rounded-sm"
           >
             <RotateCcw className="h-4 w-4 mr-2" /> Undo Point
           </button>
         </div>
      </div>
    </div>
  );
}
