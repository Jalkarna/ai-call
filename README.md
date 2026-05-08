# VMC AI Call Center

An inbound call system built for Vadodara Municipal Corporation. Citizens call a helpline and file municipal complaints through voice, in Hindi, Gujarati, or English. No app, no form, just a phone call.

> Built at the AMD Slingshot hackathon.

---

## What it does

Citizens call the VMC helpline. An AI agent picks up:

1. Plays an IVR for language selection (Hindi / Gujarati / English)
2. Listens using real-time speech-to-text (Sarvam AI)
3. Asks follow-up questions to pull out: complaint type, address, pincode, contact info
4. Reads back what it captured for confirmation
5. Files a complaint ticket (e.g. `VMC-2026-00042`) and ends the call

The dashboard side is for VMC officials. It shows active calls with live transcripts, lets operators search and edit complaints, displays analytics (call volume, AI accuracy, escalation rate), and allows a human agent to take over any AI call mid-conversation. Call recordings and transcripts are stored and playable afterward.

---

## Architecture

```
Caller (Phone)
    │
    ▼
Twilio Voice ──── WebSocket (media stream) ────► FastAPI Backend
                                                        │
                                              ┌─────────┼──────────┐
                                          Sarvam STT  Gemini AI  Sarvam TTS
                                          (speech→text) (reasoning) (text→speech)
                                                        │
                                                  PostgreSQL + Redis
                                                        │
                                            Next.js Dashboard (WebSocket)
```

Backend is FastAPI (Python) with async SQLAlchemy and Redis for pub/sub. Two WebSocket connections run in parallel: one with Twilio carrying call audio, one with the Next.js dashboard for live updates.

AI stack:
- STT: Sarvam AI `saaras:v3` — multilingual Indian language recognition
- LLM: Google Gemini — conversation, intent extraction, structured output
- TTS: Sarvam AI `bulbul:v3`

Frontend is Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, and Recharts.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | Python 3.10+, FastAPI, SQLAlchemy 2.0, Uvicorn |
| Database | PostgreSQL 14+ |
| Cache / Pub-Sub | Redis 7+ |
| Voice | Twilio Programmable Voice + Media Streams |
| STT | Sarvam AI (`saaras:v3`) |
| LLM | Google Gemini (via Gemini API) |
| TTS | Sarvam AI (`bulbul:v3`) |
| Audio Storage | AWS S3 |
| Auth | JWT (python-jose + passlib) |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Twilio account with a programmable voice number
- Sarvam AI API key
- Google Gemini API key
- AWS S3 bucket (for audio storage)

### Backend

```bash
cd backend

pip install -r requirements.txt

createdb vmc_voice_ai
psql $DATABASE_URL < app/db/migrations/001_initial_schema.sql

cp .env.example .env
# fill in your credentials

./start.sh
# or: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend

```bash
cd frontend

npm install

cp .env.example .env.local
# set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL

npm run dev          # development
npm run build && npm start  # production
```

### Twilio setup

1. In the [Twilio Console](https://console.twilio.com), go to **Phone Numbers > Active Numbers**
2. Select your number and set the incoming call webhook to `https://your-domain.com/api/calls/start` (HTTP POST)
3. Save.

### Docker

```bash
# Backend
cd backend && docker build -t vmc-backend .
docker run -p 8000:8000 --env-file .env vmc-backend

# Frontend
cd frontend && docker build -t vmc-frontend .
docker run -p 3000:3000 vmc-frontend
```

---

## Environment variables

See [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example) for the full list. The ones you need to fill in:

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Your Twilio number |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SARVAM_API_KEY` | Sarvam AI API key |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 audio storage |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens |

---

## Project structure

```
ai-call/
├── backend/
│   ├── app/
│   │   ├── api/          # route handlers (calls, IVR, complaints, admin)
│   │   ├── db/           # database setup + migrations
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas + Gemini system prompt
│   │   ├── services/     # core logic (orchestrator, Gemini, STT, TTS, Twilio, state machine)
│   │   └── utils/        # language detection
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    ├── app/              # Next.js App Router pages (calls, complaints, analytics, settings)
    ├── components/       # shared UI (live call panel, notifications, shell)
    └── lib/              # WebSocket client
```

---

## How the call flow works

The backend runs a state machine (`state_machine.py`) that moves each call through:

```
IDLE → IVR_LANGUAGE_SELECT → GREETING → COLLECTING_INFO → CONFIRMATION → COMPLETED
                                                  ↓ (if needed)
                                             ESCALATION (human takeover)
```

Audio from Twilio arrives as μ-law encoded chunks over WebSocket. The backend decodes and buffers it, then uses Silero VAD to detect speech boundaries. Completed utterances go to Sarvam STT, the transcript feeds Gemini, and the response audio from Sarvam TTS streams back to Twilio. The same server pushes those events to the dashboard in parallel, so operators see the transcript update in real time.

---

## License

MIT
