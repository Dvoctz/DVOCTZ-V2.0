import React from 'react'
import { SponsorsManager } from "@/components/admin/sponsors-manager"

export default function AdminSponsors() {
  return (
    <div className="max-w-[1200px] mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Sponsors</h1>
        <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mt-1">
          Manage partner logos and branding
        </p>
      </div>

      <SponsorsManager />
    </div>
  )
}
