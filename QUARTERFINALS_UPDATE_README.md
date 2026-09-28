# Quarter-finals Update

This update preserves all existing players, teams, registrations, tournaments, group schedules, scores, photos, accounts, and history.

## Step 1: Update Supabase First

1. Open Supabase and select your Padel League project.
2. Click **SQL Editor** in the left menu.
3. Click **New query**.
4. Open `SUPABASE_QUARTERFINALS_UPDATE.sql` from this deployment folder.
5. Copy everything from that file and paste it into the new Supabase query.
6. Click **Run** and wait for **Success**.

Do not run `RESET_TOURNAMENT_DATA.sql`.

## Step 2: Upload The Website

1. Open your `padel-league` repository on GitHub.
2. Click **Add file**, then **Upload files**.
3. Upload all contents of this deployment folder and replace matching files.
4. Click **Commit changes**.
5. Wait for Netlify to show **Published**.

No new Netlify environment variables are required.

## Step 3: Update Your Existing Upcoming Tournament

1. Sign in to **Admin**.
2. Open **Regular Tournament > Tournament**.
3. Select your existing upcoming tournament.
4. Keep **Group setup** on **Two groups (A and B)**.
5. Change **Knockout format** to **Quarter-finals then semifinals**.
6. Set the group points target and the games target for every knockout stage.
7. Click **Save setup**.

Your existing teams, groups, courts, and scheduled group matches remain unchanged.

## Step 4: Generate The Knockout Bracket

After every group match has a result:

1. Open **Admin > Regular Tournament > Schedule**.
2. Find **Knockout setup** and select the tournament.
3. Click **Create quarter-finals from standings**.
4. The website creates Q1 A1-B4, Q2 A2-B3, Q3 A3-B2, and Q4 A4-B1.
5. Enter all four quarter-final results.
6. Click **Create semifinals from quarter-final winners**.
7. The website creates SF1 Q1-Q3 and SF2 Q2-Q4.
8. Enter both semifinal results and click **Create final from semifinal winners**.
