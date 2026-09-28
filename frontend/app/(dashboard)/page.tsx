"use client";

import { useMode } from "./ModeContext";
import TournamentOverview from "./components/TournamentOverview";
import LearningOverview from "./components/LearningOverview";

export default function DashboardOverview() {
  const { mode } = useMode();

  return (
    <div>
      {mode === "tournament" ? <TournamentOverview /> : <LearningOverview />}
    </div>
  );
}
