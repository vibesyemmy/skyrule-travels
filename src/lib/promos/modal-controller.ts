import {
  shouldShowModal, snoozeUntil, dismissedKey, shownKey, CONVERTED_KEY,
  MODAL_DELAY_MS, MODAL_SCROLL_FRACTION,
} from "./modal-visibility";

/** Storage can throw in private modes or when disabled — never let that break the page. */
function safeGet(store: Storage | undefined, key: string): string | null {
  try { return store?.getItem(key) ?? null; } catch { return null; }
}
function safeSet(store: Storage | undefined, key: string, value: string): void {
  try { store?.setItem(key, value); } catch { /* ignore */ }
}

/** Called by the enquiry forms so a visitor who converted is not pitched again. */
export function markConverted(): void {
  safeSet(window.sessionStorage, CONVERTED_KEY, "1");
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

function scrolledFraction(): number {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 1;
  return window.scrollY / scrollable;
}

/**
 * Wire up an entry-modal element.
 *
 * The element is expected to start hidden. It is revealed only once the
 * visitor has had a chance to look at the page — after a delay, or sooner if
 * they scroll — and at most once per session.
 */
export function initPromoModal(modal: HTMLElement, promoId: string): void {
  const eligible = shouldShowModal({
    path: window.location.pathname,
    now: Date.now(),
    dismissedRaw: safeGet(window.localStorage, dismissedKey(promoId)),
    shownThisSession: safeGet(window.sessionStorage, shownKey(promoId)) === "1",
    converted: safeGet(window.sessionStorage, CONVERTED_KEY) === "1",
  });

  if (!eligible) {
    modal.remove();
    return;
  }

  let opened = false;
  let previouslyFocused: HTMLElement | null = null;

  const dismiss = (): void => {
    safeSet(window.localStorage, dismissedKey(promoId), String(snoozeUntil(Date.now())));
    close();
  };

  const close = (): void => {
    document.removeEventListener("keydown", onKeydown);
    modal.remove();
    // Return focus where the visitor left it, so keyboard users are not dumped
    // at the top of the document.
    previouslyFocused?.focus?.();
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (!opened) return;

    if (event.key === "Escape") {
      event.preventDefault();
      dismiss();
      return;
    }

    if (event.key !== "Tab") return;

    // Focus trap: keep Tab inside the dialog while it is open.
    const focusables = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const open = (): void => {
    if (opened) return;
    opened = true;
    window.clearTimeout(timer);
    window.removeEventListener("scroll", onScroll);

    // Recorded on show, not on dismissal: ignoring the modal must also stop it
    // reappearing on the next page, which is the whole point of the change.
    safeSet(window.sessionStorage, shownKey(promoId), "1");

    previouslyFocused = document.activeElement as HTMLElement | null;
    modal.hidden = false;

    const target = modal.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();
    document.addEventListener("keydown", onKeydown);
  };

  modal.querySelector("[data-promo-dismiss]")?.addEventListener("click", dismiss);

  // Clicking the call to action counts as engagement — do not pitch again.
  modal.querySelector("[data-promo-cta]")?.addEventListener("click", () => {
    safeSet(window.localStorage, dismissedKey(promoId), String(snoozeUntil(Date.now())));
  });

  // Clicking the backdrop, but not the dialog itself, dismisses.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) dismiss();
  });

  const onScroll = (): void => {
    if (scrolledFraction() >= MODAL_SCROLL_FRACTION) open();
  };

  const timer = window.setTimeout(open, MODAL_DELAY_MS);
  window.addEventListener("scroll", onScroll, { passive: true });
}
