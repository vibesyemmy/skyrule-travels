/**
 * Rules deciding whether the entry modal may appear.
 *
 * Kept free of DOM access so every rule is unit-testable: the controller reads
 * browser state and hands it in, rather than these functions reaching for
 * window, storage or the clock.
 */

/** Wait before showing, so the modal never interrupts on first paint. */
export const MODAL_DELAY_MS = 4000;

/** Or show earlier once the visitor has scrolled this far — engagement beats a timer. */
export const MODAL_SCROLL_FRACTION = 0.4;

/** How long an explicit dismissal suppresses the promo. */
export const SNOOZE_DAYS = 30;
export const SNOOZE_MS = SNOOZE_DAYS * 24 * 60 * 60 * 1000;

/** Pages where a visitor is already converting and must not be interrupted. */
export const SUPPRESSED_PATHS = ["/contact", "/plan-your-trip"];

export const CONVERTED_KEY = "promo-converted";
export const dismissedKey = (promoId: string) => `promo-dismissed-${promoId}`;
export const shownKey = (promoId: string) => `promo-shown-${promoId}`;

/**
 * Interpret a stored dismissal.
 *
 * Returns the timestamp the dismissal lasts until, or null when there is none.
 * The literal "1" is the flag written by the first version of this feature and
 * means "dismissed permanently" — honoured so nobody who already opted out
 * starts seeing the modal again after this change.
 */
export function parseDismissedUntil(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (raw === "1") return Number.POSITIVE_INFINITY;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isSuppressedPath(path: string): boolean {
  return SUPPRESSED_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

export interface ModalContext {
  /** Current pathname. */
  path: string;
  /** Current time in epoch milliseconds. */
  now: number;
  /** Raw value stored under dismissedKey(promoId), if any. */
  dismissedRaw: string | null;
  /** Whether this promo has already been shown in this browsing session. */
  shownThisSession: boolean;
  /** Whether the visitor has already submitted an enquiry in this session. */
  converted: boolean;
}

/**
 * Whether the modal may be shown at all on this page view.
 *
 * Note this is only the eligibility check — a caller that gets `true` still
 * waits for the delay or scroll trigger before revealing anything.
 */
export function shouldShowModal(context: ModalContext): boolean {
  if (context.converted) return false;
  if (isSuppressedPath(context.path)) return false;
  if (context.shownThisSession) return false;

  const dismissedUntil = parseDismissedUntil(context.dismissedRaw);
  if (dismissedUntil !== null && context.now < dismissedUntil) return false;

  return true;
}

/** Timestamp an explicit dismissal should suppress the promo until. */
export function snoozeUntil(now: number): number {
  return now + SNOOZE_MS;
}
