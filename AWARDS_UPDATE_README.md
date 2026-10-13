# Weekly and Monthly Awards Update

This release adds player awards without changing match ratings.

## What is included

- Three weekly awards selected and published by Admin:
  - Player of the Week
  - Most Improved Player
  - Moment of the Week
- Six monthly awards decided by verified-player voting:
  - MVP of the Month
  - Most Improved Player
  - Sportsmanship Award
  - Best Team Player
  - Clutch Player
  - Chaos Creator
- One private vote per verified account for each monthly category.
- Players cannot vote for themselves.
- Players can change their selections until Admin closes voting.
- Tied monthly leaders share the award.
- Every published weekly and monthly award appears permanently in the winner's player profile.
- The Awards page keeps the published history.

## Deploy in this order

### Step 1: Update Supabase

1. Open your Supabase project.
2. Click **SQL Editor** on the left.
3. Click **New query**.
4. Open `SUPABASE_AWARDS_UPDATE.sql` from this deployment folder.
5. Copy the complete SQL file and paste it into Supabase.
6. Click **Run**.
7. Wait for the green success message.

This script creates new award tables and does not delete or change existing players, matches, ratings, predictions, or tournaments.

### Step 2: Deploy the website

Upload the contents of this complete deployment folder to the root of the GitHub repository. Netlify will start a new deployment automatically.

## How Admin uses weekly awards

1. Open **Admin** and sign in.
2. Select **Regular Tournament**.
3. Open the new **Awards** tab.
4. Select **Weekly**.
5. Enter a title, start date, and end date.
6. Click **Create weekly awards**.
7. Select one winner for each of the three awards.
8. Click **Publish weekly winners**.

The awards immediately appear on the Awards page and the winners' player profiles.

## How monthly voting works

1. In Admin's **Awards** tab, select **Monthly**.
2. Enter the month title and dates.
3. Click **Create monthly awards**. Voting opens immediately.
4. Players open the trophy button, sign in, choose one different player for each category, and save all six votes.
5. Admin can see how many verified players participated, but individual choices remain private.
6. When voting is finished, Admin clicks **Close voting and publish**.

Monthly winners then appear on the Awards page and in each winner's Awards Cabinet. Awards do not affect player ratings.
