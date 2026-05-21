import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { PublicLayout } from "@/components/layout/public-layout"
import { AdminLayout } from "@/components/layout/admin-layout"
import HomePage from "@/app/(public)/page"
import TournamentDetailPage from "@/app/(public)/tournaments/[id]/page"
import PlayerProfilePage from "@/app/(public)/players/[id]/page"
import PlayersDirectoryPage from "@/app/(public)/players/page"
import TransfersPage from "@/app/(public)/transfers/page"
import TournamentsArchivePage from "@/app/(public)/tournaments/page"
import AdminOverview from "@/app/admin/page"
import AdminTournaments from "@/app/admin/tournaments/page"
import AdminTeams from "@/app/admin/teams/page"
import AdminPlayers from "@/app/admin/players/page"
import AdminFixtures from "@/app/admin/fixtures/page"
import AdminClubs from "@/app/admin/clubs/page"
import AdminSponsors from "@/app/admin/sponsors/page"
import LoginPage from "@/app/auth/login/page"

const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "/players", element: <PlayersDirectoryPage /> },
      { path: "/transfers", element: <TransfersPage /> },
      { path: "/tournaments", element: <TournamentsArchivePage /> },
      { path: "/tournaments/:id", element: <TournamentDetailPage /> },
      { path: "/players/:id", element: <PlayerProfilePage /> }
    ]
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminOverview /> },
      { path: "tournaments", element: <AdminTournaments /> },
      { path: "teams", element: <AdminTeams /> },
      { path: "players", element: <AdminPlayers /> },
      { path: "fixtures", element: <AdminFixtures /> },
      { path: "clubs", element: <AdminClubs /> },
      { path: "sponsors", element: <AdminSponsors /> }
    ]
  },
  {
    path: "/auth/login",
    element: <LoginPage />
  }
])

export default function App() {
  return <RouterProvider router={router} />
}
