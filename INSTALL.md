# Focus Engine — Installation

Guide to get Focus Engine running on your Windows PC. The app runs **locally** — all your data stays on your computer.

## 1. Prerequisites

You need the following installed:

- **Node.js 20 or higher** ([nodejs.org](https://nodejs.org/) — download the "LTS" version)
- **PowerShell** (already included with Windows)
- About **500 MB of free disk space**

To confirm Node.js is installed, open PowerShell and type:

```powershell
node --version
```

You should see something like `v20.x.x` or higher. If not, install Node.js first.

## 2. Install via AI agent (recommended)

If you use an AI coding assistant (Claude Code, Cursor, GitHub Copilot Chat, Cowork, Continue, etc.) that has access to a shell and file system, you can delegate the entire setup. Copy the prompt below and paste it into your agent:

> Quero que instales e ponhas a correr a app **Focus Engine** localmente. É um Next.js 16 + Prisma + SQLite, single-user, para gestão gamificada de tarefas, recompensas e hábitos.
>
> **Steps:**
>
> 1. Check that I have `git`, `node` (≥ 20) and `npm` installed. If anything is missing, tell me how to install it for my OS and stop here until I confirm.
> 2. Ask me which folder to clone into, then run:
>    ```
>    git clone https://github.com/FilipeRSTeixeira/focus-engine.git
>    cd focus-engine
>    ```
> 3. Install dependencies:
>    ```
>    npm install
>    ```
> 4. Create a `.env` file in the project root (copy from `.env.example` if it exists; otherwise create with this content):
>    ```
>    DATABASE_URL="file:./dev.db"
>    ```
>    Google OAuth is optional and configured later via the app's `/settings` page with my own Google Cloud credentials.
> 5. Initialize the SQLite database and Prisma client:
>    ```
>    npx prisma migrate deploy
>    npx prisma generate
>    ```
>    If `migrate deploy` fails or leaves things inconsistent, run `npx prisma db push` as a fallback.
> 6. Run the test suite to confirm everything works:
>    ```
>    npm test
>    ```
> 7. Start the dev server:
>    ```
>    npm run dev
>    ```
>    The app will be at [http://localhost:3210](http://localhost:3210).
>
> When done, open the browser at that URL and confirm the page loads. If any migration or Prisma client error appears, show me the full stack trace before trying to fix it.

The agent handles the entire setup. Total time: typically 3–5 minutes.

## 3. Install via PowerShell script

Inside the Focus Engine folder, open PowerShell and run:

```powershell
.\setup.ps1
```

The script handles everything automatically: installs dependencies, sets up the database, and offers to start the app. It takes 2–5 minutes the first time.

> **If you see an "execution policy" error:** run this command in PowerShell first to allow script execution (for this session only):
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> ```

## 4. Manual install (step by step)

If you prefer to do it manually, inside the app folder:

```powershell
# 1. Install dependencies
npm install

# 2. Generate the Prisma client
npx prisma generate

# 3. Create the database (SQLite)
npx prisma migrate deploy

# 4. Start the app
npm run dev
```

## 5. Accessing the app

With the app running, open your browser at:

**http://localhost:3210**

To stop the app, go back to PowerShell and press `Ctrl+C`. To start it again another day, just run `npm run dev` inside the folder.

## 6. Connecting to Google Calendar (optional)

The Google Calendar integration lets tasks you create in the app appear automatically in your calendar. **Each user must create their own credentials** using a free Google Cloud Console account.

In the app, go to **Settings** (in the sidebar) and follow the instructions in the *"How to get a Client ID and Client Secret?"* section. There you will find:

- A summary of the 7 steps.
- A **ready-to-copy prompt** to paste into a ChatGPT/Claude/Gemini chat that guides you through the process conversationally.

The process typically takes 10–15 minutes the first time. You don't need to be a developer.

## 7. Where your data is stored

Everything stays on your PC, in this folder:

- `prisma/dev.db` — tasks, projects, points, rewards, habits, history.
- `google-token.json` — access token for your Google Calendar (if connected).
- Your data is **never sent to the internet**, except when connected to Google Calendar (and even then it communicates only with your own Google account, directly).

To back up your data, simply copy the `prisma/` folder.

## 8. Troubleshooting

**"node is not recognised…"** — Node.js is not installed or not on the PATH. Install it from [nodejs.org](https://nodejs.org/) and restart PowerShell.

**"npm install fails with permissions"** — Run PowerShell as Administrator, or use a folder inside `C:\Users\<YourName>\` instead of `C:\Program Files\`.

**"Port 3210 already in use"** — Something else is using that port. Close it, or edit `package.json` and change `next dev -p 3210` to another port (e.g. `-p 3211`). If you change the port, you must also update the Redirect URI in the Calendar Settings.

**"App opens but shows no data"** — Restart the app (`Ctrl+C` in PowerShell then `npm run dev` again). If the issue persists, check that the file `prisma/dev.db` exists.

**"Calendar won't connect"** — Confirm in Settings that you have the correct Client ID and Client Secret, and that the Redirect URI registered in Google Cloud Console is **exactly** `http://localhost:3210/api/auth/google/callback`.

## 9. Updating to a new version

When you receive an updated version of the app:

```powershell
git pull
npm install
npx prisma migrate deploy
npx prisma generate
```

Your data (`prisma/dev.db`) will remain intact.

## 10. Wiping everything

If you want to delete all data and start from scratch, delete the files `prisma/dev.db` and `google-token.json`. Then run `npx prisma migrate deploy` again to recreate an empty database.
