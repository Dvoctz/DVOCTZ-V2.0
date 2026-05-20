import { useState } from "react"
import { TournamentsManager } from "@/components/admin/tournaments-manager"
import { TournamentTeamsManager } from "@/components/admin/tournament-teams-manager"

export default function AdminTournaments() {
  const [activeTab, setActiveTab] = useState("Division 1")
  
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <header>
         <p className="text-xs uppercase tracking-[0.3em] text-amber-500 font-bold mb-3">Event Operations</p>
         <h1 className="text-4xl font-black tracking-tighter uppercase italic select-none">
           Tournaments <span className="text-zinc-800">Manager</span>
         </h1>
      </header>
      
      <div className="flex gap-4 border-b border-zinc-900 pb-px">
        {["Division 1", "Division 2"].map((div) => (
           <button 
             key={div}
             onClick={() => setActiveTab(div)}
             className={`text-xs uppercase tracking-widest font-bold px-6 py-4 border-b-2 transition-colors ${
                activeTab === div 
                ? 'border-amber-500 text-amber-500 bg-amber-500/5' 
                : 'border-transparent text-zinc-500 hover:text-white hover:border-zinc-800'
             }`}
           >
             {div}
           </button>
        ))}
      </div>
      
      <div className="space-y-12">
        <TournamentsManager filterDivision={activeTab} />
        <TournamentTeamsManager filterDivision={activeTab} />
      </div>
    </div>
  )
}
