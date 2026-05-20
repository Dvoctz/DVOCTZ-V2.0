import { ClubsManager } from "@/components/admin/clubs-manager"

export default function AdminClubs() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto h-full">
      <header>
         <p className="text-xs uppercase tracking-[0.3em] text-red-500 font-bold mb-3">Organization Profiles</p>
         <h1 className="text-4xl font-black tracking-tighter uppercase italic select-none">
           Clubs <span className="text-zinc-800">Manager</span>
         </h1>
      </header>
      
      <div className="space-y-12">
        <ClubsManager />
      </div>
    </div>
  )
}
