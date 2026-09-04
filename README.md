# Automate Me — Professional Final Year Project Website

Responsive, animated lead-generation website for Automate Me. The production frontend is fully static and can be hosted free on GitHub Pages. Lead enquiries are sent to a Google Apps Script Web App, stored in Google Sheets, and emailed to the administrator with Gmail `MailApp`.

The supplied pamphlet/poster images are intentionally not used.

## Production architecture

```text
GitHub Pages
  → static website from public/
  → Google Apps Script Web App
  → Google Sheet: Leads
  → Gmail notification with MailApp
```

No Node.js server, Supabase, n8n, paid API, or paid hosting service is used by the production website.

## FREE PRODUCTION DEPLOYMENT

### A. Google Sheet setup

1. Sign in to the Google account that will own the lead sheet and Apps Script deployment.
2. Create a new Google Sheet.
3. Name it `Automate Me Leads`.
4. Copy the Spreadsheet ID from its URL:

   ```text
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

You do not need to create the `Leads` tab or its columns manually. `Code.gs` creates the tab and exact header row on the first valid submission.

### B. Apps Script setup

1. In the Google Sheet, open **Extensions → Apps Script**.
2. Open [google-apps-script/Code.gs](google-apps-script/Code.gs) from this repository.
3. Replace the Apps Script editor's starter code with the complete contents of `Code.gs`.
4. In Apps Script, open **Project Settings → Script Properties**.
5. Add these two properties:

   ```text
   SPREADSHEET_ID = YOUR_GOOGLE_SHEET_ID
   ADMIN_EMAIL = YOUR_EMAIL_ADDRESS
   ```

6. Save the project.

`SPREADSHEET_ID` and `ADMIN_EMAIL` stay in private Script Properties. Do not place either value in `public/config.js`.

### C. Deploy Apps Script

1. In Apps Script, select **Deploy → New deployment**.
2. Click **Select type → Web app**.
3. Set **Execute as** to `Me`.
4. Set **Who has access** to `Anyone`.
5. Click **Deploy** and approve the requested Google permissions.
6. Copy the Web App URL ending in `/exec`.

Use the `/exec` URL, not the `/dev` testing URL. After changing `Code.gs` later, edit the deployment and create a new version so the public Web App receives the update.

### D. Website configuration

1. Open [public/config.js](public/config.js).
2. Replace:

   ```js
   GOOGLE_SCRIPT_URL: "PASTE_GOOGLE_APPS_SCRIPT_URL_HERE"
   ```

   with the deployed `/exec` URL:

   ```js
   GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
   ```

3. Save, commit, and push the change.

The Apps Script URL is configured only in this file. Do not duplicate it in `app.js` or `index.html`.

### E. GitHub Pages deployment

The repository includes [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml). It publishes only `public/`, so the legacy Node server and private local files are never part of the website artifact.

1. Create a public GitHub repository, for example `automate-me`.
2. Commit this project and push it to the repository's `main` or `master` branch.
3. On GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to `GitHub Actions`.
5. Open the repository's **Actions** tab and wait for **Deploy static website to GitHub Pages** to finish.
6. Open the Pages URL shown by the deployment, normally:

   ```text
   https://USERNAME.github.io/automate-me/
   ```

Every later push to `main` or `master` deploys the latest contents of `public/`. All CSS, JavaScript, and image paths are relative, so they work under the `/automate-me/` repository subpath.

## Lead data and automation

The existing form sends these values:

- Name, phone, email, college, course, and branch
- Project type, domain, deadline, and project requirement
- Consent and honeypot value
- UTM source, medium, campaign, content, and term
- Landing page, referrer, submission time, and source

Apps Script performs authoritative validation, creates a server-side lead ID, locks concurrent Sheet writes, protects Sheet cells against formula injection, and stores a server timestamp. A failed email does not remove or roll back the saved lead.

The `Leads` sheet uses this exact column order:

```text
Lead ID | Timestamp | Name | Phone | Email | College | Course | Branch |
Project Type | Domain | Submission Deadline | Project Requirement | Source |
Status | Consent | UTM Source | UTM Medium | UTM Campaign | UTM Content |
UTM Term | Landing Page | Referrer | Admin Email Sent
```

## UTM tracking

UTM values are captured from the landing URL, retained after a successful form reset, and sent to Google Sheets. Example:

```text
https://USERNAME.github.io/automate-me/?utm_source=instagram&utm_medium=social&utm_campaign=final_year_project&utm_content=ai_ml_post
```

## Optional free GA4 preparation

No fake GA4 ID is included. If a real Google tag is added later, `public/app.js` automatically sends these events through `window.gtag`:

- `click_free_consultation`
- `click_whatsapp`
- `lead_form_start`
- `generate_lead` — only after a successful form request

If GA4 is not installed, the helper safely does nothing.

## Local preview

The frontend has no build step. Serve the `public/` directory with any static HTTP server, or run the retained legacy development server:

```bash
npm install
npm start
```

Open `http://localhost:3000`. The form displays a configuration message until a real Apps Script `/exec` URL is placed in `public/config.js`.

## Legacy Node server

`server.js`, `supabase.sql`, and the existing Node package files remain in the repository as requested. They are not referenced by the static frontend and are not uploaded by the GitHub Pages workflow. The deployed website therefore has no Node.js or Supabase runtime dependency.
