export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid api key") || lower.includes("api key")) {
    return "Invalid Supabase API key. Check Vercel env vars and redeploy.";
  }
  if (lower.includes("email not confirmed") || lower.includes("confirm")) {
    return "Turn off email confirmation: Supabase → Authentication → Email → disable Confirm email.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Wrong username or password.";
  }
  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("user already registered")
  ) {
    return "That username is already taken. Sign in instead.";
  }
  if (lower.includes("password")) {
    return message;
  }
  return message;
}
