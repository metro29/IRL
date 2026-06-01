/** Internal auth emails — users only see username + password in the UI. */
export const AUTH_EMAIL_DOMAIN = "users.irl.app";

export function usernameToAuthEmail(username: string): string {
  return `${username}@${AUTH_EMAIL_DOMAIN}`;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}
