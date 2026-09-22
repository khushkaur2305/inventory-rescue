# Inventory Rescue AI

A B2B platform that finds potential buyers for a business's excess inventory.

A seller enters what they are stuck with — product type, quantity, price, city — and the API
returns other businesses that want to buy it, scored out of 100 and sorted best-match-first.

**Live pages**
- `index.html` — the seller's search form and results
- `docs.html` — API documentation

## How it works

```
Seller fills the form
        |
        |  POST { product_type, quantity, price_per_unit, city }
        v
Supabase Edge Function  (find-buyers)
        |
        |  query: active needs matching this product
        v
Supabase Postgres  (businesses + buyer_needs)
        |
        |  matching rows
        v
Function scores each buyer 0-100 and sorts
        |
        |  JSON response
        v
HTML page draws the results table
```

## Project files

| File | What it is |
|---|---|
| `index.html` | The whole frontend — form + results table |
| `docs.html` | API documentation page |
| `config.js` | Your two Supabase values. **Edit this before anything works.** |
| `supabase/schema.sql` | Creates the tables and sample buyers |
| `supabase/functions/find-buyers/index.ts` | The API |

## Setup

### 1. Database

Supabase dashboard → **SQL Editor** → **New query** → paste `supabase/schema.sql` → **Run**.

When it warns about Row Level Security, click **"Run and enable RLS"**.

Check it worked: **Table Editor** → `businesses` shows 3 rows, `buyer_needs` shows 3 rows.

### 2. API

Supabase dashboard → **Edge Functions** → **Deploy a new function** → **Via Editor**.

Name it exactly `find-buyers`, paste in `supabase/functions/find-buyers/index.ts`, **Deploy**.

Test it right there with:

```json
{ "product_type": "rice", "quantity": 500, "price_per_unit": 40, "city": "Ludhiana" }
```

You should get back Sharma Wholesale at 100% and Gupta Traders at 60%.

### 3. Frontend

Supabase dashboard → **Settings → API**. Copy your **Project URL** and **anon key** into
`config.js`:

```javascript
const SUPABASE_URL = "https://abcdefghijk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

Then double-click `index.html` to test it locally before deploying.

## Deploy to Vercel

```bash
git init
git add .
git commit -m "Inventory Rescue AI"
git branch -M main
git remote add origin https://github.com/<your-username>/inventory-rescue.git
git push -u origin main
```

Then on **vercel.com**: **Add New → Project** → import the repo → Framework Preset **Other** →
leave all build settings blank → **Deploy**.

It is plain HTML, so there is nothing to build. Every `git push` after this redeploys automatically.

## The match score

| Condition | Points |
|---|---|
| Product type matches | 40 |
| Your price is within their budget | +25 |
| You have enough quantity | +20 |
| Same city | +15 |

Maximum 100. Every result also carries a `reasons` list, so the score always explains itself —
that is the difference between a number a business trusts and one it ignores.

## Is it safe to commit the anon key?

Yes. The anon key is designed to be public and is visible in the page source of every Supabase
app. It is an identifier, not a password — it only lets the browser *call* the function.

What actually protects the data is **Row Level Security**, which is enabled on both tables so
nothing can be read with the anon key. The powerful `service_role` key lives only inside the Edge
Function on Supabase's servers and never appears in this repository.

That separation is the reason the API is a serverless function rather than the page querying the
database directly.

## Tech stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | HTML, CSS, JavaScript — no framework, no build step | Free |
| Hosting | Vercel | Free tier |
| API | Supabase Edge Function (Deno / TypeScript) | Free tier |
| Database | Supabase Postgres | Free tier |
