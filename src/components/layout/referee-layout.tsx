import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { ShieldAlert } from "lucide-react";

export function RefereeLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth/login");
        return;
      }
      
      const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
      const role = profile?.role || "player";
      
      if (role === "admin" || role === "fixture_manager" || role === "referee" || session.user.email?.includes('admin')) {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-amber-500">
          <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Verifying Referee Access...
          </span>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-4">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold italic tracking-tight text-white mb-2 text-center uppercase">
          Unauthorized Access
        </h1>
        <p className="text-sm text-zinc-500 text-center max-w-md uppercase tracking-widest font-bold">
          You do not have the required permissions to access the Referee Console.
        </p>
        <button 
          onClick={() => navigate("/")}
          className="mt-8 px-6 py-3 border border-zinc-800 text-xs font-bold uppercase hover:bg-zinc-900 transition-colors text-white tracking-widest"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-white selection:bg-amber-500 selection:text-black w-full">
      <main className="flex-1 overflow-x-hidden overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
