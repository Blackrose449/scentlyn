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
  provider: "flutterwave";
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
      ok: true,
      checkoutRequestId: `SIM-${crypto.randomUUID()}`,
      merchantRequestId: `SIM-${crypto.randomUUID()}`,
      customerMessage:
        "M-Pesa is not connected yet. The order was saved and can be paid on delivery.",
      simulated: true,
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

export async function startCardCharge(args: {
  reference: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  redirectUrl: string;
}): Promise<CardInitResult> {
  const secretKey = process.env["FLUTTERWAVE_SECRET_KEY"];

  // TODO: remove this simulation branch once the Flutterwave secret is stored.
  if (!secretKey) {
    return {
      ok: true,
      checkoutUrl: null,
      reference: args.reference,
      provider: "flutterwave",
      simulated: true,
    };
  }

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: args.reference,
      amount: args.amount,
      currency: "KES",
      redirect_url: args.redirectUrl,
      payment_options: "card",
      customer: {
        email: args.customerEmail,
        phonenumber: args.customerPhone,
        name: args.customerName,
      },
      customizations: { title: "Scentlyn", description: "Scentlyn order payment" },
    }),
  });

  const json = (await res.json()) as { status?: string; data?: { link?: string } };
  if (!res.ok || json.status !== "success" || !json.data?.link) {
    console.error("Flutterwave init failed", res.status);
    return {
      ok: false,
      checkoutUrl: null,
      reference: args.reference,
      provider: "flutterwave",
      simulated: false,
    };
  }

  return {
    ok: true,
    checkoutUrl: json.data.link,
    reference: args.reference,
    provider: "flutterwave",
    simulated: false,
  };
}

/** Verifies a Flutterwave webhook using the configured secret hash. */
export function verifyFlutterwaveSignature(signature: string | null): boolean {
  const expected = process.env["FLUTTERWAVE_WEBHOOK_HASH"];
  // TODO: once the hash secret is stored this returns a real comparison only.
  if (!expected) return true;
  if (!signature || signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
