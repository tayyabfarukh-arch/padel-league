# Registration And Payments Update

This update preserves all existing players, teams, tournaments, matches, scores, photos, accounts, and history.

## Step 1: Update Supabase First

You already ran the earlier account and registration updates. Now run the newest self-service update:

1. Open [Supabase](https://supabase.com/dashboard).
2. Select your Padel League project.
3. Click **SQL Editor** in the left menu.
4. Click **New query**.
5. Open `SUPABASE_REVAMP_V2_SELF_SERVICE_TEAMS_UPDATE.sql` from this deployment folder.
6. Select and copy everything inside that file.
7. Paste it into the Supabase query.
8. Click **Run**.
9. Wait for the green **Success** message.

Do not run the tournament reset file. This update does not require deleting anything.

## Step 2: Upload The Website

1. Open your `padel-league` repository on GitHub.
2. Click **Add file**, then **Upload files**.
3. Upload all contents of this deployment folder and replace matching files.
4. Click **Commit changes**.
5. Wait for Netlify to show **Published**.

No new Netlify environment variables are required.

## Step 3: Configure Registration

1. Open your website and sign in to **Admin**.
2. Open **Regular Tournament > Registrations**.
3. Select the upcoming tournament.
4. Turn **Registration open** on.
5. Enter the full team fee in Kuwaiti Dinars (KWD).
6. Enter the requested advance amount.
7. Click **Save settings**.

## Step 4: Player Registration

1. The player creates an account and signs in.
2. If they already played before, they claim their existing profile and wait for Admin approval.
3. If they are new, they click **Create a new player**, enter their name, and optionally add a photo. This does not require Admin approval.
4. The player opens **Upcoming**.
5. Under **Team registration**, the player searches for and selects any existing player as their partner.
6. They may enter a team name or leave it blank.
7. The player clicks **Register team**.
8. The request appears in the Admin Registrations section.

If the same pair already has a team, the website reuses it. Otherwise, it creates the team automatically. No partner invitation or partner approval is required. The website blocks the request if either player is already registered in another team for that tournament.

## Step 5: Confirm And Record Payment

1. Open **Admin > Registrations**.
2. Find the team.
3. Change Registration to **Confirmed**, **Waitlisted**, or **Rejected**.
4. Change Payment to **Unpaid**, **Advance paid**, **Paid in full**, or **Refunded**.
5. Enter the amount actually received.
6. Add an optional private Admin note.
7. Click **Save registration**.

Confirming a registration does **not** add the team to Group A or Group B. After approval, open **Admin > Regular Tournament > Tournament**, select the approved team, choose its group manually, and add it to the tournament. Schedule creation remains fully controlled by the Admin.

## Expenses And Totals

Use **Tournament expenses** to add court booking, balls, trophies, food, or other costs. The summary automatically shows:

- Registered teams
- Confirmed teams
- Expected income
- Money received
- Outstanding balance
- Expenses
- Current balance

Players can see only registration and payment-progress badges. Exact amounts and Admin notes remain private.
