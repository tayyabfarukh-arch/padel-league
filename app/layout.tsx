import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarDays, History, Shield, Trophy, Users, Vote } from "lucide-react";
import { FriendCircleSelector } from "@/components/FriendCircleSelector";
import { NavigationLink } from "@/components/NavigationLink";
import { getSelectedFriendCircle } from "@/lib/friend-circle-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel League",
  description: "Private doubles padel tournament dashboard"
};

const nav = [
  ["Active", "/current", CalendarDays],
  ["Predict", "/predictions", Vote],
  ["History", "/tournaments", History],
  ["Teams", "/teams", Shield],
  ["Players", "/players", Users],
  ["Records", "/records", BarChart3],
  ["Admin", "/admin", Trophy]
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const selectedCircle = getSelectedFriendCircle();

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/95 text-white shadow-lg shadow-slate-950/10 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-black text-white">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-limeball text-ink shadow-sm ring-1 ring-white/20">
                <Trophy className="h-5 w-5" />
              </span>
              <span className="hidden sm:inline">Padel League</span>
            </Link>
            <div className="ml-auto md:ml-2">
              <FriendCircleSelector selected={selectedCircle} />
            </div>
            <nav className="ml-auto hidden gap-1 overflow-x-auto text-sm md:flex">
              {nav.map(([label, href, Icon]) => (
                <NavigationLink key={href as string} label={label as string} href={href as string} Icon={Icon} />
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 md:py-8">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-ink/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.2)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-7 gap-1">
              {nav.map(([label, href, Icon]) => (
              <NavigationLink key={href as string} label={label as string} href={href as string} Icon={Icon} mobile />
            ))}
          </div>
        </nav>
      </body>
    </html>
  );
}
