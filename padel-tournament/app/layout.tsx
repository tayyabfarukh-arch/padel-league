import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel League",
  description: "Private doubles padel tournament dashboard"
};

const nav = [
  ["Current", "/current"],
  ["History", "/tournaments"],
  ["Teams", "/teams"],
  ["Players", "/players"],
  ["Records", "/records"],
  ["Admin", "/admin"]
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-black text-slate-950">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-950 text-limeball">
                <Trophy className="h-5 w-5" />
              </span>
              Padel League
            </Link>
            <nav className="ml-auto flex gap-1 overflow-x-auto text-sm">
              {nav.map(([label, href]) => (
                <Link key={href} href={href} className="rounded-md px-3 py-2 font-semibold text-slate-600 hover:bg-slate-100">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-5 md:py-8">{children}</main>
      </body>
    </html>
  );
}
