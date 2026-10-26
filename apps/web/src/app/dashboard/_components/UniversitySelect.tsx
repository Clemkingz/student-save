"use client";

import { useId, useState } from "react";
import { nigerianUniversities } from "../../../data/nigerianUniversities";
import styles from "../dashboard.module.css";

const otherValue = "__other__";
export function UniversitySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [other, setOther] = useState(false);
  const known = nigerianUniversities.some(school => school.name === value);
  const custom = other || Boolean(value && !known);
  const matches = nigerianUniversities.filter(school => `${school.name} ${school.abbreviation ?? ""}`.toLowerCase().includes((query ?? "").toLowerCase()));
  const options = ["Federal", "State", "Private"].flatMap(type => matches.filter(school => school.type === type));
  function select(name: string) {
    setOther(name === otherValue);
    onChange(name === otherValue ? "" : name);
    setQuery(null); setOpen(false); setActive(-1);
  }
  function move(index: number) {
    const next = Math.max(0, Math.min(options.length, index));
    setActive(next);
    document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: "nearest" });
  }
  return <div className={`${styles.transactionField} ${styles.universityPicker}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(null); setActive(-1); }
  }}>
    <label htmlFor={`${id}-search`}>Name of institution</label>
    <input id={`${id}-search`} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined} autoComplete="off" placeholder="Search university or abbreviation" value={query ?? (custom ? "Other / My school isn’t listed" : value)}
      onFocus={() => { setOpen(true); setQuery(""); }}
      onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); move(active + (event.key === "ArrowDown" ? 1 : -1)); }
        else if (event.key === "Enter" && open) { event.preventDefault(); if (active >= 0) select(options[active]?.name ?? otherValue); }
        else if (event.key === "Escape") { event.preventDefault(); setOpen(false); setQuery(null); setActive(-1); }
      }} />
    {open && <ul id={`${id}-list`} role="listbox" aria-label="Nigerian universities" className={styles.universityOptions}>
      {options.map((school, index) => <li key={`${school.type}-${school.name}`} id={`${id}-option-${index}`} role="option" aria-selected={school.name === value} data-active={index === active} onMouseDown={event => event.preventDefault()} onClick={() => select(school.name)}>
        <strong>{school.name}</strong><small>{school.type}{school.abbreviation ? ` · ${school.abbreviation}` : ""}</small>
      </li>)}
      <li id={`${id}-option-${options.length}`} role="option" aria-selected={custom} data-active={active === options.length} onMouseDown={event => event.preventDefault()} onClick={() => select(otherValue)}>Other / My school isn’t listed</li>
    </ul>}
    {open && <span role="status" className={styles.transactionFootnote}>{matches.length} matching universities. Use arrow keys to choose.</span>}
    {custom && <><label htmlFor={`${id}-other`}>Enter your institution</label><input id={`${id}-other`} value={value} onChange={event => onChange(event.target.value)} required maxLength={200} /></>}
    {/* The selected name remains the backend-compatible institution string. */}
    <input type="hidden" name="institution" value={value} />
  </div>;
}
