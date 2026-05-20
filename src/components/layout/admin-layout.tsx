import { useEffect, useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { AdminSidebar } from "./admin-sidebar"
import { Bell, Search } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export function AdminLayout() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth/login')
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
           <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
           <span className="text-[10px] font-bold uppercase tracking-widest">Verifying Access...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-black text-white selection:bg-amber-500 selection:text-black">
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        <header className="h-20 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm flex items-center px-8 justify-between shrink-0 sticky top-0 z-10">
          <div className="w-full max-w-md flex items-center relative gap-3">
            <Search className="h-5 w-5 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search tournaments, players..." 
              className="w-full bg-transparent border-none text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0" 
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="text-zinc-400 hover:text-white transition-colors relative">
               <Bell className="h-5 w-5" />
               <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-500 border-2 border-black -translate-y-1/2 translate-x-1/2"></span>
            </button>
            <div className="flex items-center gap-3">
               <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold uppercase tracking-widest text-white">Admin</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">System OP</p>
               </div>
               <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 font-bold shrink-0">
                 A
               </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
