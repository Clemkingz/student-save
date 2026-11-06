"use client";

import { useId, useMemo, useState } from "react";
import { coursesForUniversity } from "../../../data/nigerianCourses";
import styles from "../dashboard.module.css";

const otherLabel = "Other / My course isn’t listed";

export function CourseSelect({ university, value, onChange }: { university: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [other, setOther] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 76, maxHeight: 320, above: false });
  const courses = useMemo(() => coursesForUniversity(university), [university]);
  const known = courses.some((course) => course.name === value);
  const custom = other || Boolean(value && !known);
  const search = (query ?? "").toLowerCase();
  const options = courses.filter((course) => `${course.name} ${course.faculty}`.toLowerCase().includes(search));

  function positionMenu(input: HTMLInputElement) {
    const rect = input.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const inset = window.innerWidth <= 900 ? 90 : 16;
    const below = viewportHeight - rect.bottom - inset;
    const above = rect.top - inset;
    const openAbove = below < 200 && above > below;
    setMenuPosition({
      top: input.offsetTop + (openAbove ? -4 : input.offsetHeight + 4),
      maxHeight: Math.max(96, Math.min(320, openAbove ? above : below)),
      above: openAbove,
    });
  }
  function select(name: string | null) {
    setOther(name === null);
    onChange(name ?? "");
    setQuery(null); setOpen(false); setActive(-1);
  }
  function move(index: number) {
    const next = Math.max(0, Math.min(options.length, index));
    setActive(next);
    document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: "nearest" });
  }

  return <div className={`${styles.transactionField} ${styles.universityPicker}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(null); setActive(-1); }
  }}>
    <label htmlFor={`${id}-search`}>Course of study</label>
    <input id={`${id}-search`} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined} autoComplete="off" placeholder="Search your course, e.g. Computer Science" value={query ?? (custom ? otherLabel : value)}
      onFocus={(event) => { positionMenu(event.currentTarget); setOpen(true); setQuery(""); }}
      onChange={(event) => { positionMenu(event.currentTarget); setQuery(event.target.value); setActive(-1); setOpen(true); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); move(active + (event.key === "ArrowDown" ? 1 : -1)); }
        else if (event.key === "Enter" && open) { event.preventDefault(); if (active >= 0) select(options[active]?.name ?? null); }
        else if (event.key === "Escape") { event.preventDefault(); setOpen(false); setQuery(null); setActive(-1); }
      }} />
    {open && <ul id={`${id}-list`} role="listbox" aria-label="Courses" className={styles.universityOptions} style={{ top: menuPosition.top, maxHeight: menuPosition.maxHeight, transform: menuPosition.above ? "translateY(-100%)" : undefined }}>
      {options.map((course, index) => <li key={`${course.faculty}-${course.name}`} id={`${id}-option-${index}`} role="option" aria-selected={course.name === value} data-active={index === active} onMouseDown={(event) => event.preventDefault()} onClick={() => select(course.name)}>
        <strong>{course.name}</strong><small>{course.faculty}</small>
      </li>)}
      <li id={`${id}-option-${options.length}`} role="option" aria-selected={custom} data-active={active === options.length} onMouseDown={(event) => event.preventDefault()} onClick={() => select(null)}>{otherLabel}</li>
    </ul>}
    {open && <span role="status" className={styles.transactionFootnote}>{options.length} matching courses{university ? " offered at this kind of university" : ""}. Use arrow keys to choose.</span>}
    {custom && <><label htmlFor={`${id}-other`}>Enter your course</label><input id={`${id}-other`} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Type the full name of your course" required maxLength={120} /></>}
  </div>;
}
