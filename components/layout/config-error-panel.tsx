import Link from "next/link";
import { AppLogo } from "@/components/layout/logo";

interface ConfigErrorPanelProps {
  title: string;
  message: string;
}

export function ConfigErrorPanel({ title, message }: ConfigErrorPanelProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-6 text-[#f5f2eb]">
      <AppLogo variant="light" className="mb-8" />
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="mt-3 max-w-lg text-center text-sm leading-relaxed text-[#f5f2eb]/60">
        {message}
      </p>
      <ul className="mt-6 max-w-md space-y-2 text-left text-sm text-[#f5f2eb]/50">
        <li>1. Vercel → Settings → Environment Variables</li>
        <li>2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
        <li>3. Supabase → Email ON, Confirm email OFF</li>
        <li>4. Redeploy the project</li>
      </ul>
      <Link
        href="/signup"
        className="mt-8 rounded-lg bg-[#ff7a45] px-5 py-2.5 text-sm font-semibold text-[#0a0a0a]"
      >
        Try signup again
      </Link>
    </div>
  );
}
