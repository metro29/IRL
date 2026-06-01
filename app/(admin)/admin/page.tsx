import { Shield } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";

export default function AdminPage() {
  return (
    <PageShell
      title="Admin"
      description="Platform administration — reserved for global admins."
      status="empty"
      emptyTitle="Admin panel not enabled"
      emptyDescription="Global admin tools will be implemented in a later phase."
      emptyIcon={<Shield className="h-10 w-10 text-primary/60" />}
    />
  );
}
