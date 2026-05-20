import { Link } from "react-router-dom"
import { Diamond, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <nav className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm z-50">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold tracking-tighter flex items-center">
          <Diamond className="h-5 w-5 mr-1.5 text-amber-500" />
          <span className="text-amber-500 mr-1.5">DVOC</span>
          <span className="text-white opacity-90">V2</span>
        </span>
        <div className="hidden md:flex gap-6 text-xs uppercase tracking-widest text-zinc-400 font-semibold">
          <Link to="/" className="text-amber-400 hover:text-amber-300 transition-colors">Home</Link>
          <Link to="/" className="hover:text-white transition-colors">Tournaments</Link>
          <Link to="/" className="hover:text-white transition-colors">Leaderboard</Link>
          <Link to="/admin" className="hover:text-white transition-colors">Admin</Link>
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
