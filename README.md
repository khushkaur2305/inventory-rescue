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
| `index.html` | The frontend — search, buyer list, add form. Holds no keys. |
| `docs.html` | Swagger UI, rendering `openapi.json` |
| `openapi.json` | OpenAPI 3.0 spec for all four endpoints |
| `api/find-buyers.js` | **POST** `/api/find-buyers` — the matching engine |
| `api/needs.js` | **GET / POST** `/api/needs` — list and add buyer needs |
| `api/send-sms.js` | **POST** `/api/send-sms` — sends one SMS through Twilio |
| `supabase/schema.sql` | Creates the tables and sample buyers |
| `supabase/functions/find-buyers/index.ts` | The same matching API as a Supabase Edge Function (alternative) |

## Endpoints

| Method | Path | What it does |
|---|---|---|
| `GET` | `/api/needs` | List every active buyer need |
| `POST` | `/api/needs` | Add a buyer need (creates the business if new) |
| `POST` | `/api/find-buyers` | Score and rank buyers for a seller's excess stock |
| `POST` | `/api/send-sms` | Send an SMS notification through Twilio |

Full request/response details, with a **Try it out** button for each, are on `docs.html`.

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

The SMS button needs four more. They are covered in [step 5](#5-twilio-for-the-sms-button) —
add them at the same time if you are setting everything up in one go.

### 4. Redeploy

**Deployments** tab → the latest one → **⋯** → **Redeploy**.

This step is easy to miss and the usual cause of a 500 error. Environment variables are injected
when a deployment is built, so the deployment that ran *before* you added them cannot see them.

### 5. Twilio (for the SMS button)

Only needed for **Send SMS**. The rest of the site works without it.

**In the Twilio console**

1. **Settings → API keys & auth tokens → API keys → Create API key.** Name it anything and
   choose type **Standard**. A *Restricted* key rejects the send with error `20403` unless you
   explicitly granted it Messaging permission, so Standard is the simpler choice.
2. Copy the **SID** (`SK...`) and the **Secret**. The secret is displayed once and cannot be
   retrieved later — if you lose it, delete the key and make a new one.
3. The **Account SID** (`AC...`) is a different value, on the console homepage under Account Info.
4. **Phone Numbers → Manage → Active numbers** gives you the sending number. Buy one there if
   you have none; it is free on a trial account.

**In Vercel**, add four more variables:

| Name | Value | Where to find it |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | `AC...` | Console homepage → Account Info |
| `TWILIO_API_KEY_SID` | `SK...` | The API key you created |
| `TWILIO_API_KEY_SECRET` | the key secret | Shown once, at creation |
| `TWILIO_FROM_NUMBER` | `+12025550123` | Phone Numbers → Active numbers |

Tick **Production**, **Preview** and **Development**, then redeploy as in step 4.

**Trial accounts** can only text numbers you have verified under **Phone Numbers → Verified
Caller IDs**, and the message arrives with a trial prefix. An unverified recipient is the most
common reason the button fails.

### 6. Test

Open your Vercel URL and click **Find Buyers**. With the sample data you should get:

| Buyer | Score | Why |
|---|---|---|
| Sharma Wholesale | 100 | Same product, price fits, enough quantity, same city |
| Gupta Traders | 40 | Same product only — they need 800 units, you have 500, and they cap at ₹38 |

For the SMS feature, scroll to **Send an SMS notification**, enter a phone number with its
country code and click **Send SMS**. A success shows `Twilio status: queued`; a failure prints
Twilio's own explanation, which is usually enough to tell you which value is wrong.

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

The Twilio credentials work the same way. The browser posts a phone number and a message to
`/api/send-sms`; the API key SID and secret are read from environment variables inside the
function and never leave the server. `.env` and `.env.local` are gitignored so a local copy
cannot be committed by accident.

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
