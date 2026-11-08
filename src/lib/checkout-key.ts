const CHECKOUT_ATTEMPT_STORAGE_KEY = "scentlyn-checkout-attempt";

type AttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type CheckoutAttempt = { identity: string; key: string };

export function checkoutAttemptKey(
  storage: AttemptStorage,
  identity: string,
  createId: () => string,
): string {
  try {
    const raw = storage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<CheckoutAttempt>;
      if (saved.identity === identity && typeof saved.key === "string") return saved.key;
    }
  } catch {
    // A blocked session store should not stop the customer from checking out.
  }

  const key = createId();
  try {
    storage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify({ identity, key } satisfies CheckoutAttempt));
  } catch {
    // Checkout still works when the browser declines temporary storage.
  }
  return key;
}

export function clearCheckoutAttemptKey(storage: AttemptStorage): void {
  try {
    storage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // The saved order remains authoritative if the browser declines cleanup.
  }
}