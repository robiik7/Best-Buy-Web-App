# Best Buy Open-Box Finder

A mobile-first operator dashboard for finding discounted Best Buy electronics, with a focus on Apple and open-box inventory near Best Buy Bay Parkway (Store 599), Brooklyn.

## What it does

- Searches by keyword, SKU, or Best Buy product URL.
- Highlights open-box, refurbished, pre-owned, clearance, and condition-labelled listings.
- Filters by minimum discount and result count.
- Links every result back to Best Buy for Store 599 pickup verification.
- Keeps the Apify credential in a Vercel server-side environment variable.

## Data reality

This app can only surface inventory and condition data Best Buy exposes publicly. It cannot see private back-room inventory, internal aging reports, employee-only disposition status, or units not published to BestBuy.com. ZIP code `11214` is used as the operator's local context; store-specific availability must be confirmed on Best Buy's product page unless the configured actor returns store-level fulfillment data.

## Provider

Default actor: [`benthepythondev/bestbuy-scraper`](https://apify.com/benthepythondev/bestbuy-scraper). It supports search and URL input and is priced per result. Override it with `APIFY_ACTOR_ID` if a better store-level actor becomes available.

## Deploy

1. Import this repository into Vercel.
2. Add `APIFY_TOKEN` in Vercel project settings for Production, Preview, and Development as appropriate.
3. Optionally add `APIFY_ACTOR_ID`; use `benthepythondev~bestbuy-scraper` format.
4. Deploy.

Never add an Apify token to browser code, commits, screenshots, or exported settings.

## Local development

Create `.env.local` (ignored by Git):

```bash
APIFY_TOKEN=your_token_here
APIFY_ACTOR_ID=benthepythondev~bestbuy-scraper
```

Then run `vercel dev` and open the printed local URL.

## Compliance

Use within Best Buy's terms and Apify's platform rules. This project is independent and is not affiliated with or endorsed by Best Buy or Apify.
