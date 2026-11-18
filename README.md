# ResumeLens — AI Resume Analyzer (Python + React)

Full-stack AI resume analyzer and ATS match studio built with a **Python 3.11** backend and a **React + Vite + Tailwind CSS** JavaScript frontend.

## Project Folder Structure

```text
resumelens/
├── backend/
│   └── app.py                  # Python 3.11 HTTP API (PDF/DOCX/TXT parsing + Gemini REST API)
├── src/
│   ├── components/
│   │   ├── AnalysisInputView.jsx   # Drag-and-drop upload, text paste, job description input
│   │   ├── ScorecardOverview.jsx   # Overall match gauge, dimensions, keywords, checklist
│   │   ├── BulletRewritesView.jsx  # Side-by-side bullet diffs & Custom Bullet Lab
│   │   ├── SectionAuditView.jsx    # Section structure table & extracted ATS transcript
│   │   └── OutreachDraftView.jsx   # Cover letter, recruiter email & LinkedIn note generator
│   ├── data/
│   │   └── samples.js              # Built-in sample resumes & job descriptions
│   ├── utils/
│   │   └── exportMarkdown.js       # Markdown audit report formatter
│   ├── App.jsx                     # Main workspace layout & session history
│   ├── index.css                   # Tailwind CSS v4 & typography config
│   └── main.jsx                    # React entry point
├── index.html
├── package.json
├── server.js                   # Launches backend/app.py and serves Vite/React on port 3000
├── vite.config.js
└── .env.example
```

## Running Locally

1. Set your `GEMINI_API_KEY` environment variable (see `.env.example`).
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start both the Python backend and React frontend:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.
