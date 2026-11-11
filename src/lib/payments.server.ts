/**
 * Payment provider integrations (server-only).
 *
 * M-Pesa Daraja and Pesapal (API v3) calls live here. Where real credentials
 * are not yet available the network call is stubbed behind a clearly marked
 * TODO, but the request/response shapes match the live APIs so credentials can
 * be dropped in without restructuring callers.
 *
 * Required Supabase secrets:
 *   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
 *   MPESA_PASSKEY, MPESA_ENV ("sandbox" | "production"), MPESA_CALLBACK_URL
 *   PESAPAL_CONSUMER_KEY, PESAPAL_CONSUMER_SECRET,
 *   PESAPAL_ENV ("sandbox" | "production"), PESAPAL_IPN_ID, PUBLIC_SITE_URL
 */

import { pesapalBillingName } from "./payment-routing";

export type StkPushResult = {
  ok: boolean;
  checkoutRequestId: string | null;
  merchantRequestId: string | null;
  customerMessage: string;
  simulated: boolean;
};

export type CardInitResult = {
  ok: boolean;
  checkoutUrl: string | null;
  reference: string;
  /** Pesapal's own tracking id for the transaction, when available. */
  trackingId: string | null;
  provider: "pesapal";
  simulated: boolean;
};

/** Normalise Kenyan phone input to Daraja's 2547XXXXXXXX format. */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  if (/^254(7|1)\d{8}$/.test(digits)) return digits;
  if (/^0(7|1)\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

function mpesaBaseUrl(): string {
  return process.env["MPESA_ENV"] === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function mpesaTimestamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    p(date.getUTCMonth() + 1),
    p(date.getUTCDate()),
    p(date.getUTCHours()),
    p(date.getUTCMinutes()),
    p(date.getUTCSeconds()),
  ].join("");
}

async function getDarajaToken(key: string, secret: string): Promise<string> {
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(
    `${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  if (!res.ok) throw new Error(`Daraja auth failed (${res.status})`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Daraja auth returned no token");
  return json.access_token;
}

export async function startStkPush(args: {
  phone: string;
  amount: number;
  accountReference: string;
  description: string;
}): Promise<StkPushResult> {
  const key = process.env["MPESA_CONSUMER_KEY"];
  const secret = process.env["MPESA_CONSUMER_SECRET"];
  const shortcode = process.env["MPESA_SHORTCODE"];
  const passkey = process.env["MPESA_PASSKEY"];
  const callbackUrl = process.env["MPESA_CALLBACK_URL"];

  // TODO: remove this simulation branch once Daraja credentials are stored.
  if (!key || !secret || !shortcode || !passkey || !callbackUrl) {
    return {
      ok: false,
      checkoutRequestId: null,
      merchantRequestId: null,
      customerMessage: "M-Pesa is not connected yet. Your order is saved; please retry or choose another payment method.",
      simulated: false,
    };
  }

  const timestamp = mpesaTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const token = await getDarajaToken(key, secret);

  const res = await fetch(`${mpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(args.amount),
      PartyA: args.phone,
      PartyB: shortcode,
      PhoneNumber: args.phone,
      CallBackURL: callbackUrl,
      AccountReference: args.accountReference.slice(0, 12),
      TransactionDesc: args.description.slice(0, 60),
    }),
  });

  const json = (await res.json()) as {
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
    CustomerMessage?: string;
    errorMessage?: string;
  };

  if (!res.ok || !json.CheckoutRequestID) {
    console.error("STK push failed", res.status, json.errorMessage);
    return {
      ok: false,
      checkoutRequestId: null,
      merchantRequestId: null,
      customerMessage: "We could not reach M-Pesa. Please try again.",
      simulated: false,
    };
  }

  return {
    ok: true,
    checkoutRequestId: json.CheckoutRequestID,
    merchantRequestId: json.MerchantRequestID ?? null,
    customerMessage: json.CustomerMessage ?? "Check your phone to complete payment.",
    simulated: false,
  };
}

const PESAPAL_URLS = {
  production: "https://pay.pesapal.com/v3",
  sandbox: "https://cybqa.pesapal.com/pesapalv3",
} as const;
type PesapalMode = keyof typeof PESAPAL_URLS;

/** Read an env value, stripping stray spaces/quotes that get pasted into host dashboards. */
export function cleanEnv(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

function configuredPesapalMode(): PesapalMode {
  const v = cleanEnv("PESAPAL_ENV").toLowerCase();
  return v === "production" || v === "live" || v === "prod" ? "production" : "sandbox";
}

let workingPesapalMode: PesapalMode | null = null;
let cachedIpnId: string | null = null;

function pesapalBaseUrl(): string {
  return PESAPAL_URLS[workingPesapalMode ?? configuredPesapalMode()];
}

export function pesapalCredentials() {
  return { key: cleanEnv("PESAPAL_CONSUMER_KEY"), secret: cleanEnv("PESAPAL_CONSUMER_SECRET") };
}

async function requestPesapalToken(mode: PesapalMode, key: string, secret: string) {
  const res = await fetch(`${PESAPAL_URLS[mode]}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    token?: string;
    error?: { code?: string; message?: string } | null;
  };
  return { token: res.ok ? json.token ?? null : null, status: res.status, code: json.error?.code ?? null };
}

/**
 * Pesapal API v3 bearer token (valid ~5 minutes). If the keys are rejected in the
 * configured mode, the other mode is tried, so live keys with PESAPAL_ENV=sandbox
 * (or the reverse) still work. The mode that worked is remembered.
 */
async function getPesapalToken(key: string, secret: string): Promise<string> {
  const first = workingPesapalMode ?? configuredPesapalMode();
  const firstTry = await requestPesapalToken(first, key, secret);
  if (firstTry.token) {
    workingPesapalMode = first;
    return firstTry.token;
  }
  const other: PesapalMode = first === "production" ? "sandbox" : "production";
  const secondTry = await requestPesapalToken(other, key, secret);
  if (secondTry.token) {
    console.warn(`Pesapal keys only work in ${other} mode; set PESAPAL_ENV=${other} to match.`);
    workingPesapalMode = other;
    cachedIpnId = null;
    return secondTry.token;
  }
  throw new Error(
    `Pesapal auth failed (${first}: ${firstTry.status} ${firstTry.code ?? ""}; ${other}: ${secondTry.status} ${secondTry.code ?? ""})`,
  );
}

/** Health-check helper: reports only whether the keys work and in which mode. */
export async function checkPesapalAuth(): Promise<{ ok: boolean; mode: PesapalMode | null; configuredMode: PesapalMode; detail: string | null }> {
  const { key, secret } = pesapalCredentials();
  const configuredMode = configuredPesapalMode();
  if (!key || !secret) return { ok: false, mode: null, configuredMode, detail: "PESAPAL_CONSUMER_KEY or PESAPAL_CONSUMER_SECRET is missing." };
  try {
    await getPesapalToken(key, secret);
    return { ok: true, mode: workingPesapalMode, configuredMode, detail: null };
  } catch (err) {
    return { ok: false, mode: null, configuredMode, detail: err instanceof Error ? err.message : "unknown error" };
  }
}


/**
 * Resolve a Pesapal IPN id that actually belongs to this Pesapal account.
 * Uses PESAPAL_IPN_ID when Pesapal recognises it; otherwise reuses or registers
 * the IPN for our webhook URL, so a wrong/stale id can't block card checkout.
 */
async function resolvePesapalIpnId(token: string): Promise<string | null> {
  if (cachedIpnId) return cachedIpnId;
  const configured = cleanEnv("PESAPAL_IPN_ID") || null;
  const siteUrl = (cleanEnv("PUBLIC_SITE_URL") || "https://scentlyn.lovable.app").replace(/\/+$/, "");
  const webhookUrl = `${siteUrl}/api/public/payment-webhook`;
  const headers = { Authorization: `Bearer ${token}`, accept: "application/json" };

  try {
    const listRes = await fetch(`${pesapalBaseUrl()}/api/URLSetup/GetIpnList`, { headers });
    const list = (await listRes.json().catch(() => [])) as Array<{ ipn_id?: string; url?: string }>;
    if (Array.isArray(list)) {
      const byId = configured ? list.find((x) => x.ipn_id === configured) : undefined;
      if (byId?.ipn_id) return (cachedIpnId = byId.ipn_id);
      const byUrl = list.find((x) => x.url?.replace(/\/+$/, "") === webhookUrl);
      if (byUrl?.ipn_id) return (cachedIpnId = byUrl.ipn_id);
    }

    const regRes = await fetch(`${pesapalBaseUrl()}/api/URLSetup/RegisterIPN`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, ipn_notification_type: "GET" }),
    });
    const reg = (await regRes.json().catch(() => ({}))) as { ipn_id?: string };
    if (reg.ipn_id) return (cachedIpnId = reg.ipn_id);
    console.error("Pesapal IPN registration failed", regRes.status);
  } catch (err) {
    console.error("Pesapal IPN lookup failed", err instanceof Error ? err.message : "unknown");
  }
  return configured;
}

export async function startCardCharge(args: {
  reference: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  redirectUrl: string;
}): Promise<CardInitResult> {
  const { key, secret } = pesapalCredentials();
  if (!key || !secret) {
    return {
      ok: false,
      checkoutUrl: null,
      reference: args.reference,
      trackingId: null,
      provider: "pesapal",
      simulated: false,
    };
  }

  const token = await getPesapalToken(key, secret);
  const ipnId = await resolvePesapalIpnId(token);
  const billingName = pesapalBillingName(args.customerName);

  const res = await fetch(`${pesapalBaseUrl()}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      id: args.reference,
      currency: "KES",
      amount: args.amount,
      description: `Scentlyn order ${args.reference}`.slice(0, 100),
      callback_url: args.redirectUrl,
      notification_id: ipnId,
      billing_address: {
        email_address: args.customerEmail,
        phone_number: args.customerPhone,
        country_code: "KE",
        line_1: args.customerAddress || "Kenya",
        line_2: "",
        city: "",
        state: "",
        postal_code: "",
        zip_code: "",
        ...billingName,
      },
    }),
  });

  const json = (await res.json()) as {
    order_tracking_id?: string;
    merchant_reference?: string;
    redirect_url?: string;
    status?: string;
    error?: { message?: string } | null;
  };

  if (!res.ok || !json.redirect_url) {
    console.error("Pesapal order submit failed", res.status, json.error?.message);
    return {
      ok: false,
      checkoutUrl: null,
      reference: args.reference,
      trackingId: null,
      provider: "pesapal",
      simulated: false,
    };
  }

  return {
    ok: true,
    checkoutUrl: json.redirect_url,
    reference: json.merchant_reference ?? args.reference,
    trackingId: json.order_tracking_id ?? null,
    provider: "pesapal",
    simulated: false,
  };
}

export type PesapalStatus = {
  ok: boolean;
  paid: boolean;
  statusText: string | null;
  amount: number | null;
  currency: string | null;
  confirmationCode: string | null;
  paymentMethod: string | null;
  merchantReference: string | null;
};

/**
 * Pesapal IPNs carry no signature — they only carry an OrderTrackingId, so the
 * outcome MUST be confirmed by calling GetTransactionStatus server-side.
 */
export async function getPesapalTransactionStatus(
  orderTrackingId: string,
): Promise<PesapalStatus> {
  const { key, secret } = pesapalCredentials();

  const empty: PesapalStatus = {
    ok: false,
    paid: false,
    statusText: null,
    amount: null,
    currency: null,
    confirmationCode: null,
    paymentMethod: null,
    merchantReference: null,
  };

  // TODO: remove once Pesapal credentials are stored; without them we cannot
  // verify an IPN, so nothing is ever marked paid.
  if (!key || !secret) return empty;

  const token = await getPesapalToken(key, secret);
  const res = await fetch(
    `${pesapalBaseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    },
  );

  const json = (await res.json()) as {
    payment_status_description?: string;
    status_code?: number;
    amount?: number;
    currency?: string;
    confirmation_code?: string;
    payment_method?: string;
    merchant_reference?: string;
  };

  if (!res.ok) {
    console.error("Pesapal status lookup failed", res.status);
    return empty;
  }

  return {
    ok: true,
    // status_code 1 = COMPLETED, 2 = FAILED, 0 = INVALID, 3 = REVERSED
    paid:
      json.status_code === 1 ||
      json.payment_status_description?.toUpperCase() === "COMPLETED",
    statusText: json.payment_status_description ?? null,
    amount: typeof json.amount === "number" ? json.amount : null,
    currency: json.currency ?? null,
    confirmationCode: json.confirmation_code ?? null,
    paymentMethod: json.payment_method ?? null,
    merchantReference: json.merchant_reference ?? null,
  };
}
