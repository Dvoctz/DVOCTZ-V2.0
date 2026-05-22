import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { ShieldAlert, Play, Pause, RotateCcw, Trophy, ChevronLeft, Save, CheckCircle } from "lucide-react";

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

  const syncLiveState = async (fixtureId: string, state: any) => {
    try {
      await supabase.from('fixtures').update({ live_state: state }).eq('id', fixtureId);
    } catch(err) {
      console.error("Failed to sync live state", err);
    }
  };

  const handleSelectFixture = async (f: any) => {
    // Parse sets from score or start fresh
    let sets = f.score?.sets?.length > 0 
      ? JSON.parse(JSON.stringify(f.score.sets)) 
      : Array.from({ length: f.best_of || 3 }, () => ({ team1Points: 0, team2Points: 0 }));
      
    let actSet = 0;
    let t1Pts = 0;
    let t2Pts = 0;
    let serv: "t1" | "t2" = "t1";

    if (f.live_state) {
      if (f.live_state.sets) sets = f.live_state.sets;
      if (f.live_state.activeSet !== undefined) actSet = f.live_state.activeSet;
      if (f.live_state.servingTeam) serv = f.live_state.servingTeam;
      
      t1Pts = f.live_state.team1Score ?? sets[actSet]?.team1Points ?? 0;
      t2Pts = f.live_state.team2Score ?? sets[actSet]?.team2Points ?? 0;
      
      if (sets[actSet]) {
         sets[actSet].team1Points = t1Pts;
         sets[actSet].team2Points = t2Pts;
      }
    } else {
      // Find first unfinished set
      while(actSet < sets.length - 1 && (sets[actSet].team1Points >= 25 || sets[actSet].team2Points >= 25)) {
        actSet++;
      }
      t1Pts = sets[actSet].team1Points || 0;
      t2Pts = sets[actSet].team2Points || 0;
    }
    
    let timerState = { isRunning: false, startedAt: null as number | null, elapsedBeforeStart: 0 };
    if (f.live_state?.timer) {
      timerState = f.live_state.timer;
    }

    const initialLiveState = {
       team1Score: t1Pts,
       team2Score: t2Pts,
       servingTeam: serv,
       activeSet: actSet,
       sets: sets,
       timer: timerState
    };

    setSelectedFixture({
      ...f,
      live_state: initialLiveState
    });
    
    setActiveSetIdx(actSet);
    setServiceSide(serv);
    setHistory([]);
    
    if (timerRef.current) clearInterval(timerRef.current);

    let currentTenths = Math.floor(timerState.elapsedBeforeStart / 100);
    if (timerState.isRunning && timerState.startedAt) {
      currentTenths += Math.floor((Date.now() - timerState.startedAt) / 100);
    }
    setTimerTenths(currentTenths);
    setTimerRunning(timerState.isRunning);

    if (timerState.isRunning) {
      timerRef.current = setInterval(() => {
        setTimerTenths((prev) => prev + 1);
      }, 100);
    }

    // mark as live immediately when opened!
    await supabase.from('fixtures').update({ is_live: true, live_state: initialLiveState }).eq('id', f.id);
  };

  const formatTimer = (totalTenths: number) => {
    const totalSeconds = Math.floor(totalTenths / 10);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = async () => {
    if (!selectedFixture) return;

    if (timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);

      const prevTimer = selectedFixture.live_state?.timer || { isRunning: false, startedAt: null, elapsedBeforeStart: 0 };
      const now = Date.now();
      let newElapsed = prevTimer.elapsedBeforeStart;
      if (prevTimer.startedAt) {
        newElapsed += now - prevTimer.startedAt;
      } else {
        newElapsed = timerTenths * 100;
      }

      const newTimerState = {
        isRunning: false,
        startedAt: null,
        elapsedBeforeStart: newElapsed
      };

      const newLiveState = { ...selectedFixture.live_state, timer: newTimerState };
      setSelectedFixture((prev: any) => ({ ...prev, live_state: newLiveState }));
      syncLiveState(selectedFixture.id, newLiveState);

    } else {
      setTimerRunning(true);

      const prevTimer = selectedFixture.live_state?.timer || { isRunning: false, startedAt: null, elapsedBeforeStart: timerTenths * 100 };
      const newTimerState = {
        isRunning: true,
        startedAt: Date.now(),
        elapsedBeforeStart: prevTimer.elapsedBeforeStart
      };

      const newLiveState = { ...selectedFixture.live_state, timer: newTimerState };
      setSelectedFixture((prev: any) => ({ ...prev, live_state: newLiveState }));
      syncLiveState(selectedFixture.id, newLiveState);

      timerRef.current = setInterval(() => {
        setTimerTenths((prev) => prev + 1);
      }, 100);
    }
  };

  const resetTimer = async () => {
    if (!selectedFixture) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerTenths(0);

    const newTimerState = {
      isRunning: false,
      startedAt: null,
      elapsedBeforeStart: 0
    };

    const newLiveState = { ...selectedFixture.live_state, timer: newTimerState };
    setSelectedFixture((prev: any) => ({ ...prev, live_state: newLiveState }));
    syncLiveState(selectedFixture.id, newLiveState);
  };

  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, []);

  const changeScore = async (team: "t1" | "t2") => {
    if (!selectedFixture) return;

    let currentSets = selectedFixture.live_state?.sets?.length > 0 
      ? JSON.parse(JSON.stringify(selectedFixture.live_state.sets))
      : Array.from({ length: selectedFixture.best_of || 3 }, () => ({ team1Points: 0, team2Points: 0 }));
    
    // Ensure activeSetIdx exists
    while (currentSets.length <= activeSetIdx) {
      currentSets.push({ team1Points: 0, team2Points: 0 });
    }

    const activeSet = currentSets[activeSetIdx];
    
    // Push to history for undo
    setHistory((prev) => [...prev, { sets: JSON.parse(JSON.stringify(currentSets)),  serviceSide }]);
      
    let nextServiceSide = serviceSide;
    if (serviceSide === team) {
      // Serving team won rally: add point, keep service
      if (team === "t1") {
        activeSet.team1Points = (activeSet.team1Points || 0) + 1;
      } else {
        activeSet.team2Points = (activeSet.team2Points || 0) + 1;
      }
    } else {
      // Receiving team won rally: NO point added, change service
      nextServiceSide = team;
      setServiceSide(team);
    }

    const newLiveState = {
      ...selectedFixture.live_state,
      team1Score: activeSet.team1Points,
      team2Score: activeSet.team2Points,
      servingTeam: nextServiceSide,
      activeSet: activeSetIdx,
      sets: currentSets
    };

    const updatedFixture = {
      ...selectedFixture,
      live_state: newLiveState
    };

    setSelectedFixture(updatedFixture);
    syncLiveState(selectedFixture.id, newLiveState);
  };
  
  const handleUndo = () => {
    if (history.length === 0 || !selectedFixture) return;
    const previousState = history[history.length - 1];
    
    let nextServiceSide = previousState.serviceSide || serviceSide;
    if (previousState.serviceSide) {
      setServiceSide(previousState.serviceSide);
    }
    
    const restoredSets = previousState.sets;
    const actSet = restoredSets[activeSetIdx] || { team1Points: 0, team2Points: 0 };

    const newLiveState = {
      ...selectedFixture.live_state,
      team1Score: actSet.team1Points,
      team2Score: actSet.team2Points,
      servingTeam: nextServiceSide,
      activeSet: activeSetIdx,
      sets: restoredSets
    };

    const updatedFixture = {
      ...selectedFixture,
      live_state: newLiveState
    };
    
    setSelectedFixture(updatedFixture);
    setHistory((prev) => prev.slice(0, -1));
    syncLiveState(selectedFixture.id, newLiveState);
  };
  
  const handleFinalize = async () => {
    if (!selectedFixture) return;
    if (!confirm("Are you sure you want to finalize this match? The official score will be recorded and live tracking will end.")) return;
    
    const sets = selectedFixture.live_state?.sets || [];
    let team1MatchScore = 0;
    let team2MatchScore = 0;
    
    sets.forEach((set: any) => {
       if (set.winnerOverrideId) {
          if (set.winnerOverrideId === selectedFixture.team1_id?.toString()) team1MatchScore++;
          else if (set.winnerOverrideId === selectedFixture.team2_id?.toString()) team2MatchScore++;
       } else {
          if (set.team1Points > set.team2Points && set.team1Points >= 25 && set.team1Points - set.team2Points >= 2) team1MatchScore++;
          else if (set.team2Points > set.team1Points && set.team2Points >= 25 && set.team2Points - set.team1Points >= 2) team2MatchScore++;
       }
    });

    const officialScore = {
       sets: sets,
       team1Score: team1MatchScore,
       team2Score: team2MatchScore
    };

    let winner_team_id = null;
    if (team1MatchScore > team2MatchScore) winner_team_id = selectedFixture.team1_id;
    else if (team2MatchScore > team1MatchScore) winner_team_id = selectedFixture.team2_id;

    try {
      const { error } = await supabase
        .from('fixtures')
        .update({ 
          score: officialScore,
          is_live: false,
          live_state: null,
          winner_team_id: winner_team_id,
          status: 'completed' 
        })
        .eq('id', selectedFixture.id);
        
      if (error) throw error;
      alert("Match finalized successfully.");
      setSelectedFixture(null);
      fetchFixtures();
    } catch (err: any) {
      alert("Failed to finalize: " + err.message);
    }
  };

  const handleCloseMatch = async () => {
    if (!selectedFixture) return;
    // We do not finalize, but we mark it as no longer active on the screen.
    // Let's actually keep is_live = true if they just go back, so it stays live in the DB.
    setSelectedFixture(null);
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
                   className="w-full bg-zinc-950 border border-zinc-800 p-4 hover:border-amber-500/50 hover:bg-zinc-900 transition-all flex flex-col items-start gap-4 relative overflow-hidden"
                 >
                    {f.is_live && <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500"></div>}
                    <div className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5">{f.tournaments?.division || 'Court 1'}</span>
                        {f.is_live && <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Live</span>}
                      </div>
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

  const currentSets = selectedFixture.live_state?.sets || [];
  const t1Pts = currentSets[activeSetIdx]?.team1Points || 0;
  const t2Pts = currentSets[activeSetIdx]?.team2Points || 0;
  const t1Name = selectedFixture.team1?.name || "T1";
  const t2Name = selectedFixture.team2?.name || "T2";

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-zinc-950">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-zinc-900 flex items-center justify-between px-4 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-20">
        <button 
          onClick={handleCloseMatch}
          className="h-10 px-3 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
        >
           <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-amber-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Live Syncing</span>
          <span className="text-xs font-bold text-white tracking-widest uppercase">Court Control</span>
        </div>
        <button 
          onClick={handleFinalize}
          className="h-10 px-3 flex items-center justify-center text-black bg-amber-500 hover:bg-amber-400 transition-colors rounded-sm"
        >
           <CheckCircle className="h-4 w-4 mr-2" />
           <span className="text-[10px] font-bold uppercase tracking-widest">Finalize</span>
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
                onClick={() => {
                   setActiveSetIdx(i);
                   if (selectedFixture?.live_state) {
                     const actSet = selectedFixture.live_state.sets?.[i] || { team1Points: 0, team2Points: 0 };
                     const newLiveState = { 
                       ...selectedFixture.live_state, 
                       activeSet: i,
                       team1Score: actSet.team1Points,
                       team2Score: actSet.team2Points
                     };
                     setSelectedFixture({ ...selectedFixture, live_state: newLiveState });
                     syncLiveState(selectedFixture.id, newLiveState);
                   }
                }}
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
                onClick={() => {
                   setServiceSide("t1");
                   if (selectedFixture?.live_state) {
                     const newLiveState = { ...selectedFixture.live_state, servingTeam: "t1" };
                     setSelectedFixture({ ...selectedFixture, live_state: newLiveState });
                     syncLiveState(selectedFixture.id, newLiveState);
                   }
                }}
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
                onClick={() => {
                   setServiceSide("t2");
                   if (selectedFixture?.live_state) {
                     const newLiveState = { ...selectedFixture.live_state, servingTeam: "t2" };
                     setSelectedFixture({ ...selectedFixture, live_state: newLiveState });
                     syncLiveState(selectedFixture.id, newLiveState);
                   }
                }}
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

