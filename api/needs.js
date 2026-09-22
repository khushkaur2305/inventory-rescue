// GET  /api/needs   -> list every active buyer need
// POST /api/needs   -> add a new buyer need (creates the business if needed)
//
// Reads SUPABASE_URL and SUPABASE_SECRET_KEY from Vercel environment variables.

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return res.status(500).json({
      error:
        "Environment variables are not set. Add SUPABASE_URL and " +
        "SUPABASE_SECRET_KEY in Vercel (Settings -> Environment Variables), " +
        "then redeploy.",
    });
  }

  const headers = {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: "Bearer " + SUPABASE_SECRET_KEY,
    "Content-Type": "application/json",
  };

  // ---------------- LIST ----------------
  if (req.method === "GET") {
    const query =
      "?select=product_type,quantity_required,max_price,businesses(name,city)" +
      "&is_active=eq.true" +
      "&order=product_type.asc";

    const r = await fetch(SUPABASE_URL + "/rest/v1/buyer_needs" + query, { headers });
    if (!r.ok) return res.status(500).json({ error: "Database error: " + (await r.text()) });

    const rows = await r.json();
    const needs = rows.map((n) => ({
      product_type: n.product_type,
      quantity_required: n.quantity_required,
      max_price: n.max_price,
      business_name: n.businesses ? n.businesses.name : "Unknown",
      city: n.businesses ? n.businesses.city : "",
    }));

    return res.status(200).json({ count: needs.length, needs });
  }

  // ---------------- CREATE ----------------
  if (req.method === "POST") {
    const { business_name, city, contact_email, product_type, quantity_required, max_price } =
      req.body || {};

    const missing = [];
    if (!business_name) missing.push("business_name");
    if (!city) missing.push("city");
    if (!contact_email) missing.push("contact_email");
    if (!product_type) missing.push("product_type");
    if (!quantity_required) missing.push("quantity_required");
    if (!max_price) missing.push("max_price");

    if (missing.length) {
      return res.status(400).json({ error: "Missing: " + missing.join(", ") });
    }

    // Reuse the business if this name already exists, so adding a second
    // need for the same shop does not create a duplicate business row.
    const lookup = await fetch(
      SUPABASE_URL + "/rest/v1/businesses?select=id&name=eq." + encodeURIComponent(business_name),
      { headers },
    );
    if (!lookup.ok) return res.status(500).json({ error: "Database error: " + (await lookup.text()) });

    let existing = await lookup.json();
    let businessId;

    if (existing.length > 0) {
      businessId = existing[0].id;
    } else {
      const created = await fetch(SUPABASE_URL + "/rest/v1/businesses", {
        method: "POST",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ name: business_name, city, contact_email }),
      });
      if (!created.ok) return res.status(500).json({ error: "Could not add business: " + (await created.text()) });
      businessId = (await created.json())[0].id;
    }

    const need = await fetch(SUPABASE_URL + "/rest/v1/buyer_needs", {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        business_id: businessId,
        product_type: String(product_type).toLowerCase(),
        quantity_required: Number(quantity_required),
        max_price: Number(max_price),
        is_active: true,
      }),
    });
    if (!need.ok) return res.status(500).json({ error: "Could not add need: " + (await need.text()) });

    return res.status(201).json({ ok: true, need: (await need.json())[0] });
  }

  return res.status(405).json({ error: "Use GET or POST" });
}
