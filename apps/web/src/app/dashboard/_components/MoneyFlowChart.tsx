"use client";

import styles from "../dashboard.module.css";
import { useEffect, useRef, useState } from "react";

export type MoneyFlowPoint = { label: string; income: number; expense: number };

export function MoneyFlowChart({ points, ariaLabel, smooth = false, showValues = true }: { points: MoneyFlowPoint[]; ariaLabel: string; smooth?: boolean; showValues?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const height = width < 520 ? 190 : 230;
  const left = width < 420 ? 26 : 42;
  const right = width < 420 ? 10 : 14;
  const top = width < 420 ? 14 : 18;
  const bottom = width < 420 ? 34 : 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(1, ...points.flatMap((point) => [point.income, point.expense]));
  const x = (index: number) => points.length <= 1 ? left + plotWidth / 2 : left + (index / (points.length - 1)) * plotWidth;
  const y = (value: number) => top + plotHeight - value / maxValue * plotHeight;
  const makeLine = (value: "income" | "expense") => {
    const coords = points.map((point, index) => ({ x: x(index), y: y(point[value]) }));
    if (!coords.length) return "";
    if (!smooth || coords.length < 3) return coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
    return coords.reduce((path, point, index) => {
      if (index === 0) return `M${point.x},${point.y}`;
      const previous = coords[index - 1]!;
      const beforePrevious = coords[Math.max(0, index - 2)]!;
      const next = coords[Math.min(coords.length - 1, index + 1)]!;
      const controlOneX = previous.x + (point.x - beforePrevious.x) / 6;
      const controlOneY = previous.y + (point.y - beforePrevious.y) / 6;
      const controlTwoX = point.x - (next.x - previous.x) / 6;
      const controlTwoY = point.y - (next.y - previous.y) / 6;
      return `${path} C${controlOneX},${controlOneY} ${controlTwoX},${controlTwoY} ${point.x},${point.y}`;
    }, "");
  };
  const incomeLine = makeLine("income");
  const expenseLine = makeLine("expense");

  return (
    <div className={styles.moneyFlowChart} ref={containerRef}>
      <div className={styles.chartLegend}><span><i className={styles.incomeLegend} />Funds added</span><span><i className={styles.expenseLegend} />Expenses</span></div>
      {points.length ? <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} preserveAspectRatio="none" style={{ height }}>
        {[0, 0.5, 1].map((fraction) => {
          const gridY = top + plotHeight * fraction;
          return <line key={fraction} x1={left} x2={width - right} y1={gridY} y2={gridY} className={styles.chartGridLine} />;
        })}
        <path d={incomeLine} className={styles.incomeLine} />
        <path d={expenseLine} className={styles.expenseLine} />
        {points.map((point, index) => <g key={`${point.label}-${index}`}>
          <circle cx={x(index)} cy={y(point.income)} r="4.5" className={styles.incomePoint}><title>{showValues ? `${point.label}: funds added ₦${point.income.toLocaleString("en-NG")}` : `${point.label}: funds added`}</title></circle>
          <circle cx={x(index)} cy={y(point.expense)} r="4.5" className={styles.expensePoint}><title>{showValues ? `${point.label}: expenses ₦${point.expense.toLocaleString("en-NG")}` : `${point.label}: expenses`}</title></circle>
          <text x={x(index)} y={height - 12} textAnchor="middle" className={styles.chartAxisLabel} style={{ fontSize: width < 420 ? 10 : 12 }}>{point.label}</text>
        </g>)}
      </svg> : <p className={styles.emptyTransactions}>No fund or expense records in this period yet.</p>}
    </div>
  );
}
