"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { SavingsGoalsContent } from "../../_components/SavingsGoalsContent";

function GoalDetails() {
  const { goalId } = useParams<{ goalId: string }>();
  return <SavingsGoalsContent goalId={goalId} />;
}

export default function GoalDetailPage() {
  return <Suspense fallback={null}><GoalDetails /></Suspense>;
}
