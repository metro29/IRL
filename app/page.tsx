import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { getSupabaseEnv } from "@/lib/supabase/config";
import {
  DEFAULT_AUTH_REDIRECT,
  DEFAULT_GUEST_REDIRECT,
} from "@/lib/constants/routes";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!getSupabaseEnv()) {
    redirect(DEFAULT_GUEST_REDIRECT);
  }

  const user = await getUser();
  redirect(user ? DEFAULT_AUTH_REDIRECT : DEFAULT_GUEST_REDIRECT);
}
