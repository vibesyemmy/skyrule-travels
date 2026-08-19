/**
 * Whether an address may access the admin. An unset or empty ADMIN_EMAILS
 * allows nobody — failing closed, so a misconfigured deployment locks the
 * admin rather than opening it.
 */
export function isAllowed(email: string, allowlist: string | undefined): boolean {
  const candidate = email.trim().toLowerCase();
  if (!candidate) return false;
  if (!allowlist) return false;

  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(candidate);
}
