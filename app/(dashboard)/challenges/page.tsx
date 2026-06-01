import { Target } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";

export default function ChallengesPage() {
  return (
    <PageShell
      title="Challenges"
      description="Complete real-world challenges during events to earn points and XP."
      status="empty"
      emptyTitle="No challenges yet"
      emptyDescription="Challenges unlock when your group schedules events."
      emptyIcon={<Target className="h-10 w-10 text-primary/60" />}
    />
  );
}
