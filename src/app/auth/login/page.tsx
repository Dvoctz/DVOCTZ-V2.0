import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase/client"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
      } else {
        navigate('/admin')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center py-12 px-4 relative selection:bg-amber-500 selection:text-black font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none"></div>
      
      <div className="w-full max-w-[420px] bg-zinc-950 border border-amber-500/30 shadow-[0_0_100px_rgba(0,0,0,0.8)] p-10 relative z-10 ring-8 ring-zinc-950/50">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.4em] text-amber-500 font-bold mb-3">Secure Access</p>
          <h2 className="text-3xl font-bold tracking-tighter italic text-white">COMMAND CENTER</h2>
        </div>
        
        <form className="space-y-8" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-3 font-bold uppercase tracking-widest text-center">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex justify-between items-center">
              Identity Index
            </label>
            <input 
              type="email" 
              placeholder="admin@dvoc.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-amber-500/50 placeholder:text-zinc-700 text-white transition-colors" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex justify-between items-center">
              Authorization Key
            </label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-amber-500/50 text-white transition-colors" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 text-black py-4 text-xs uppercase tracking-widest font-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Initiate Session'}
          </button>
          
          <div className="text-center pt-2">
            <Link to="/" className="text-[10px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors font-bold">
              Forgot Protocol?
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
