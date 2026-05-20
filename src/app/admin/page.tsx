import { useEffect, useState } from "react"
import { ArrowUpRight, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function AdminOverview() {
  const [supabaseStatus, setSupabaseStatus] = useState<'testing' | 'connected' | 'failed'>('testing')

  useEffect(() => {
    async function testConnection() {
      try {
        const { error } = await supabase.from('tournaments').select('*').limit(1)
        if (error) {
          if (error.code === '42P01') {
            setSupabaseStatus('connected')
          } else {
             console.error("Supabase connection test failed:", error)
             setSupabaseStatus('failed')
          }
        } else {
          setSupabaseStatus('connected')
        }
      } catch (err) {
        console.error("Supabase connection exception:", err)
        setSupabaseStatus('failed')
      }
    }
    testConnection()
  }, [])

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto">
      <header className="relative flex justify-between items-start">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-500 font-bold mb-3">Command Center</p>
          <h1 className="text-5xl font-black tracking-tighter leading-[0.85] uppercase italic select-none">
            Platform<br/><span className="text-zinc-800">Intelligence</span>
          </h1>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 p-4 shrink-0 flex items-center gap-3">
          {supabaseStatus === 'testing' && (
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="w-3 h-3 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Testing Connection...</span>
            </div>
          )}
          {supabaseStatus === 'connected' && (
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Supabase Connected</span>
            </div>
          )}
          {supabaseStatus === 'failed' && (
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Connection Failed</span>
            </div>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-none flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Total Prize Pool</p>
          <p className="text-3xl font-light text-amber-100 italic tracking-tight mb-2">$2,450,000</p>
          <div className="h-1 w-12 bg-amber-500 mt-auto"></div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-none flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2 flex justify-between items-center">
            Active Athletes
            <span className="text-amber-500 flex items-center"><ArrowUpRight className="h-3 w-3 mr-0.5"/> 8%</span>
          </p>
          <p className="text-3xl font-light text-white italic tracking-tight mb-2">12,842</p>
          <div className="h-1 w-12 bg-zinc-700 mt-auto"></div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-none flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold mb-2">Media Coverage</p>
          <p className="text-3xl font-light text-white italic tracking-tight mb-2">Global 4K</p>
          <div className="h-1 w-12 bg-zinc-700 mt-auto"></div>
        </div>
      </section>
    </div>
  )
}
