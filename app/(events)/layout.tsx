import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

export default function EventsGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
