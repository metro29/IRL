import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { DEFAULT_AUTH_REDIRECT, DEFAULT_GUEST_REDIRECT } from "@/lib/constants/routes";

export default async function HomePage() {
  const user = await getUser();
  redirect(user ? DEFAULT_AUTH_REDIRECT : DEFAULT_GUEST_REDIRECT);
}
