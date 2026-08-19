import type { Placement, Promo } from "./schema";

/**
 * Whether a promo should be showing at `now`. The start boundary is inclusive
 * and the end boundary exclusive, so a promo ending at 23:00 is gone at 23:00
 * exactly rather than lingering for that second.
 */
export function isLive(promo: Promo, now: Date): boolean {
  if (!promo.enabled) return false;
  if (promo.startsAt && now.getTime() < new Date(promo.startsAt).getTime()) return false;
  if (promo.endsAt && now.getTime() >= new Date(promo.endsAt).getTime()) return false;
  return true;
}

/**
 * The single live promo for a placement, or null. One-per-placement is enforced
 * when saving, so this can return the first match without tie-breaking.
 */
export function activeFor(promos: Promo[], placement: Placement, now: Date): Promo | null {
  return promos.find((p) => p.placement === placement && isLive(p, now)) ?? null;
}
