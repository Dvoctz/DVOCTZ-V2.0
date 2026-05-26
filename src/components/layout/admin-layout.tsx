import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AdminSidebar } from "./admin-sidebar";
import { Search, Menu, X, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState("admin");
  const [userProfile, setUserProfile] = useState<any>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth/login");
        return;
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name, email, must_change_password')
        .eq('id', session.user.id)
        .single();

      if (profile?.must_change_password) {
        navigate("/auth/change-password");
        return;
      }

      const role = profile?.role || "player";
      setUserRole(role);
      setUserProfile(profile);

      if (role === "referee" || role === "player") {
        navigate("/referee");
        return;
      }

      if (role === "fixture_manager") {
        const allowedPaths = ["/admin/fixtures", "/admin/tournaments", "/admin"];
        const isAllowed = allowedPaths.some(p => location.pathname === p || location.pathname.startsWith(`${p}/`));
        if (!isAllowed && location.pathname !== "/admin") {
          navigate("/admin/fixtures");
          return;
        }
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        navigate("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name, email, must_change_password')
        .eq('id', session.user.id)
        .single();

      if (profile?.must_change_password) {
        navigate("/auth/change-password");
        return;
      }

      const role = profile?.role || "player";
      setUserRole(role);
      setUserProfile(profile);

      if (role === "referee" || role === "player") {
        navigate("/referee");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Verifying Access...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-black text-white selection:bg-amber-500 selection:text-black w-full">
      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="relative w-64 max-w-full bg-zinc-950 flex flex-col z-50 h-full border-r border-zinc-800">
               <button onClick={() => setMobileMenuOpen(false)} className="absolute top-6 right-4 text-zinc-500 hover:text-white z-50 bg-black/50 p-1 rounded-full backdrop-blur-md">
                 <X className="h-6 w-6" />
               </button>
               <AdminSidebar onClose={() => setMobileMenuOpen(false)} />
            </div>
        </div>
      )}

      <div className="hidden md:flex">
        <AdminSidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden relative">
        <header className="h-16 md:h-20 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm flex items-center px-4 md:px-8 justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-white hover:text-amber-500 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          <div className="w-full max-w-md flex items-center relative gap-3 ml-4 md:ml-0">
            <Search className="h-4 w-4 md:h-5 md:w-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent border-none text-xs md:text-sm font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center justify-center p-2 text-zinc-500 hover:text-white transition-colors"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold uppercase tracking-widest text-white">
                    {userProfile?.full_name || userProfile?.email || "System OP"}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {userRole.replace('_', ' ')}
                  </p>
                </div>
                <button onClick={handleLogout} className="md:hidden flex items-center justify-center text-zinc-500 hover:text-white mr-1" title="Log Out">
                   <LogOut className="h-4 w-4" />
                </button>
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 font-bold shrink-0 text-sm md:text-base">
                  {(userProfile?.full_name?.charAt(0) || userProfile?.email?.charAt(0) || "O").toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
