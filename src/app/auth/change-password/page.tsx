import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth/login");
      } else {
        setIsReady(true);
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth/login");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;
      
      if (user) {
        // Update the flag in user_profiles
        const { error: profileError } = await supabase
          .from("user_profiles")
          .update({ must_change_password: false })
          .eq("id", user.id);

        if (profileError) throw profileError;

        // Redirect based on role
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "referee" || profile?.role === "player") {
          navigate("/referee");
        } else {
          navigate("/admin");
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center py-12 px-4 relative selection:bg-amber-500 selection:text-black font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none"></div>

      <div className="w-full max-w-[420px] mb-8 relative z-10 flex justify-between items-center">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          Security Update Required
        </span>
        <button
          onClick={handleLogout}
          className="text-[10px] uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors flex items-center font-bold"
        >
          <LogOut className="h-3 w-3 mr-2" />
          Abort & Log Out
        </button>
      </div>

      <div className="w-full max-w-[420px] bg-zinc-950 border border-amber-500/30 shadow-[0_0_100px_rgba(0,0,0,0.8)] p-10 relative z-10 ring-8 ring-zinc-950/50">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tighter italic text-white uppercase">
            Initialize Security
          </h2>
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mt-3">
            Please set a secure personal password to proceed
          </p>
        </div>

        <form className="space-y-6" onSubmit={handlePasswordChange}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] p-3 font-bold uppercase tracking-widest text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex justify-between items-center">
              New Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-amber-500/50 text-white transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex justify-between items-center">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-amber-500/50 text-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-black py-4 text-xs uppercase tracking-widest font-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Secure Account & Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
