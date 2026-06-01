import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
