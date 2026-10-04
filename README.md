# PayHero + GitHub Pages + Vercel Setup

This project keeps the frontend hosted on GitHub Pages and moves payment processing to Vercel serverless functions.

## 1) Deploy backend on Vercel

Import this repository into Vercel and deploy it. Vercel will host:

- `/api/payments`
- `/api/payhero-callback`

## 2) Set required Vercel environment variables

Set these in Vercel Project Settings → Environment Variables:

- `PAYHERO_USERNAME`
- `PAYHERO_PASSWORD`
- `PAYHERO_CHANNEL_ID=13586`
- `PAYHERO_ACCOUNT_ID=12806`
- `PAYHERO_CALLBACK_URL=https://<your-vercel-project>.vercel.app/api/payhero-callback`

## 3) Point frontend to Vercel API

Update `PAYMENTS_API_URL` in `/home/runner/work/Payhero/Payhero/index.html` to:

`https://<your-vercel-project>.vercel.app/api/payments`

Then commit and redeploy GitHub Pages so your static frontend calls Vercel.

## 4) Security actions

- Rotate/revoke any previously exposed PayHero API key/password immediately.
- Never commit PayHero credentials to this repository.
- Keep GitHub Pages as frontend hosting only; credentials must stay in Vercel environment variables.
