# Padel League Revamp V2 - First Release

This release adds the account foundation without deleting or changing existing players, teams, tournaments, matches, scores, photos, or history.

## What Is Included

- Players can create an account with a username, email, and password.
- A player requests their existing player profile instead of creating a duplicate.
- Admin approves or rejects the request from **Admin > Regular Tournament > Accounts**.
- Approved players can change their own name and profile picture.
- Predictions require an approved player account.
- Each account receives one prediction per tournament.
- A prediction can be changed until the tournament becomes Active.
- Database foundations for tournament registrations, payment tracking, expenses, and player ratings are included for the next development stage.

## Important Order

Run the Supabase update **before** uploading the website files. Until the update is run, the new Account page cannot work.

## Step 1: Update Supabase

1. Open [Supabase](https://supabase.com/dashboard) and select your Padel League project.
2. In the left menu, click **SQL Editor**.
3. Click **New query**.
4. On your computer, open `SUPABASE_REVAMP_V2_UPDATE.sql` from this folder.
5. Select everything inside that file and copy it.
6. Paste it into the empty Supabase query.
7. Click **Run** in the bottom-right corner.
8. Wait for the green **Success** message.

This script is designed to preserve your current records.

## Step 2: Check Email Login

1. In Supabase, click **Authentication**.
2. Click **Providers** or **Sign In / Providers**.
3. Open **Email**.
4. Make sure **Enable Email provider** is turned on.
5. Keep email confirmation turned on if you want players to verify their email address.
6. Click **Save** if you changed anything.

Players use a username publicly, but their private email is used for secure sign-in and password recovery.

## Step 3: Upload The Website

1. Open your GitHub `padel-league` repository.
2. Make sure you are viewing the main repository page.
3. Click **Add file** and then **Upload files**.
4. Drag all contents of this deployment folder into GitHub.
5. Tick or confirm the option to replace files with the same names.
6. At the bottom, click **Commit changes**.
7. Netlify will automatically start a new deployment.
8. In Netlify, wait until the deployment says **Published**.

No new Netlify environment variables are required. Keep the existing variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Step 4: Test One Player Account

1. Open your website.
2. Click the round **Account** icon near the top-right corner.
3. Click **Create account**.
4. Enter a username, email, and password.
5. If Supabase sends a confirmation email, open it and click the confirmation link.
6. Return to the website and sign in.
7. Returning players select their existing name under **Claim your existing player**, then click **Request profile**.
8. Admin opens **Regular Tournament > Accounts**, confirms the identity, and approves that claim.
9. A completely new player instead uses **Create a new player** and does not need claim approval.
10. The linked player can update their name and photo and submit predictions.

## Registration And Payments

The registration and payment-management stage is included. Run `SUPABASE_REVAMP_V2_REGISTRATION_UPDATE.sql`, then `SUPABASE_REVAMP_V2_SELF_SERVICE_TEAMS_UPDATE.sql`, and follow `REGISTRATION_AND_PAYMENTS_README.md`.

The next major stage is the rating calculation in private test mode before ratings are shown publicly.

## Password Recovery

Players can click **Forgot password?** on the Account sign-in form, enter their registered email, and use the secure Supabase email link to choose a new password. In Supabase, add `https://padelnight.netlify.app/account?recovery=1` under **Authentication > URL Configuration > Redirect URLs**.

Players whose profile is linked to an account display a verified check beside their name on the Players leaderboard.
