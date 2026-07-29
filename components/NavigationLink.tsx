"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, CalendarDays, History, Shield, Trophy, Users, Vote } from "lucide-react";

const navigationIcons = {
  chart: BarChart3,
  calendar: CalendarDays,
  upcoming: CalendarClock,
  history: History,
  shield: Shield,
  trophy: Trophy,
  users: Users,
  vote: Vote
};

export type NavigationIconName = keyof typeof navigationIcons;

export function NavigationLink({
  label,
  href,
  icon,
  mobile = false
}: {
  label: string;
  href: string;
  icon: NavigationIconName;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/current" && pathname.startsWith(`${href}/`));
  const Icon = navigationIcons[icon];

  if (mobile) {
    return (
      <Link
        href={href}
        className={`flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-black transition ${
          active ? "bg-limeball text-ink" : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className={`h-4 w-4 ${active ? "text-court" : "text-slate-400"}`} />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-black transition ${
        active
          ? "bg-limeball text-ink shadow-sm"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
