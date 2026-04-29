# Recruiting_App
This web application allows you to track job applications in one clean dashboard thats simple. Allowing students and job seekers to easily keep track of their jobs.

A single-page web app that helps students log internship applications and get
data-driven insights. No external API, no API key, no build step. The "AI" is a
rule-based JavaScript insight engine that runs entirely in the browser.

## Features

- **Log Applications** — company, role, field, date, days-after-posting, status
- **Metric Strip** — total apps, response rate, interviews, offers (always visible)
- **Funnel Chart** — pure CSS horizontal bars, Applied → Offer / Rejected
- **AI Insight Engine** — rule-based analysis: response by field, timing, funnel drop-off, action items
- **Typewriter Output** — streams insights into a terminal-style box
- **Local-first** — everything persists to `localStorage`, never leaves your browser
- **Seed Data** — 5 sample applications on first visit

## Stack

Pure HTML / CSS / JavaScript. No framework, no bundler. Hosted as static files.

```
.
├── index.html      Markup + structure
├── styles.css      Dark navy + electric blue theme, DM Mono / DM Sans
├── app.js          State, rendering, insight engine
├── package.json    Optional dev script (npx serve)
├── vercel.json     Static hosting config
└── README.md
```

## Run locally

Any static file server works:

```bash
# option 1 — npx
npx serve .

# option 2 — python
python3 -m http.server 3000

# option 3 — just open index.html in your browser
```

## Deploy to Vercel

### One-click via the Vercel dashboard

1. Push this folder to a GitHub repository.
2. Go to <https://vercel.com/new> and import the repo.
3. Vercel auto-detects it as a static site. Leave all build settings empty
   (no build command, no output directory). Click **Deploy**.

### Via CLI

```bash
npm i -g vercel
vercel        # follow the prompts
vercel --prod
```

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — RR RecruitRight"
git branch -M main
git remote add origin git@github.com:<your-username>/rr-recruitright.git
git push -u origin main
```

## Design system

| Token         | Hex        | Usage                  |
| ------------- | ---------- | ---------------------- |
| `--bg`        | `#0A0F1E`  | Page background        |
| `--surface`   | `#0D1B3E`  | Cards, panels          |
| `--surface-2` | `#112040`  | Alternating rows       |
| `--border`    | `#1E3A6E`  | Borders, dividers      |
| `--accent`    | `#3B82F6`  | Primary CTA, highlights|
| `--text`      | `#F0F4FF`  | Primary text           |
| `--text-muted`| `#6B8CC7`  | Labels, secondary text |
| `--green`     | `#10B981`  | Offer / positive delta |
| `--amber`     | `#F59E0B`  | Screening / warning    |
| `--red`       | `#EF4444`  | Rejected / error       |
| `--teal`      | `#06B6D4`  | Interview / code       |

Typography: **DM Mono** (numbers, headings, code) + **DM Sans** (body).

## Insight Engine

Four modules, all pure functions of the `apps[]` array:

1. **Response by field** — groups apps by field, computes `responded/total`, flags strongest and weakest.
2. **Early vs. late** — splits at `daysAfter <= 3`, compares response rates (only reports with 3+ apps per bucket).
3. **Funnel drop-off** — finds the stage with worst stage-to-stage conversion, recommends specific prep.
4. **Action items** — generates 3 concrete next steps based on what the data actually shows.

Output is concatenated and streamed character-by-character at ~16ms/char into a
terminal-style box with a blinking cursor.
