import { useSyncExternalStore } from "react";

/** Kenyan numbers saved as 07… become 2547… for wa.me links. */
export function whatsappNumber(raw: string): string { return raw.replace(/[^0-9]/g, "").replace(/^0/, "254"); }
export function whatsappLink(raw: string, message?: string): string {
  const base = `https://wa.me/${whatsappNumber(raw)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
export const DEFAULT_WHATSAPP_MESSAGE = "Hello Scentlyn, I'd like to ask about your products.";
export function productWhatsappMessage(name: string, variant?: string | null): string {
  return `Hello Scentlyn, I'd like to ask about ${name}${variant ? ` (${variant})` : ""}.`;
}

/**
 * Opens the chat in the shopper's own tab. A new tab is deliberately not used:
 * TikTok/Instagram in-app browsers block pop-ups, so a new tab can mean nothing
 * happens at all, and a blocked pop-up leaves the shopper stuck on the shop.
 */
export function openWhatsApp(raw: string, message?: string): void {
  if (typeof window === "undefined") return;
  window.location.href = whatsappLink(raw, message);
}

// Product pages share what the shopper is viewing with the floating chat button.
let current: string | null = null;
const listeners = new Set<() => void>();
export function setWhatsappTopic(message: string | null) { current = message; listeners.forEach((l) => l()); }
export function useWhatsappTopic(): string | null {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => current, () => null);
}
