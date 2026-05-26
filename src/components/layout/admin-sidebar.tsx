import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Trophy,
  Users,
  LayoutDashboard,
  LogOut,
  Flag,
  UserSquare2,
  CalendarDays,
  Shield,
  Briefcase,
  PlaySquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Trophy, label: "Tournaments", href: "/admin/tournaments" },
  { icon: Shield, label: "Clubs", href: "/admin/clubs" },
  { icon: Flag, label: "Teams", href: "/admin/teams" },
  { icon: UserSquare2, label: "Players", href: "/admin/players" },
  { icon: CalendarDays, label: "Fixtures", href: "/admin/fixtures" },
  { icon: Briefcase, label: "Sponsors", href: "/admin/sponsors" },
  { icon: Users, label: "Officials", href: "/admin/officials" },
];

export function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminOrRef, setIsAdminOrRef] = useState(false);
  const [userRole, setUserRole] = useState("admin");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        const role = profile?.role || "player";
        setUserRole(role);
        if (role === "admin" || role === "fixture_manager" || session.user.email?.includes('admin')) {
          setIsAdminOrRef(true);
        }
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  const filteredNavItems = navItems.filter((item) => {
    if (userRole === "admin") return true;
    if (userRole === "fixture_manager") {
      return item.href === "/admin" || item.href === "/admin/tournaments" || item.href === "/admin/fixtures";
    }
    return false;
  });

  return (
    <aside className="w-64 border-r border-zinc-900 bg-zinc-950 p-6 flex flex-col gap-8 h-full shrink-0 overflow-y-auto">
      <div>
        <Link
          to="/"
          className="text-2xl font-bold tracking-tighter flex items-center mb-8"
        >
          <span className="text-amber-500 mr-1.5">DVOC</span>
          <span className="text-white opacity-90">ADMIN</span>
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-4 font-semibold">
          Administration
        </p>
        <ul className="space-y-4">
          {filteredNavItems.map((item, i) => {
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/admin" &&
                location.pathname.startsWith(item.href));
            return (
              <li key={i}>
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 text-sm group cursor-pointer transition-colors",
                    isActive
                      ? "text-white font-medium"
                      : "text-zinc-400 hover:text-white",
                  )}
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      isActive
                        ? "bg-amber-500"
                        : "bg-zinc-800 group-hover:bg-amber-500 transition-colors",
                    )}
                  ></div>
                  <item.icon
                    className={cn(
                      "h-4 w-4",
                      isActive
                        ? "text-amber-500"
                        : "group-hover:text-amber-500 transition-colors",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          {isAdminOrRef && (
            <li key="referee-console" className="mt-8">
              <Link
                to="/referee"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 text-sm group cursor-pointer transition-colors",
                  location.pathname === "/referee" || location.pathname.startsWith("/referee")
                    ? "text-amber-500 font-bold"
                    : "text-zinc-400 hover:text-amber-500",
                )}
              >
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    location.pathname === "/referee" || location.pathname.startsWith("/referee")
                      ? "bg-amber-500"
                      : "bg-zinc-800 group-hover:bg-amber-500 transition-colors",
                  )}
                ></div>
                <PlaySquare
                  className={cn(
                    "h-4 w-4",
                    location.pathname === "/referee" || location.pathname.startsWith("/referee")
                      ? "text-amber-500"
                      : "group-hover:text-amber-500 transition-colors",
                  )}
                />
                <span>Referee Console</span>
              </Link>
            </li>
          )}
        </ul>
      </div>
      <div className="mt-auto flex flex-col gap-6">
        <div className="p-4 rounded-none bg-gradient-to-br from-zinc-900 to-black border border-zinc-800">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-bold mb-1 line-clamp-1">
            Data Systems
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
            Powered by ZAP Group Of Companies
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-sm text-zinc-500 hover:text-white transition-colors group text-left w-full"
        >
          <LogOut className="h-4 w-4 group-hover:text-amber-500 transition-colors" />
          <span className="font-medium">Exit Admin</span>
        </button>
      </div>
    </aside>
  );
}
