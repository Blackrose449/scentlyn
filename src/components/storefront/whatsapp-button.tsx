import { DEFAULT_WHATSAPP_MESSAGE, openWhatsApp, useWhatsappTopic, whatsappLink } from "@/lib/whatsapp";

export function WhatsAppIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.4h-.01a9.4 9.4 0 0 1-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.38 9.38 0 0 1-1.44-5c0-5.18 4.22-9.4 9.41-9.4a9.34 9.34 0 0 1 6.65 2.76 9.34 9.34 0 0 1 2.75 6.65c0 5.19-4.22 9.4-9.4 9.4m8-17.41A11.27 11.27 0 0 0 12.05.67C5.82.67.74 5.74.74 11.97c0 2 .52 3.94 1.51 5.65L.65 23.33l5.85-1.53a11.3 11.3 0 0 0 5.4 1.38h.01c6.23 0 11.3-5.07 11.31-11.3 0-3.02-1.18-5.86-3.31-8"/></svg>;
}

/** Floating chat button; uses the same store WhatsApp number as the footer link. */
export function FloatingWhatsApp({ number }: { number: string }) {
  const topic = useWhatsappTopic();
  const message = topic ?? DEFAULT_WHATSAPP_MESSAGE;
  if (!number) return null;
  return <a href={whatsappLink(number, message)} rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"
    onClick={(event) => { event.preventDefault(); openWhatsApp(number, message); }}
    className="fixed bottom-4 right-4 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring sm:bottom-6 sm:right-6">
    <WhatsAppIcon className="size-8" />
  </a>;
}
