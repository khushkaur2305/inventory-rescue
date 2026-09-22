// POST /api/send-sms  -> sends one SMS through Twilio
//
// Body: { "to": "+919876543210", "message": "Hello" }
//
// Reads these from Vercel environment variables (never put them in the HTML):
//   TWILIO_ACCOUNT_SID      the AC... id on your Twilio console home page
//   TWILIO_API_KEY_SID      the SK... id of the API Key you created
//   TWILIO_API_KEY_SECRET   the secret Twilio showed you once, when you made the key
//   TWILIO_FROM_NUMBER      your Twilio phone number, e.g. +12025550123

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

  // Twilio wants a normal HTML form body, not JSON.
  const form = new URLSearchParams({
    To: String(to),
    From: FROM_NUMBER,
    Body: String(message),
  });

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
    return res.status(500).json({ error: data.message || "Twilio rejected the request" });
  }

  return res.status(200).json({ ok: true, sid: data.sid, status: data.status });
}
