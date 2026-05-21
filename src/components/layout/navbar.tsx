import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { Diamond, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else if (isHome) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [location, isHome])

  return (
    <nav className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm z-50">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-xl font-bold tracking-tighter flex items-center">
          <Diamond className="h-5 w-5 mr-1.5 text-amber-500" />
          <span className="text-amber-500 mr-1.5">DVOC</span>
          <span className="text-white opacity-90">V2</span>
        </Link>
        <div className="hidden md:flex gap-6 text-xs uppercase tracking-widest text-zinc-400 font-semibold">
          <Link to="/" className={`${isHome && location.hash === '' ? 'text-amber-400 hover:text-amber-300' : 'hover:text-white'} transition-colors`}>Home</Link>
          <Link to="/players" className={`${location.pathname.startsWith('/players') ? 'text-amber-400 hover:text-amber-300' : 'hover:text-white'} transition-colors`}>Players</Link>
          <Link to="/#circuits" className={`${isHome && location.hash === '#circuits' ? 'text-amber-400 hover:text-amber-300' : 'hover:text-white'} transition-colors`}>Tournaments</Link>
          <Link to="/#standings" className={`${isHome && location.hash === '#standings' ? 'text-amber-400 hover:text-amber-300' : 'hover:text-white'} transition-colors`}>Leaderboard</Link>
          <Link to="/admin" className={`${location.pathname.startsWith('/admin') ? 'text-amber-400 hover:text-amber-300' : 'hover:text-white'} transition-colors`}>Admin</Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link to="/auth/login" className="hidden md:flex">
          <Button variant="outline">Log In</Button>
        </Link>
        <Button className="hidden md:flex">Join Now</Button>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5 text-white" />
        </Button>
      </div>
    </nav>
  )
}
