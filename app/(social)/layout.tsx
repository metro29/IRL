import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

export default function SocialGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
