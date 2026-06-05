import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, CalendarDays, History, Shield, Trophy, Users } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel League",
  description: "Private doubles padel tournament dashboard"
};

const nav = [
  ["Current", "/current", CalendarDays],
  ["History", "/tournaments", History],
  ["Teams", "/teams", Shield],
  ["Players", "/players", Users],
  ["Records", "/records", BarChart3],
  ["Admin", "/admin", Trophy]
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-black text-slate-950">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-limeball shadow-sm">
                <Trophy className="h-5 w-5" />
              </span>
              Padel League
            </Link>
            <nav className="ml-auto hidden gap-1 overflow-x-auto text-sm md:flex">
              {nav.map(([label, href, Icon]) => (
                <Link key={href as string} href={href as string} className="inline-flex items-center gap-2 rounded-md px-3 py-2 font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
                  <Icon className="h-4 w-4" />
                  {label as string}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 md:py-8">{children}</main>
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
            {nav.map(([label, href, Icon]) => (
              <Link key={href as string} href={href as string} className="flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-bold text-slate-600">
                <Icon className="h-4 w-4 text-court" />
                <span className="truncate">{label as string}</span>
              </Link>
            ))}
          </div>
        </nav>
      </body>
    </html>
  );
}
