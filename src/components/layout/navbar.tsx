import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Diamond, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else if (isHome) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  }, [location, isHome]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <nav className="h-16 px-4 md:px-8 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-xl font-bold tracking-tighter flex items-center relative z-50"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Diamond className="h-5 w-5 mr-1.5 text-amber-500" />
            <span className="text-amber-500 mr-1.5">DVOC</span>
            <span className="text-white opacity-90">V2</span>
          </Link>
          <div className="hidden md:flex gap-6 text-xs uppercase tracking-widest text-zinc-400 font-semibold">
            <Link
              to="/"
              className={`${isHome && location.hash === "" ? "text-amber-400 hover:text-amber-300" : "hover:text-white"} transition-colors`}
            >
              Home
            </Link>
            <Link
              to="/live"
              className={`${location.pathname.startsWith("/live") ? "text-amber-400 hover:text-amber-300" : "text-amber-500 hover:text-amber-300"} transition-colors flex items-center gap-1`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              LIVE
            </Link>
            <Link
              to="/tournaments"
              className={`${location.pathname.startsWith("/tournaments") ? "text-amber-400 hover:text-amber-300" : "hover:text-white"} transition-colors`}
            >
              Tournaments
            </Link>
            <Link
              to="/clubs"
              className={`${location.pathname.startsWith("/clubs") ? "text-amber-400 hover:text-amber-300" : "hover:text-white"} transition-colors`}
            >
              Clubs
            </Link>
            <Link
              to="/players"
              className={`${location.pathname.startsWith("/players") ? "text-amber-400 hover:text-amber-300" : "hover:text-white"} transition-colors`}
            >
              Players
            </Link>
            <Link
              to="/transfers"
              className={`${location.pathname.startsWith("/transfers") ? "text-amber-400 hover:text-amber-300" : "hover:text-white"} transition-colors`}
            >
              Transfers
            </Link>
            <Link
              to="/#standings"
              className={`${isHome && location.hash === "#standings" ? "text-amber-400 hover:text-amber-300" : "hover:text-white"} transition-colors`}
            >
              Leaderboard
            </Link>
            <Link
              to="/admin"
              className={`${location.pathname.startsWith("/admin") ? "text-amber-400 hover:text-amber-300" : "hover:text-white"} transition-colors`}
            >
              Admin
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4 relative z-50">
          <Link to="/auth/login" className="hidden md:flex">
            <Button variant="outline">Log In</Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-zinc-950 flex flex-col pt-24 px-6 md:hidden">
          <div className="flex flex-col gap-6">
            <Link
              to="/"
              className={`text-2xl font-black italic tracking-tighter uppercase ${isHome && location.hash === "" ? "text-amber-500" : "text-white"}`}
            >
              Home
            </Link>
            <Link
              to="/live"
              className={`text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2 ${location.pathname.startsWith("/live") ? "text-amber-500" : "text-amber-500/80"}`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              LIVE
            </Link>
            <Link
              to="/tournaments"
              className={`text-2xl font-black italic tracking-tighter uppercase ${location.pathname.startsWith("/tournaments") ? "text-amber-500" : "text-white"}`}
            >
              Tournaments
            </Link>
            <Link
              to="/clubs"
              className={`text-2xl font-black italic tracking-tighter uppercase ${location.pathname.startsWith("/clubs") ? "text-amber-500" : "text-white"}`}
            >
              Clubs
            </Link>
            <Link
              to="/players"
              className={`text-2xl font-black italic tracking-tighter uppercase ${location.pathname.startsWith("/players") ? "text-amber-500" : "text-white"}`}
            >
              Players
            </Link>
            <Link
              to="/transfers"
              className={`text-2xl font-black italic tracking-tighter uppercase ${location.pathname.startsWith("/transfers") ? "text-amber-500" : "text-white"}`}
            >
              Transfers
            </Link>
            <Link
              to="/#standings"
              className={`text-2xl font-black italic tracking-tighter uppercase ${isHome && location.hash === "#standings" ? "text-amber-500" : "text-white"}`}
            >
              Leaderboard
            </Link>
          </div>
          <div className="mt-auto pb-12 flex flex-col gap-4">
            <Link to="/auth/login">
              <Button className="w-full bg-amber-500 text-black uppercase tracking-widest font-black h-14 text-sm hover:bg-amber-400">
                Log In
              </Button>
            </Link>
            <Link to="/admin">
              <Button
                variant="outline"
                className="w-full border-zinc-800 text-white uppercase tracking-widest font-bold h-14 text-xs hover:bg-zinc-900 hover:text-white"
              >
                Admin Access
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
