import { Suspense } from "react";
import { SavingsGoalsContent } from "../_components/SavingsGoalsContent";

export default function SavingsGoalsPage() {
  return <Suspense fallback={null}><SavingsGoalsContent /></Suspense>;
}
