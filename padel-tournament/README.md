# Padel League Website

This is a mobile-first tournament website for a private doubles padel group.

It uses Next.js, Supabase, Supabase Auth, Supabase Storage, and Netlify.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com).
2. Sign in.
3. Click **New project**.
4. Name it `Padel League`.
5. Choose the region closest to you.
6. Click **Create new project**.

## Step 2: Paste The Database Setup Script

1. In Supabase, open your project.
2. Click **SQL Editor**.
3. Click **New query**.
4. Open `SUPABASE_SETUP.sql` in this project.
5. Copy everything inside it.
6. Paste it into Supabase.
7. Click **Run**.

## Step 3: Check The Photo Buckets

1. In Supabase, click **Storage**.
2. You should see:

- `player-photos`
- `team-photos`
- `tournament-photos`

3. Make sure each bucket is **Public**.

If one is missing, click **New bucket**, paste the exact name, turn on **Public bucket**, then click **Create bucket**.

## Step 4: Create Your Admin Login

1. In Supabase, click **Authentication**.
2. Click **Users**.
3. Click **Add user**.
4. Enter your email and password.
5. Turn on **Auto Confirm User** if you see it.
6. Click **Create user**.

## Step 5: Copy Your Supabase Values

You need two values.

1. In Supabase, click **Project Settings**.
2. Click **Data API** or **API**.
3. Copy **Project URL**.
4. Click **API Keys** if needed.
5. Copy **Publishable key**. This may also be called the public anon key.

## Exact Netlify Environment Variables

In Netlify, add these exactly:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your Supabase Publishable key
```

Do not include `/rest/v1/` in the URL.

Do not use the secret key or service role key.

## Step 6: Upload Code To GitHub

1. Go to [github.com](https://github.com).
2. Click **New repository**.
3. Name it `padel-league`.
4. Click **Create repository**.
5. Click **uploading an existing file**.
6. Drag the contents of the `padel-tournament` folder into GitHub.
7. Click **Commit changes**.

Upload the contents of the folder, not the parent folder.

## Step 7: Deploy On Netlify

1. Go to [netlify.com](https://netlify.com).
2. Click **Add new site**.
3. Click **Import an existing project**.
4. Choose **GitHub**.
5. Choose your `padel-league` repository.
6. Confirm:

- Build command: `npm run build`
- Publish directory: `.next`

7. Add the two environment variables listed above.
8. Click **Deploy**.

## Step 8: Use The Website

1. Open your Netlify website.
2. Go to `/admin`.
3. Sign in with the Supabase admin user.
4. Add players.
5. Create teams.
6. Create a tournament.
7. Add teams to the tournament.
8. Add matches.
9. Enter results.
10. Close the tournament and choose the champion.

## Match Rules

Only these completed scores are allowed:

- `3-0`
- `3-1`
- `3-2`
- `0-3`
- `1-3`
- `2-3`

Points are game difference:

- `3-0`: winner `+3`, loser `-3`
- `3-1`: winner `+2`, loser `-2`
- `3-2`: winner `+1`, loser `-1`

## If Something Goes Wrong

If the website opens with no data, go to `/admin` and add players, teams, tournaments, and matches.

If photo uploads fail, check that the three Storage buckets exist and are public.

If admin saving fails, make sure you signed in on the Admin page and created the user in Supabase Authentication.
