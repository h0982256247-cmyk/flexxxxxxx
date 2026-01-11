# Deployment Guide for Flex Glass Editor

This guide covers how to set up the database on [Supabase](https://supabase.com) and deploy the application to [Zeabur](https://zeabur.com).

## 1. Supabase Setup (Database)

1.  **Create a Project**: Go to Supabase and create a new project.
2.  **Get Credentials**:
    *   Go to **Project Settings** > **API**.
    *   Copy the `Project URL` and `anon public` key. You will need these for Zeabur.
3.  **Run Setup Script**:
    *   Open `supabase/full_setup.sql` in your local editor and copy the entire content.
    *   Go to your Supabase project dashboard > **SQL Editor**.
    *   Paste the content and click **Run**.
    *   *Success Check*: You should see "Success, no rows returned".
    *   Verify tables (`docs`, `doc_versions`, `shares`) were created in **Table Editor**.

    > [!WARNING]
    > **If you see "ERROR: 42501: must be owner of table objects"**:
    > This means your database user permissions are limited.
    > 1. Use the [supabase/tables_only.sql](file:///Users/a33/flexxxxxxx/supabase/tables_only.sql) script instead.
    > 2. Set up Storage manually (see below).

### Manual Storage Setup (If SQL Failed)
1.  Go to **Storage** in the sidebar.
2.  Click **New Bucket**.
3.  Name it `flex-assets`.
4.  Toggle **Public Bucket** to ON.
5.  Click **Save**.
6.  **Add Policies**:
    *   Click **Policies** (under Mode Configuration).
    *   Under `flex-assets`, click **New Policy**.
    *   Select **"Get started quickly"** > **"Give users access to all files they uploaded"**. -> Click **Use this template**.
    *   Review it (SELECT, INSERT, UPDATE, DELETE checked). Click **Save Policy**.
    *   (Optional but recommended) Add another policy for "Public Read":
        *   New Policy -> "For full randomization" -> Name: "Public Read" -> Allowed operations: SELECT -> Target roles: authenticated, anon -> Expression: `bucket_id = 'flex-assets'` -> Save.


## 2. Zeabur Setup (Application)

1.  **Login**: Log in to Zeabur dashboard.
2.  **Create Project**: Create a new project (e.g., "flex-glass").
3.  **Deploy Service**:
    *   Click **Deploy New Service** > **GitHub**.
    *   Select this repository.
    *   Zeabur should automatically detect the configuration from `zeabur.json`.
4.  **Configure Environment Variables** (Critical Step):
    *   Before the deployment finishes (or right after), go to **Settings** > **Environment Variables**.
    *   Add the following variables using the values from Supabase:
        *   `VITE_SUPABASE_URL`: Your Supabase Project URL
        *   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
    *   *Note*: Since this is a Vite app, these variables are needed at **Build Time**. If the initial build failed or didn't pick them up, click **Redeploy** in Zeabur after saving the variables.

## 3. Verification

*   Open the deployed URL provided by Zeabur.
*   Try logging in (Supabase Auth) or creating a generic account if email auth is enabled.
*   Test creating a new draft and uploading an image to ensure Storage and Database connections are working.
