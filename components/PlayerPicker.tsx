"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { PlayerAvatar } from "@/components/Avatar";
import type { Player } from "@/lib/types";

type Props = {
  players: Player[];
  label?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  onChange?: (playerId: string) => void;
  getNote?: (player: Player) => string | undefined;
};

export function PlayerPicker({
  players,
  label,
  name,
  value,
  defaultValue = "",
  placeholder = "Choose a player",
  required = true,
  onChange,
  getNote
}: Props) {
  const [internalValue, setInternalValue] = useState(defaultValue || (required ? players[0]?.id ?? "" : ""));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedId = value ?? internalValue;
  const selectedPlayer = players.find((player) => player.id === selectedId);
  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players.filter((player) => !query || player.name.toLowerCase().includes(query));
  }, [players, search]);

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  function choose(playerId: string) {
    if (value === undefined) setInternalValue(playerId);
    onChange?.(playerId);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="relative block" ref={containerRef}>
      {label ? <span className="field-label">{label}</span> : null}
      {name ? <input type="hidden" name={name} value={selectedId} required={required} /> : null}
      <button
        type="button"
        className="field flex min-h-[50px] items-center gap-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selectedPlayer ? <PlayerAvatar player={selectedPlayer} size={36} /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-400">?</span>}
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-bold ${selectedPlayer ? "text-slate-950" : "text-slate-500"}`}>{selectedPlayer?.name ?? placeholder}</span>
          {selectedPlayer && getNote?.(selectedPlayer) ? <span className="block truncate text-xs font-semibold text-slate-500">{getNote(selectedPlayer)}</span> : null}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute z-50 mt-2 w-full min-w-[240px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl">
          <label className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player name" autoFocus />
          </label>
          <div className="max-h-72 overflow-y-auto p-1">
            {!required ? <button type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-bold text-slate-500 hover:bg-slate-50" onClick={() => choose("")}>{placeholder}</button> : null}
            {filteredPlayers.map((player) => (
              <button key={player.id} type="button" className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${player.id === selectedId ? "bg-emerald-50" : "hover:bg-slate-50"}`} onClick={() => choose(player.id)}>
                <PlayerAvatar player={player} size={38} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-950">{player.name}</span>{getNote?.(player) ? <span className="block truncate text-xs font-semibold text-slate-500">{getNote(player)}</span> : null}</span>
                {player.id === selectedId ? <Check className="h-5 w-5 shrink-0 text-court" /> : null}
              </button>
            ))}
            {!filteredPlayers.length ? <p className="p-4 text-center text-sm font-semibold text-slate-500">No matching player found.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
