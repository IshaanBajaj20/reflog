# Reflog

A year-in-review for engineers that measures the work, not the clout.

Most GitHub Wrapped tools weight stars heavily and commits barely, so a developer
with 2,000 private commits across a production system loses to someone with one
starred toy repo. Reflog inverts that. Stars are a minor signal. What counts is
commit volume, consistency across the year, the breadth of the stack you own, the
number of distinct organisations you contributed to, and the languages you shipped.

The generated text is generous and specific. It never roasts.

## Status

Milestone 1 of 8 — scaffold and GitHub OAuth working end to end, with a `/debug`
page that prints the raw fetched data.

| # | Milestone | State |
|---|-----------|-------|
| 1 | Scaffold + GitHub OAuth, raw data dump | done |
| 2 | Data layer: personal + org repos, languages by bytes, private contributions | next |
| 3 | Stats computation + unit tests | |
| 4 | Slide shell: container, gestures, progress bar | |
| 5 | All nine slides, rule-based archetype | |
| 6 | LLM layer (Groq, rule-based fallback) + caching | |
| 7 | Share links, OG images, PNG export | |
| 8 | Privacy page, rate limiting, polish | |

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion (from milestone 4)
· Postgres on Neon (from milestone 6) · deployed on Vercel.

Auth is a hand-rolled GitHub OAuth flow — about 120 lines, no `next-auth`
dependency. The access token lives in an AES-256-GCM encrypted `httpOnly` cookie
and never reaches the browser or the database.

## Local setup

### 1. Register a GitHub OAuth app

<https://github.com/settings/developers> → **New OAuth App**

| Field | Value |
|-------|-------|
| Application name | Reflog (dev) |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback` |

Register a **second, separate** OAuth app for production once deployed, with the
Vercel URL in both fields — GitHub allows only one callback URL per app.

Click **Generate a new client secret** and copy both values.

### 2. Configure the environment

```bash
cp .env.example .env.local
# then fill in GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
openssl rand -base64 32   # paste into AUTH_SECRET
```

### 3. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, click **Continue with GitHub**, approve the scopes,
and you land on `/debug` with the raw payload.

> **Port 3000 must be free.** The OAuth callback URL registered with GitHub has to
> match exactly. If something else holds the port, run `npm run dev -- -p 3001`
> *and* change both `NEXT_PUBLIC_APP_URL` and the GitHub callback URL to `3001`.

## Environment variables

| Variable | Needed from | Purpose |
|----------|-------------|---------|
| `GITHUB_CLIENT_ID` | milestone 1 | OAuth app id |
| `GITHUB_CLIENT_SECRET` | milestone 1 | OAuth app secret |
| `AUTH_SECRET` | milestone 1 | Encrypts the session cookie (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | milestone 1 | Base URL, no trailing slash. Used for `redirect_uri` and share links |
| `DATABASE_URL` | milestone 6 | Neon / Vercel Postgres connection string |
| `GROQ_API_KEY` | milestone 6 | LLM provider — <https://console.groq.com/keys>. Optional; falls back to rule-based |

All six go into Vercel → Project → Settings → Environment Variables. Everything
used here has a free tier that needs no card.

## Scopes and privacy

Reflog requests `read:user` and `repo`.

`repo` is requested because most engineers' real work is private, and without it
GitHub reports a 2,113-contribution year as an 11-contribution year. Reflog reads
repository **metadata only** — names, languages, timestamps, counts. It never reads
file contents, and it never stores repo names or descriptions. Only aggregate
numbers are persisted, and only to cache your own wrapped.

The LLM layer (milestone 6) receives **computed numbers only** — never repo names,
never descriptions, never anything identifying an employer.

## Routes

| Route | What it does |
|-------|--------------|
| `/` | Landing page and sign-in |
| `/api/auth/login` | Starts the OAuth flow with a sealed CSRF state cookie |
| `/api/auth/callback` | Exchanges the code, seals the session cookie |
| `/api/auth/logout` | Clears the session |
| `/debug` | Raw fetched data (development aid, removed before launch) |

## Non-goals

No leaderboard, no dev-vs-dev battles, no achievement badges with rarity tiers, no
power-level score. Those push the product back toward gamified clout, which is
what this app argues against.
