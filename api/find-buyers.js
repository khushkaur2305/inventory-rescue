// POST /api/find-buyers
//
// Vercel Serverless Function.
// Takes a seller's excess product and returns businesses that want to buy it,
// scored out of 100 and sorted best-first.
//
// Reads two environment variables, set in the Vercel dashboard under
// Settings -> Environment Variables:
//
//   SUPABASE_URL          https://<project-ref>.supabase.co
//   SUPABASE_SECRET_KEY   sb_secret_...  (never appears in the browser)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  // The most likely thing to go wrong is forgetting the variables, or
  // forgetting to redeploy after adding them. Say so plainly.
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(500).json({
      error:
        "Environment variables are not set. Add SUPABASE_URL and " +
        "SUPABASE_SECRET_KEY in Vercel (Settings -> Environment Variables), " +
        "then redeploy.",
    });
  }

  // ---- 1. READ what the seller sent ------------------------------------
  const { product_type, quantity, price_per_unit, city } = req.body || {};

  if (!product_type) {
    return res.status(400).json({ error: "product_type is required" });
  }

  // ---- 2. ASK SUPABASE for buyers who want this product ----------------
  // Embedding businesses(...) follows the business_id foreign key, so the
  // buyer's details come back in the same request.
  const query =
    "?select=quantity_required,max_price,businesses(name,city,contact_email)" +
    "&is_active=eq.true" +
    "&product_type=ilike." + encodeURIComponent(product_type);

  let rows;
  try {
    const response = await fetch(SUPABASE_URL + "/rest/v1/buyer_needs" + query, {
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: "Bearer " + SUPABASE_SECRET_KEY,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(500).json({ error: "Database error: " + detail });
    }

    rows = await response.json();
  } catch (err) {
    return res.status(500).json({ error: "Could not reach Supabase: " + err.message });
  }

  // ---- 3. SCORE each buyer out of 100 ----------------------------------
  const buyers = rows.map((need) => {
    const b = need.businesses;
    let score = 40; // same product
    const reasons = ["Same product"];

    if (price_per_unit <= need.max_price) {
      score += 25;
      reasons.push("Price is within budget");
    }
    if (quantity >= need.quantity_required) {
      score += 20;
      reasons.push("Has enough quantity");
    }
    if (city && b.city.toLowerCase() === city.toLowerCase()) {
      score += 15;
      reasons.push("Same city");
    }

    return {
      business_name: b.name,
      city: b.city,
      contact_email: b.contact_email,
      quantity_required: need.quantity_required,
      max_price: need.max_price,
      match_score: score,
      reasons,
    };
  });

  // ---- 4. SEND BACK, best match first ----------------------------------
  buyers.sort((a, b) => b.match_score - a.match_score);
  return res.status(200).json({ count: buyers.length, buyers });
}
