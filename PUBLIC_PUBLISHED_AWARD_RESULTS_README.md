# Public Published Award Voting Results

This update hides monthly award results while voting is open and publishes the complete anonymous totals after the Admin closes voting.

## Step 1: Update Supabase

1. Open your Supabase project.
2. Click **SQL Editor** in the left menu.
3. Click **New query**.
4. Open `SUPABASE_PUBLISHED_AWARD_RESULTS_UPDATE.sql` from this deployment folder.
5. Select all the text inside that file and copy it.
6. Paste it into the Supabase SQL Editor.
7. Click **Run**.
8. Wait for the success message.

This function reveals only combined totals from monthly awards that have already been published. It never reveals who voted for whom.

## Step 2: Deploy the website

Upload everything inside the ready-to-upload folder to the root of your GitHub repository. Replace the existing files when GitHub asks.

Netlify will deploy automatically.

## What happens on the website

- While monthly voting is open, no totals or leaders are displayed.
- After Admin clicks **Close voting and publish**, winners appear under **Award winners**.
- A new **Published voting results** section appears underneath the winners.
- The published section shows all final vote totals, percentages, rankings, participants, and ties.
- The result remains available for sharing and future reference.

No new Netlify environment variable is required.
