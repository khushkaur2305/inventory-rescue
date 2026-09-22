# Inventory Rescue AI

A B2B platform that finds potential buyers for a business's excess inventory.

A seller enters what they are stuck with — product type, quantity, price, city — and the API
returns other businesses that want to buy it, scored out of 100 and sorted best-match-first.

**Pages**
- `index.html` — the seller's search form and results
- `docs.html` — API documentation

## How it works

```
Seller fills the form   (no keys in the browser)
        |
        |  POST /api/find-buyers  { product_type, quantity, price_per_unit, city }
        v
Vercel Serverless Function
        |   reads SUPABASE_URL + SUPABASE_SECRET_KEY
        |   from Vercel environment variables
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
| `index.html` | The frontend — form + results table. Holds no keys. |
| `docs.html` | API documentation page |
| `api/find-buyers.js` | **The API** — Vercel Serverless Function |
| `supabase/schema.sql` | Creates the tables and sample buyers |
| `supabase/functions/find-buyers/index.ts` | The same API as a Supabase Edge Function (alternative) |

## Setup

### 1. Database

Supabase dashboard → **SQL Editor** → **New query** → paste `supabase/schema.sql` → **Run**.

When it warns about Row Level Security, click **"Run and enable RLS"**.

Check: **Table Editor** → `businesses` has 3 rows, `buyer_needs` has 3 rows.

### 2. Deploy to Vercel

Push this repo to GitHub, then on **vercel.com**: **Add New → Project** → import the repo →
Framework Preset **Other** → leave all build settings blank → **Deploy**.

Vercel picks up anything in `/api` as a serverless function automatically. There is no build step
and no dependencies to install.

### 3. Add the environment variables

Vercel → your project → **Settings** → **Environment Variables**. Add two:

| Name | Value | Where to find it |
|---|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Supabase → Settings → API |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | Supabase → Settings → API |

Tick **Production**, **Preview** and **Development**.

### 4. Redeploy

**Deployments** tab → the latest one → **⋯** → **Redeploy**.

This step is easy to miss and the usual cause of a 500 error. Environment variables are injected
when a deployment is built, so the deployment that ran *before* you added them cannot see them.

### 5. Test

Open your Vercel URL and click **Find Buyers**. With the sample data you should get:

| Buyer | Score | Why |
|---|---|---|
| Sharma Wholesale | 100 | Same product, price fits, enough quantity, same city |
| Gupta Traders | 40 | Same product only — they need 800 units, you have 500, and they cap at ₹38 |

## The match score

| Condition | Points |
|---|---|
| Product type matches | 40 |
| Your price is within their budget | +25 |
| You have enough quantity | +20 |
| Same city | +15 |

Maximum 100. Every result also carries a `reasons` list, so the score always explains itself —
that is the difference between a number a business trusts and one it ignores.

## Security

```
Browser  --(no keys)-->  Serverless Function  --(secret key)-->  Database
```

The browser holds **no keys at all**. It can only call `/api/find-buyers` on its own domain.

The secret key lives only as a Vercel environment variable, read by the serverless function at
runtime. It is not in this repository and is never sent to a browser.

**Why the key could not just go in the frontend:** any file the browser downloads can be read by
opening it directly — `view-source`, or visiting the `.js` file's URL. There is no way to hide a
key in frontend code. Keeping it server-side is the only real protection.

Row Level Security is enabled on both tables as a second layer, so even a leaked publishable key
could not read them.

## Tech stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | HTML, CSS, JavaScript — no framework, no build step | Free |
| Hosting | Vercel | Free tier |
| API | Vercel Serverless Function (Node.js) | Free tier |
| Database | Supabase Postgres | Free tier |
| Secrets | Vercel environment variables | Free |

## Note on the Supabase Edge Function

`supabase/functions/find-buyers/index.ts` is the same endpoint implemented as a Supabase Edge
Function (Deno/TypeScript). It is deployed and working, and is kept here as an alternative
implementation. The live site uses the Vercel function instead.
