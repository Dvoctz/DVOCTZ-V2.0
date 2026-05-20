import { PlayersManager } from "@/components/admin/players-manager"

export default function AdminPlayers() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <header>
         <p className="text-xs uppercase tracking-[0.3em] text-cyan-500 font-bold mb-3">Player Database</p>
         <h1 className="text-4xl font-black tracking-tighter uppercase italic select-none">
           Athletes <span className="text-zinc-800">Manager</span>
         </h1>
      </header>
      
      <div className="space-y-12">
        <PlayersManager />
      </div>
    </div>
  )
}
