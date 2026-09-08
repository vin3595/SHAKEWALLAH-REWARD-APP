// MSG91 Flow API — transactional SMS using a pre-approved DLT template.
// See README "SMS provider setup" for how to get an auth key + template id.
//
// Unconfigured (no MSG91_AUTH_KEY) is a supported state, not an error: the
// app falls back to dev-mode OTP (logged + returned to the caller) so
// local dev and early testing never need a real provider.

const MSG91_FLOW_URL = "https://control.msg91.com/api/v5/flow";

export function isSmsConfigured() {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID);
}

export async function sendOtpSms(phone: string, code: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_OTP_TEMPLATE_ID;
  const countryCode = process.env.MSG91_COUNTRY_CODE ?? "91";

  if (!authKey || !templateId) {
    throw new Error("MSG91 is not configured (MSG91_AUTH_KEY / MSG91_OTP_TEMPLATE_ID missing).");
  }

  const res = await fetch(MSG91_FLOW_URL, {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      short_url: "0",
      recipients: [{ mobiles: `${countryCode}${phone}`, OTP: code }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 send failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { type?: string; message?: string };
  if (data.type !== "success") {
    throw new Error(`MSG91 send failed: ${data.message ?? "unknown error"}`);
  }
}
