import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_WHATSAPP_MESSAGE,
  openWhatsApp,
  productWhatsappMessage,
  whatsappAppLink,
  whatsappLink,
  whatsappNumber,
} from "./whatsapp";

const TIKTOK_UA =
  "Mozilla/5.0 (Linux; Android 13; SM-A125F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Musically 31.5.0";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test("store number 0794966965 becomes web and direct-app chat links", () => {
  assert.equal(whatsappNumber("0794966965"), "254794966965");
  assert.equal(whatsappLink("0794966965"), "https://wa.me/254794966965");
  assert.equal(whatsappAppLink("0794966965"), "whatsapp://send?phone=254794966965");
  assert.equal(
    whatsappLink("0794966965", "Hello Scentlyn, I'd like to ask about your products."),
    "https://wa.me/254794966965?text=Hello%20Scentlyn%2C%20I'd%20like%20to%20ask%20about%20your%20products.",
  );
  assert.equal(
    whatsappAppLink("0794966965", "Hello Scentlyn, I'd like to ask about your products."),
    "whatsapp://send?phone=254794966965&text=Hello%20Scentlyn%2C%20I'd%20like%20to%20ask%20about%20your%20products.",
  );
});

test("product chat message names the product and its chosen option", () => {
  assert.equal(
    productWhatsappMessage("Lenor Spring Awakening", "1L"),
    "Hello Scentlyn, I'd like to ask about Lenor Spring Awakening (1L).",
  );
  assert.equal(
    productWhatsappMessage("Lenor Spring Awakening", null),
    "Hello Scentlyn, I'd like to ask about Lenor Spring Awakening.",
  );
  assert.equal(DEFAULT_WHATSAPP_MESSAGE, "Hello Scentlyn, I'd like to ask about your products.");
});

test("phone presses use the direct app link and desktop uses the web link", () => {
  const cases = [
    { ua: TIKTOK_UA, touchPoints: 5, expected: "whatsapp://send?phone=254794966965&text=Hello%20from%20TikTok" },
    { ua: IPHONE_UA, touchPoints: 5, expected: "whatsapp://send?phone=254794966965&text=Hello%20from%20TikTok" },
    { ua: DESKTOP_UA, touchPoints: 0, expected: "https://wa.me/254794966965?text=Hello%20from%20TikTok" },
  ];
  for (const { ua, touchPoints, expected } of cases) {
    const navigated: string[] = [];
    const opened: string[] = [];
    const win = {
      location: { href: "" },
      open: (url: string) => {
        opened.push(url);
        return { closed: false };
      },
    };
    const previousWindow = (globalThis as { window?: unknown }).window;
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "window", { value: win, configurable: true, writable: true });
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent: ua, maxTouchPoints: touchPoints },
      configurable: true,
    });
    try {
      openWhatsApp("0794966965", "Hello from TikTok");
      navigated.push(win.location.href);
    } finally {
      Object.defineProperty(globalThis, "window", { value: previousWindow, configurable: true, writable: true });
      if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
      else delete (globalThis as { navigator?: unknown }).navigator;
    }
    assert.deepEqual(opened, [], `${ua.slice(0, 24)}… must not depend on a pop-up`);
    assert.equal(navigated[0], expected);
  }
});
