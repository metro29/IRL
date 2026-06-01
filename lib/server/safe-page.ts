/**
 * Wrap server page data loaders — surfaces DB errors as PageShell error state.
 */
export async function safePageLoad<T>(
  fn: () => Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Something went wrong loading this page.";
    return { data: null, error: message };
  }
}
