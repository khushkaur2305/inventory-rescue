// Inventory Rescue AI - find-buyers
//
// Takes a seller's excess product and returns businesses that want to buy it,
// scored out of 100 and sorted best-first.
//
// Deploy from the Supabase dashboard (Edge Functions -> Deploy via Editor)
// or with:  supabase functions deploy find-buyers --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  // The browser sends a check request first - just say yes.
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // ---- 1. READ what the seller sent ------------------------------------
  const { product_type, quantity, price_per_unit, city } = await req.json();

  if (!product_type) {
    return json({ error: "product_type is required" }, 400);
  }

  // ---- 2. ASK SUPABASE for buyers who want this product ----------------
  // The service_role key stays on the server and bypasses RLS, which is why
  // the browser can never read these tables directly.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Following the foreign key fetches the buyer's details in the same query.
  const { data, error } = await supabase
    .from("buyer_needs")
    .select("quantity_required, max_price, businesses(name, city, contact_email)")
    .eq("is_active", true)
    .ilike("product_type", product_type); // ilike = ignores capital letters

  if (error) return json({ error: error.message }, 500);

  // ---- 3. SCORE each buyer out of 100 ----------------------------------
  const buyers = (data ?? []).map((need: any) => {
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
  return json({ count: buyers.length, buyers });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
