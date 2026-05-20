import { useState } from "react"
import { TeamsManager } from "@/components/admin/teams-manager"

export default function AdminTeams() {
  const [activeTab, setActiveTab] = useState("Division 1")
  
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <header>
         <p className="text-xs uppercase tracking-[0.3em] text-emerald-500 font-bold mb-3">Athletic Roster</p>
         <h1 className="text-4xl font-black tracking-tighter uppercase italic select-none">
           Teams <span className="text-zinc-800">Manager</span>
         </h1>
      </header>
      
      <div className="flex gap-4 border-b border-zinc-900 pb-px">
        {["Division 1", "Division 2"].map((div) => (
           <button 
             key={div}
             onClick={() => setActiveTab(div)}
             className={`text-xs uppercase tracking-widest font-bold px-6 py-4 border-b-2 transition-colors ${
                activeTab === div 
                ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' 
                : 'border-transparent text-zinc-500 hover:text-white hover:border-zinc-800'
             }`}
           >
             {div}
           </button>
        ))}
      </div>
      
      <div className="space-y-12">
        <TeamsManager filterDivision={activeTab} />
      </div>
    </div>
  )
}
