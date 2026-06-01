import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

export const dynamic = "force-dynamic";

export default function SocialGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
