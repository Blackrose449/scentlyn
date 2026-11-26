import { useSyncExternalStore } from "react";

/** Kenyan numbers saved as 07… become 2547… for wa.me links. */
export function whatsappNumber(raw: string): string { return raw.replace(/[^0-9]/g, "").replace(/^0/, "254"); }
export function whatsappLink(raw: string, message?: string): string {
  const base = `https://wa.me/${whatsappNumber(raw)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
export function whatsappAppLink(raw: string, message?: string): string {
  const base = `whatsapp://send?phone=${whatsappNumber(raw)}`;
  return message ? `${base}&text=${encodeURIComponent(message)}` : base;
}
export const DEFAULT_WHATSAPP_MESSAGE = "Hello Scentlyn, I'd like to ask about your products.";
export function productWhatsappMessage(name: string, variant?: string | null): string {
  return `Hello Scentlyn, I'd like to ask about ${name}${variant ? ` (${variant})` : ""}.`;
}

/**
 * Phones use WhatsApp's native chat link, skipping its web landing page.
 * Desktop keeps the web link, which can hand off to the app or WhatsApp Web.
 * A new tab is deliberately not used: in-app browsers often block pop-ups.
 */
export function openWhatsApp(raw: string, message?: string): void {
  if (typeof window === "undefined") return;
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const touchPoints = typeof navigator === "undefined" ? 0 : navigator.maxTouchPoints;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && touchPoints > 1);
  window.location.href = isMobile ? whatsappAppLink(raw, message) : whatsappLink(raw, message);
}

// Product pages share what the shopper is viewing with the floating chat button.
let current: string | null = null;
const listeners = new Set<() => void>();
export function setWhatsappTopic(message: string | null) { current = message; listeners.forEach((l) => l()); }
export function useWhatsappTopic(): string | null {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => current, () => null);
}
