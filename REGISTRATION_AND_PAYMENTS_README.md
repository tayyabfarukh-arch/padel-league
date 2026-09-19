# Registration And Payments Update

This update preserves all existing players, teams, tournaments, matches, scores, photos, accounts, and history.

## Step 1: Update Supabase First

You already ran `SUPABASE_REVAMP_V2_UPDATE.sql` when player accounts were added. Now run the new registration update:

1. Open [Supabase](https://supabase.com/dashboard).
2. Select your Padel League project.
3. Click **SQL Editor** in the left menu.
4. Click **New query**.
5. Open `SUPABASE_REVAMP_V2_REGISTRATION_UPDATE.sql` from this deployment folder.
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
5. Enter the full team fee in Saudi Riyals.
6. Enter the requested advance amount.
7. Click **Save settings**.

## Step 4: Player Registration

1. The player signs in to their approved account.
2. The player opens **Upcoming**.
3. Under **Team registration**, the player selects an existing team containing their profile.
4. The player clicks **Register team**.
5. The request appears in the Admin Registrations section.

The website blocks a registration if either player is already registered in another team for the same tournament. If a player's team is missing, create it first under **Admin > People**.

## Step 5: Confirm And Record Payment

1. Open **Admin > Registrations**.
2. Find the team.
3. Change Registration to **Confirmed**, **Waitlisted**, or **Rejected**.
4. Change Payment to **Unpaid**, **Advance paid**, **Paid in full**, or **Refunded**.
5. Enter the amount actually received.
6. Add an optional private Admin note.
7. Click **Save registration**.

Confirming a team automatically adds it to the tournament in Group A. For a two-group tournament, use the existing Tournament tab afterward to move the team to Group B when needed.

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
