import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Search, Save, ShieldAlert, Award, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminOfficials() {
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [role, setRole] = useState("player");
  const [teamId, setTeamId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("user_profiles")
        .select(`
          id,
          full_name,
          email,
          role,
          team_id,
          teams (
            id,
            name
          )
        `)
        .order("full_name");

      if (usersError) throw usersError;

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("id, name")
        .order("name");

      if (teamsError) throw teamsError;

      setUsers(usersData || []);
      setTeams(teamsData || []);
    } catch (err: any) {
      console.error("Error fetching officials data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setRole(user.role || "player");
    setTeamId(user.team_id);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = async (userId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          role: role,
          team_id: teamId || null,
        })
        .eq("id", userId);

      if (error) throw error;
      
      setEditingId(null);
      await fetchData();
    } catch (err: any) {
      console.error("Error updating user:", err);
      alert("Failed to update user. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.full_name?.toLowerCase().includes(search.toLowerCase()) || 
     user.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Officials Management</h1>
        <p className="text-zinc-400">Manage referee roles, fixture managers, and team assignments.</p>
      </div>

      <div className="flex items-center gap-4 bg-zinc-950 p-4 border border-zinc-900">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full bg-zinc-900 border border-zinc-800 text-white p-2 pl-10 focus:outline-none focus:border-amber-500 font-mono text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left col-span-full">
            <thead>
              <tr className="border-b border-zinc-900">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest w-[250px]">User</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest w-[200px]">Role</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest w-[250px]">Officiating Team</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    <div className="animate-pulse flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500 font-mono text-sm">
                    No users found matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-900/20 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm">{user.full_name || "Unknown User"}</span>
                        <span className="text-xs text-zinc-500 font-mono">{user.email}</span>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      {editingId === user.id ? (
                        <select
                          className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 text-sm focus:outline-none focus:border-amber-500"
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                        >
                          <option value="player">Player (Default)</option>
                          <option value="referee">Referee</option>
                          <option value="fixture_manager">Fixture Manager</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' && <ShieldAlert className="h-3.5 w-3.5 text-red-500" />}
                          {user.role === 'fixture_manager' && <Award className="h-3.5 w-3.5 text-blue-500" />}
                          {user.role === 'referee' && <Shield className="h-3.5 w-3.5 text-amber-500" />}
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            user.role === 'admin' ? "text-red-400" :
                            user.role === 'fixture_manager' ? "text-blue-400" :
                            user.role === 'referee' ? "text-amber-400" :
                            "text-zinc-500"
                          )}>
                            {user.role || 'Player'}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      {editingId === user.id ? (
                        <select
                          className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 text-sm focus:outline-none focus:border-amber-500"
                          value={teamId || ""}
                          onChange={(e) => setTeamId(e.target.value || null)}
                          disabled={role === "admin" || role === "fixture_manager"}
                        >
                          <option value="">No Team Assigned</option>
                          {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={cn(
                          "text-sm font-medium",
                          user.teams?.name ? "text-zinc-300" : "text-zinc-600 italic"
                        )}>
                          {user.teams?.name || "None"}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {editingId === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(user.id)}
                            disabled={saving}
                            className="bg-amber-500 text-black px-3 py-1.5 text-xs font-bold hover:bg-amber-400 uppercase tracking-wider flex items-center gap-1"
                          >
                            {saving ? "Saving..." : <><Save className="h-3.5 w-3.5" /> Save</>}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-amber-500 hover:text-amber-400 text-xs font-bold uppercase tracking-wider px-3 py-1.5 border border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 transition-colors"
                        >
                          Edit Role
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
