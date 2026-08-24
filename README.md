# Padel League Website

This is a mobile-first tournament website for regular team tournaments, Singles Americano, and Team Americano.

It uses Next.js, Supabase, Supabase Storage, and Netlify. Only the Admin page requires a login.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com).
2. Sign in.
3. Click **New project**.
4. Name it `Padel League`.
5. Choose the region closest to you.
6. Click **Create new project**.

## Step 2: Create Your Admin Login

1. In Supabase, click **Authentication**.
2. Click **Users**.
3. Click **Add user**.
4. Enter your email and password.
5. Turn on **Auto Confirm User** if you see it.
6. Click **Create user**.

This account is only for the Admin page. Players do not create accounts.

## Step 3: Paste The Database Setup Script

1. In Supabase, open your project.
2. Click **SQL Editor**.
3. Click **New query**.
4. Open `SUPABASE_SETUP.sql` in this project.
5. Copy everything inside it.
6. Paste it into Supabase.
7. Click **Run**.

## Updating An Existing Website

If your website is already live, run the small schedule-rounds update first. It preserves every existing player, team, tournament, match, score, photo, and historical record.

1. Open Supabase.
2. Open your project.
3. Click **SQL Editor**.
4. Click **New query**.
5. Open `SUPABASE_SCHEDULE_ROUNDS_UPDATE.sql` in this project.
6. Copy everything inside it.
7. Paste it into Supabase.
8. Click **Run**.

Wait for the green **Success** message before deploying the website folder. You only run this update script once. If you have never installed the earlier Americano database update, run `SUPABASE_AMERICANO_UPDATE.sql` first and then run `SUPABASE_SCHEDULE_ROUNDS_UPDATE.sql`.

Your existing Supabase Authentication user is registered as the Admin when this script runs. Players and visitors do not need an account.

## Optional: Delete All Tournament Records And Start Fresh

Only do this if you want to permanently remove all tournaments, matches, and results. Your existing players, teams, photos, Supabase project, and Admin login will remain.

1. In Supabase, click **SQL Editor**.
2. Click **New query**.
3. Open `RESET_TOURNAMENT_DATA.sql`.
4. Copy everything inside it.
5. Paste it into Supabase.
6. Click **Run**.
7. Then run `SUPABASE_SETUP.sql`.

This does not delete your players, teams, photos, Supabase project, or Admin login.

## Step 4: Check The Photo Buckets

1. In Supabase, click **Storage**.
2. You should see:

- `player-photos`
- `team-photos`
- `tournament-photos`

3. Make sure each bucket is **Public**.

If one is missing, click **New bucket**, paste the exact name, turn on **Public bucket**, then click **Create bucket**.

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
7. Choose **One group** or **Two groups (A and B)** when creating the tournament.
8. In **Admin > Tournament**, select the tournament and save **Two groups (A and B)** if you need to change an existing tournament.
9. Choose Group A or Group B, tick several teams, and click **Add selected teams**.
10. Use the Group dropdown beside a team under **Teams already added** if you need to move it between Group A and Group B.
11. Choose the number of courts available.
12. Open **Admin > Regular Tournament > Schedule** and find **Generate group schedule**.
13. Select the tournament and click **Generate missing group matches**. Every team will play every other team in its own group once. Existing matches receive round and court assignments without losing their scores.
14. Check the generated list. Change a match's Round or Court dropdown, delete a mistaken match, or use **Add match** for a special replacement.
15. In **Admin > Schedule > Court YouTube streams**, paste the YouTube link for each court and click **Save court links**.
16. In the Tournament setup box, change **Tournament status** to **Active** and click **Save setup**.
17. Open **Active** and choose Group A or Group B.
18. Each unfinished match shows its own two score boxes. Enter both scores inside the correct match and click **Submit result**. No sign-in is required.
19. If a group score is tied, choose the team that won the Golden point before submitting.
20. After group matches are finished, use **Knockout setup** to create semifinals.
21. Participants enter semifinal scores.
22. Create the final.
23. Participants enter the final score.
24. Close the tournament from the final result.

## Automatic Regular Tournament Schedule

The generator creates a single round robin inside each group:

- 8 teams in one group: each team plays 7 matches, creating 28 matches total.
- 4 teams in Group A and 4 teams in Group B: each team plays 3 group matches, creating 6 matches per group and 12 total.
- Teams in Group A are never paired against Group B during automatic group scheduling.
- A round is one shared time slot across all groups. With 4 courts, Round 1 can contain 4 matches in total, such as 2 Group A matches and 2 Group B matches.
- If one time slot needs more matches than the available courts can hold, the generator continues them in the next round.

Running the generator again only adds missing pairings and fills missing schedule details. It does not duplicate existing fixtures, delete manually created matches, or overwrite scores. Use the Round and Court dropdowns beside a match to move it, the trash button to delete it, and the manual **Add match** form to add an unusual fixture.

On **Upcoming**, **Active**, and **History**, open **Group match schedule** to see matches arranged under clear Round headings. Use the Round, Group, Team, and Court filters to find exactly the matches you need.

To change the available courts for an existing tournament:

1. Open **Admin > Regular Tournament > Tournament**.
2. Select the tournament.
3. Change **Number of courts** in the Tournament setup box.
4. Click **Save setup**.

The website immediately recalculates round and court assignments using the new number of courts. Existing scores are preserved. You can still change an individual match's round or court afterward.

## Create A Singles Americano Tournament

1. Open **Admin** and sign in.
2. At the top, click **Americano**.
3. Click **Create event**.
4. Choose **Singles Americano (rotating partners)**.
5. Enter the tournament name, date, number of courts, points target, and number of rounds.
6. Enter your preferred target, such as `20`.
7. Choose the points rule:

- **Race to target** allows a result such as `20-19`.
- **Fixed combined total** requires both scores to add up to the target, such as `14-10 = 24`.

8. Click **Create Americano event**.
9. Click **Participants & schedule**.
10. Select the new tournament.
11. Tick every player taking part.
12. Click **Generate complete schedule**.

The website automatically rotates partners, reduces repeat partnerships, distributes player appearances, and assigns every match to a round and court.

## Create A Team Americano Tournament

1. Open **Admin**, sign in, and click **Americano**.
2. Click **Create event**.
3. Choose **Team Americano (fixed teams)**.
4. Complete the tournament details and click **Create Americano event**.
5. Open **Participants & schedule** and tick all participating teams.
6. Click **Generate complete schedule**.

The website automatically creates a full round robin where every fixed team plays every other fixed team once. If there are more simultaneous matches than courts, it creates extra schedule rounds automatically.

## Run An Americano Tournament

1. In **Admin > Americano > Manage event**, change the status to **Active**.
2. Open the website's **Active** page.
3. Each unfinished match has two score boxes. Anyone can enter the result without signing in.
4. Enter the score using the rule selected for that tournament. A Race to 20 match can finish `20-19`; a Fixed combined total of 24 can finish `14-10`.
5. Standings update immediately after the score is submitted.
6. Use the participant and court filters to find a match quickly.
7. When finished, return to **Manage event** and change the status to **Completed**. It will then appear in History.

Use **Clear scores only** to remove test results while keeping the generated schedule. Use **Regenerate complete schedule** only when you want to replace the schedule and all its results.

For a two-group tournament, the website creates the semifinals automatically as:

- Group A first place vs Group B second place
- Group A second place vs Group B first place

The Active and History pages show a Group A / Group B selector above the standings and matches.

The Tournament tab in Admin shows teams already added. The Schedule tab shows matches already created and their courts. Admin remains available for correcting an incorrectly submitted score.

To test the standings before tournament day, enter temporary scores normally. When testing is finished, open **Admin > Results**, select the tournament, and click **Clear all tournament scores**. Confirm the warning. This clears scores, winners, Golden-point winners, and closing results while keeping every scheduled match, team, group, court, and YouTube link.

## Predictions

1. Create the tournament with status **Upcoming**.
2. Add the participating teams.
3. Participants open **Predict**.
4. Tap **Vote** beside one team. No sign-in is required.
5. The website allows one vote per tournament in each browser.

Voting closes automatically when the tournament status changes from **Upcoming** to **Active**.

This is intentionally a simple voting system. A person using another browser or clearing their browser data can vote again.

## Match Rules

When creating a tournament, choose:

- A points target for group matches, such as `15`, `20`, or `25`.
- A group points rule: **Race to target** or **Fixed combined total**.
- A games target for semifinals, such as `5` or `6`.
- A games target for the final, such as `5` or `6`.
- A games target for the third-place match.

Examples:

- Group match total `20` points: `12-8`
- Group match race to `20`: `20-19`, `20-14`, or `20-7`
- Tied group match with total `20` points: `10-10`, followed by one Golden point
- Semifinal set first to `6` games: `6-4`
- Final set first to `6` games: `6-4`
- Final tied at `5-5`: continue until `7-5` or `7-6`
- If court time expires after `5-5`: a `6-5` finish is allowed only after choosing **Closed at 6 because court time ended**

For **Fixed combined total** group matches, both scores must add up to the selected total. When the score is tied, play one Golden point and select its winner. For **Race to target**, one team must reach the selected target and the other score must be lower.

Group standings are ranked by:

1. Most matches won.
2. Higher net points: points scored minus points conceded.
3. Head-to-head winner when two teams are still tied.
4. Higher total points scored if the previous rules do not separate them.

For semifinals and finals, play normal padel points inside each game (`15`, `30`, `40`) and enter the final number of games won by each team. With a target of `6`, scores such as `6-4` are normal. After `5-5`, continue one extra game until `7-5` or `7-6`. If court time expires at `6-5`, enter the score and confirm **Closed at 6 because court time ended**. The match card will display this reason.

The Group Matches, Semifinals, Final, and Third Place headings can be clicked to expand or minimize their match lists. Minimize Group Matches to reach the knockout sections quickly.

## YouTube Court Streams

1. Open **Admin**.
2. Open the **Schedule** tab.
3. Find **Court YouTube streams**.
4. Select the tournament.
5. Paste the streaming URL beside each court.
6. Click **Save court links**.

The red YouTube icon appears on every match that has a court with a saved link. Clicking it opens that court's stream in a new tab.

The group standings use the completed group scores. Knockout scores do not change the completed group standings.

## If Something Goes Wrong

If the website opens with no data, go to `/admin` and add players, teams, tournaments, and matches.

If photo uploads fail, check that the three Storage buckets exist and are public.

If admin saving fails, make sure you signed in on the Admin page and created the user in Supabase Authentication.
