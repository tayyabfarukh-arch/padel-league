# Player Sign-up Details and Admin Dashboard

This release collects the following required information when a player creates an account:

- Full name
- Mobile number
- Nationality
- Playing level: Beginner, Amateur, Intermediate, Advanced, or Professional

These personal details are stored separately from public usernames. Only the individual account owner and Admin can read them.

## Deploy in this order

### Step 1: Update Supabase

1. Open your Supabase project.
2. Click **SQL Editor**.
3. Click **New query**.
4. Open `SUPABASE_SIGNUP_DETAILS_UPDATE.sql` from this deployment folder.
5. Copy the complete file and paste it into the Supabase query.
6. Click **Run** and wait for the green success message.

This creates a protected registration-details table. It does not delete or change players, accounts, ratings, matches, votes, awards, predictions, or tournaments.

### Step 2: Deploy the website

Upload the contents of this complete deployment folder to the root of the GitHub repository. Netlify will deploy it automatically.

## New registrations

The Create Account form now requires all four registration details. The website validates the mobile number and playing level before creating the account.

## Existing accounts

Existing accounts are not deleted or blocked. After signing in, they will see a **Registration details** form on the Account page. They can complete or update their information there.

## Admin dashboard

1. Open **Admin** and sign in.
2. Open the **Accounts** tab.
3. The **New sign-ups dashboard** shows accounts newest-first.

For each account, Admin can see:

- Full name and username
- Mobile number
- Nationality
- Playing level
- Exact signup date and time
- Whether the account is linked to a player, awaiting approval, rejected, or not yet claimed

The dashboard also shows total accounts, registrations from the last seven days, and pending profile claims.

This update does not change the player rating mechanism.
