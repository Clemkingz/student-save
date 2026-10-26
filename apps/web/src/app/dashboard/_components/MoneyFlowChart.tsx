"use client";

import { useState, type CSSProperties } from "react";
import styles from "./moneyFlowChart.module.css";

export type MoneyFlowPoint = { label: string; income: number; expense: number };

const compactMoney = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });
const money = (value: number) => `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
const safeAmount = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

export function MoneyFlowChart({ points, ariaLabel, showValues = true, highlightIncome = false }: { points: MoneyFlowPoint[]; ariaLabel: string; showValues?: boolean; highlightIncome?: boolean }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const data = points.map((point) => ({ ...point, income: safeAmount(point.income), expense: safeAmount(point.expense) }));
  const highest = Math.max(1, ...data.flatMap((point) => [point.income, point.expense]));
  const magnitude = 10 ** Math.floor(Math.log10(highest));
  const ceiling = Math.ceil(highest / magnitude) * magnitude;
  const active = activeIndex === null ? undefined : data[activeIndex];
  const hasActivity = data.some((point) => point.income > 0 || point.expense > 0);
  const description = (point: MoneyFlowPoint) => showValues
    ? `${point.label}: funds added ${money(point.income)}, expenses ${money(point.expense)}`
    : `${point.label}: funds added and expenses. Amounts hidden.`;

  return (
    <div className={styles.chart} role="group" aria-label={ariaLabel}>
      <div className={styles.legend} aria-hidden="true">
        <span><i className={styles.incomeKey} />Funds added</span>
        <span><i className={styles.expenseKey} />Expenses</span>
      </div>
      {data.length ? <>
        <div className={styles.plot}>
          <div className={styles.axis} aria-hidden="true">
            {[1, .75, .5, .25, 0].map((fraction) => <span key={fraction}>{showValues ? `₦${compactMoney.format(ceiling * fraction)}` : "•••"}</span>)}
          </div>
          <div className={styles.scrollArea}>
            <div className={styles.canvas} style={{ "--columns": data.length, minWidth: data.length * 34 } as CSSProperties}>
              <div className={styles.grid} aria-hidden="true">{[0, 1, 2, 3, 4].map((line) => <i key={line} />)}</div>
              <div className={styles.groups}>
                {data.map((point, index) => <button
                  type="button"
                  key={`${point.label}-${index}`}
                  className={styles.group}
                  aria-label={description(point)}
                  aria-pressed={activeIndex === index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                  onClick={() => setActiveIndex(index)}
                >
                  <span className={styles.bars} aria-hidden="true">
                    <span className={`${styles.bar} ${styles.income}`} style={{ height: `${point.income / ceiling * 100}%`, "--index": index } as CSSProperties} />
                    <span className={`${styles.bar} ${styles.expense}`} style={{ height: `${point.expense / ceiling * 100}%`, "--index": index + .5 } as CSSProperties} />
                  </span>
                  <span className={styles.label} aria-hidden="true">{point.label}</span>
                </button>)}
              </div>
            </div>
          </div>
        </div>
        <p className={styles.detail} aria-live="polite">{active ? showValues ? <>{active.label}: funds added <span className={highlightIncome && active.income > 0 ? "funds-added-amount" : undefined}>+{money(active.income)}</span>, expenses {money(active.expense)}</> : description(active) : hasActivity ? "Select a period to explore funds added and expenses." : "No fund or expense records in this period yet."}</p>
      </> : <p className={styles.detail}>No fund or expense records in this period yet.</p>}
    </div>
  );
}
