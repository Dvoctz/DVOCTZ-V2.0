import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";

export function PublicLayout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950 text-white selection:bg-amber-500 selection:text-black">
      <Navbar />
      <main className="flex-1 flex flex-col bg-black">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold space-y-2">
        <p>Dar es Salaam Volleyball Overlook Committee</p>
        <p>&copy; 2026 DVOC. All rights reserved.</p>
      </footer>
    </div>
  );
}
