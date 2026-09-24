// POST /api/send-sms  -> sends one SMS through Twilio
//
// Body: { "to": "+919876543210", "message": "sms_account_alerts" }
//
// Reads these from Vercel environment variables (never put them in the HTML):
//   TWILIO_ACCOUNT_SID      the AC... id on your Twilio console home page
//   TWILIO_API_KEY_SID      the SK... id of the API Key you created
//   TWILIO_API_KEY_SECRET   the secret Twilio showed you once, when you made the key
//   TWILIO_FROM_NUMBER      your Twilio phone number, e.g. +12025550123
//
// Trial accounts may only send one of Twilio's ready-made templates as the body,
// and From must be the assigned trial number. Custom wording starts working by
// itself once the Twilio account is upgraded — no code change needed.

const TRIAL_TEMPLATES = [
  "sms_2fa",
  "sms_appointment_reminders",
  "sms_order_confirmation",
  "sms_delivery_updates",
  "sms_customer_support",
  "sms_marketing_promotions",
  "sms_event_notifications",
  "sms_account_alerts",
  "sms_feedback_surveys",
  "sms_internal_alerts",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const API_KEY_SID = process.env.TWILIO_API_KEY_SID;
  const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
  const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

  if (!ACCOUNT_SID || !API_KEY_SID || !API_KEY_SECRET || !FROM_NUMBER) {
    return res.status(500).json({
      error:
        "Twilio environment variables are not set. Add TWILIO_ACCOUNT_SID, " +
        "TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET and TWILIO_FROM_NUMBER in " +
        "Vercel (Settings -> Environment Variables), then redeploy.",
    });
  }

  const { to, message } = req.body || {};
  if (!to || !message) {
    return res.status(400).json({ error: "Missing: to, message" });
  }

  // A template name is the only body a trial account accepts; anything else
  // is custom wording, which works once the account is upgraded. From is
  // always required, and on a trial it must be the assigned trial number.
  const isTemplate = TRIAL_TEMPLATES.includes(String(message));

  const fields = { To: String(to), From: FROM_NUMBER, Body: String(message) };

  // Twilio wants a normal HTML form body, not JSON.
  const form = new URLSearchParams(fields);

  // An API Key signs in as: username = SK... sid, password = the key secret.
  const auth = Buffer.from(API_KEY_SID + ":" + API_KEY_SECRET).toString("base64");

  const r = await fetch(
    "https://api.twilio.com/2010-04-01/Accounts/" + ACCOUNT_SID + "/Messages.json",
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );

  const data = await r.json();

  if (!r.ok) {
    // Twilio explains the problem in data.message, e.g. an unverified number.
    // Its numeric code is passed along too, because that is what Twilio's
    // error pages are indexed by.
    let error = data.message || "Twilio rejected the request";
    if (!isTemplate) {
      error +=
        " (Custom wording only works on an upgraded Twilio account. On a trial, " +
        "pick one of the ready-made templates.)";
    }
    return res.status(500).json({ error, twilio_code: data.code || null });
  }

  return res.status(200).json({ ok: true, sid: data.sid, status: data.status });
}
