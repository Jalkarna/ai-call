# VMC AI Call Center - Complete System Documentation

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [What It Does](#what-it-does)
3. [Technology Stack](#technology-stack)
4. [Architecture](#architecture)
5. [System Flow](#system-flow)
6. [Frontend Details](#frontend-details)
7. [Backend Details](#backend-details)
8. [Database Schema](#database-schema)
9. [Key Components](#key-components)
10. [API Endpoints](#api-endpoints)
11. [WebSocket Communication](#websocket-communication)
12. [Call Flow State Machine](#call-flow-state-machine)
13. [AI Integration](#ai-integration)
14. [Real-time Features](#real-time-features)
15. [Configuration](#configuration)
16. [Deployment](#deployment)
17. [Security & Privacy](#security--privacy)

---

## 🎯 System Overview

**VMC AI Call Center** is an AI-powered inbound call management system built for **Vadodara Municipal Corporation (VMC)**. It enables citizens to call a helpline number and file complaints about municipal issues (garbage collection, water supply, streetlights, drainage, etc.) using natural voice conversation in **Hindi**, **Gujarati**, and **English**.

### Purpose
- Accept 24/7 inbound calls from citizens
- Extract structured complaint data automatically using AI
- File complaints in the database with >85% accuracy
- Provide a real-time admin dashboard for VMC officials
- Allow human operator intervention when needed

### Target Users
1. **Citizens**: Call to report municipal issues
2. **VMC Officials**: Monitor and manage complaints via dashboard
3. **Operators**: Take over calls that need human assistance

---

## 🚀 What It Does

### Core Functionality

#### For Citizens (Callers)
1. **Call the VMC Helpline** - Dial the Twilio number (+17756180700)
2. **Select Language** - Choose from Hindi, Gujarati, or English via IVR
3. **Speak Naturally** - Describe the complaint in their own words
4. **AI Conversation** - System asks follow-up questions to gather:
   - Complaint type (garbage, water, streetlight, etc.)
   - Detailed description
   - Address and location details
   - Pincode and landmark
   - Contact information
5. **Confirmation** - AI reads back extracted information
6. **Ticket Generation** - System creates a complaint ticket (e.g., VMC-2026-00042)
7. **Completion** - Call ends with ticket number confirmation

#### For Officials (Dashboard Users)
1. **Real-time Monitoring** - View live active calls as they happen
2. **Call History** - Browse all past calls with filters
3. **Complaint Management** - Search, view, edit, and manage complaints
4. **Analytics** - View statistics, call volume charts, AI accuracy
5. **Takeover Capability** - Transfer AI calls to human operators
6. **Field Correction** - Edit AI-extracted fields with confidence indicators
7. **Audio Playback** - Listen to call recordings
8. **Transcript View** - Read conversation transcripts

---

## 💻 Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.1 | React framework with App Router |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | v4 | Utility-first CSS framework |
| **shadcn/ui** | Latest | Component library (Radix UI primitives) |
| **Radix UI** | Various | Accessible UI components |
| **Lucide React** | 0.562.0 | Icon library |
| **date-fns** | 4.1.0 | Date formatting |
| **Recharts** | 3.6.0 | Charts and data visualization |
| **next-themes** | 0.4.6 | Dark/light mode support |
| **React Hook Form** | 7.69.0 | Form management |
| **Zod** | 4.3.4 | Schema validation |
| **Sonner** | 2.0.7 | Toast notifications |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.10+ | Programming language |
| **FastAPI** | 0.109.0+ | Web framework |
| **Uvicorn** | 0.27.0+ | ASGI server |
| **SQLAlchemy** | 2.0.25+ | ORM for database |
| **PostgreSQL** | Latest | Primary database |
| **asyncpg** | 0.29.0+ | Async PostgreSQL driver |
| **Redis** | 5.0.1+ | Session store |
| **WebSockets** | 11.0+ | Real-time communication |
| **Pydantic** | 2.5.3+ | Data validation |
| **structlog** | 24.1.0+ | Structured logging |
| **boto3** | 1.34.14+ | AWS S3 for audio storage |

### AI & Speech Services

| Service | Model/Version | Purpose |
|---------|---------------|---------|
| **Google Gemini** | gemini-2.0-flash-exp | Structured extraction & reasoning |
| **Sarvam AI (STT)** | saarika:v2.5 | Speech-to-Text (Hindi/Gujarati/English) |
| **Sarvam AI (TTS)** | bulbul:v2 | Text-to-Speech (Multilingual) |
| **Twilio** | Programmable Voice | Telephony & media streaming |
| **Silero VAD** | 6.0.0 | Voice Activity Detection |
| **PyTorch** | 2.0.0+ | Machine learning framework |

### Infrastructure

| Component | Technology |
|-----------|------------|
| **Telephony** | Twilio (SIP/WebRTC) |
| **Audio Storage** | AWS S3 |
| **Containerization** | Docker |
| **Process Management** | Uvicorn workers |

---

## 🏗️ Architecture

### High-Level System Architecture

```
┌─────────────────┐
│   Citizen       │ Calls VMC Helpline
│   (Caller)      │ (+17756180700)
└────────┬────────┘
         │ PSTN/SIP
         ▼
┌─────────────────────────────────────────────────────┐
│          Twilio Programmable Voice                  │
│  - Receives inbound call                            │
│  - Hosts IVR (Language selection)                   │
│  - Streams audio via WebSocket (Media Streams)      │
│  - Plays TTS audio back to caller                   │
└────────┬────────────────────────────────────────────┘
         │ WebSocket Audio Stream
         ▼
┌─────────────────────────────────────────────────────┐
│        FastAPI Backend Orchestrator                 │
│  ┌──────────────────────────────────────────────┐   │
│  │  Call Orchestrator (call_orchestrator.py)   │   │
│  │  - Manages call state machine                │   │
│  │  - Coordinates all services                  │   │
│  │  - Handles audio buffering with VAD          │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │                                    │
│    ┌────────────┴────────────┐                      │
│    ▼            ▼             ▼                      │
│ ┌─────┐    ┌────────┐    ┌──────┐                   │
│ │ STT │    │Gemini  │    │ TTS  │                   │
│ │     │    │ AI     │    │      │                   │
│ └──┬──┘    └───┬────┘    └───┬──┘                   │
│    │           │             │                       │
│    ▼           ▼             ▼                       │
│  Sarvam    Google AI      Sarvam                    │
│  API       (Gemini)        API                       │
└────┬────────────┬──────────────┬────────────────────┘
     │            │              │
     │            ▼              │
     │      ┌──────────┐         │
     │      │PostgreSQL│         │
     │      │ Database │         │
     │      └──────────┘         │
     │                           │
     │      ┌──────────┐         │
     │      │  Redis   │         │
     │      │ Session  │         │
     │      └──────────┘         │
     │                           │
     │      ┌──────────┐         │
     │      │  AWS S3  │         │
     │      │  Audio   │         │
     │      └──────────┘         │
     │                           │
     │    WebSocket Events       │
     │            │              │
     ▼            ▼              ▼
┌─────────────────────────────────────────────────┐
│      Next.js Frontend Dashboard                │
│  - Real-time call monitoring                   │
│  - Complaint management                        │
│  - Analytics & charts                          │
│  - Human takeover controls                     │
└─────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
1. Incoming Call → Twilio → Webhook to /api/calls/start
2. Backend creates session → Returns TwiML → Twilio connects WebSocket
3. Audio streams to /api/calls/stream/{session_id}
4. VAD detects speech → Sends to Sarvam STT → Gets transcript
5. Transcript → Gemini AI → Structured JSON extraction
6. Gemini decides next action → Generates response text
7. Response → Sarvam TTS → Audio file
8. Audio → Twilio → Plays to caller
9. Loop continues until complaint filed or call ends
10. All events broadcast via WebSocket to dashboard
```

---

## 🔄 System Flow

### Complete Call Flow (Step-by-Step)

#### Phase 1: Call Initiation
1. **Citizen dials** VMC helpline number
2. **Twilio receives** PSTN call
3. **Twilio sends** HTTP POST to `/api/calls/start` webhook
4. **Backend**:
   - Creates new call session in database
   - Generates unique `session_id`
   - Returns TwiML XML with:
     - Language selection IVR
     - Media stream WebSocket URL
5. **Twilio establishes** WebSocket to `/api/calls/stream/{session_id}`

#### Phase 2: Language Selection (IVR)
1. Caller hears: "Hindi ke liye 1 dabayen, Gujarati mate 2 dabavo, For English press 3"
2. Caller presses digit (1/2/3)
3. DTMF sent to `/api/calls/{session_id}/dtmf`
4. Backend updates session language (`hi`, `gu`, or `en`)
5. AI greeting played based on language

#### Phase 3: Audio Streaming & Processing
1. **Audio chunks** arrive via WebSocket (μ-law format, 8kHz)
2. **Silero VAD** analyzes audio for speech/silence
3. **Buffer accumulation** during speech
4. **Speech end detection** (silence threshold)
5. **STT Processing**:
   - Convert μ-law to PCM
   - Send to Sarvam STT API
   - Receive transcript + confidence score

#### Phase 4: AI Processing
1. **Transcript + History** sent to Gemini
2. **Gemini analyzes** with system prompt
3. **Structured JSON response**:
   ```json
   {
     "intent": "complaint",
     "complaint_type": "garbage_collection",
     "fields": {
       "description": "कचरा तीन दिन से नहीं उठाया गया",
       "address": "12 MG Road, Sayajiganj"
     },
     "missing_fields": ["pincode", "landmark"],
     "confidence": {
       "description": 0.95,
       "address": 0.88
     },
     "next_action": "ask",
     "speak": "कृपया अपना पिनकोड बताइए।"
   }
   ```

#### Phase 5: State Machine Logic
Based on `next_action`:
- **ask**: Missing fields → Ask follow-up question
- **confirm**: All fields collected → Read back for confirmation
- **file**: Confirmed → Create complaint in database
- **escalate**: Low confidence/safety issue → Transfer to human

#### Phase 6: TTS Response
1. **Response text** sent to Sarvam TTS
2. **Audio file** generated
3. **μ-law conversion** for Twilio
4. **Audio streamed** back through WebSocket
5. **Caller hears** AI response

#### Phase 7: Complaint Filing
1. All required fields collected
2. User confirms details
3. **Database insert**:
   - Create complaint record
   - Link to call record
   - Generate ticket ID (VMC-2026-XXXXX)
   - Store confidence scores
4. **Confirmation to caller**: "Your complaint VMC-2026-00042 has been registered"

#### Phase 8: Call Completion
1. AI says farewell
2. WebSocket closes gracefully
3. **Database updates**:
   - Call status → "completed"
   - End timestamp
   - Duration calculation
4. **Final event broadcast** to dashboard
5. **Twilio call ends**

---

## 🎨 Frontend Details

### Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Dashboard home
│   ├── layout.tsx                # Root layout + providers
│   ├── loading.tsx               # Loading states
│   ├── globals.css               # Global styles
│   ├── calls/
│   │   ├── page.tsx              # Call list with filters
│   │   └── [id]/page.tsx         # Call detail view
│   ├── complaints/
│   │   ├── page.tsx              # Complaint list
│   │   └── [id]/page.tsx         # Complaint detail
│   ├── analytics/
│   │   └── page.tsx              # Charts & statistics
│   ├── settings/
│   │   └── page.tsx              # System configuration
│   └── login/
│       └── page.tsx              # Authentication
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   └── ... (21 total)
│   ├── layout/
│   │   └── shell.tsx             # App shell with sidebar
│   ├── audio-player.tsx          # Call recording player
│   ├── confidence-indicator.tsx  # AI accuracy visualizer
│   ├── transcript-timeline.tsx   # Conversation view
│   ├── takeover-modal.tsx        # Human takeover UI
│   ├── notification-panel.tsx    # Real-time alerts
│   ├── incoming-call-notification.tsx  # Call popup
│   ├── live-call-notification.tsx
│   └── mode-toggle.tsx           # Dark/light theme
│
├── lib/                          # Utilities & services
│   ├── api.ts                    # API client layer
│   ├── types.ts                  # TypeScript interfaces
│   ├── websocket.ts              # WebSocket hooks
│   ├── hooks.ts                  # Custom React hooks
│   ├── audio.ts                  # Audio utilities
│   └── utils.ts                  # Helper functions
│
└── public/                       # Static assets
    ├── teamstone.mp3             # Notification sound
    └── favicon.ico
```

### Key Pages

#### 1. Dashboard (`/`)
- **KPI Cards**: Total calls, complaints, avg handle time, urgent actions
- **Live Calls Panel**: Real-time active calls with status
- **Call Volume Chart**: 24-hour area chart
- **Recent Calls**: Last 5 calls processed
- **Urgent Complaints**: High/critical priority table
- **System Status**: Backend connectivity, active calls count

#### 2. Calls Page (`/calls`)
- Paginated call history
- Filters: Status, Language, Date range
- Search by caller number
- Sort by timestamp
- Quick status badges

#### 3. Call Detail Page (`/calls/[id]`)
- Call metadata (duration, language, status)
- Audio player for recording
- Transcript timeline (user/assistant messages)
- Extracted fields with confidence indicators
- Related complaint link
- Takeover button (for active calls)

#### 4. Complaints Page (`/complaints`)
- Searchable complaint list
- Filters: Status, Urgency, Type, Location
- Ticket number search
- Status badges (Registered, Assigned, In Progress, Resolved)

#### 5. Complaint Detail Page (`/complaints/[id]`)
- Full complaint details
- Editable fields with inline correction
- Confidence scores per field
- Linked call information
- Status update controls
- Assignment to operators

#### 6. Analytics Page (`/analytics`)
- Call volume trends
- Category breakdown
- Language distribution
- AI accuracy metrics
- Resolution time charts

### Real-time Features

#### WebSocket Integration
```typescript
// Dashboard receives live events:
- call_started: New call notification
- partial_transcript: Live transcription
- form_update: Field extraction updates
- case_created: Complaint filed
- call_ended: Call completion
- escalation_alert: Human needed
```

#### Custom Hooks
```typescript
// lib/websocket.ts
useActiveCalls()         // Live call feed
useCallSession(id)       // Specific call updates
useDashboardStats()      // Real-time statistics
useSystemAlerts()        // System notifications
```

### Component Highlights

#### Confidence Indicator
Shows AI extraction accuracy per field:
- Green (>90%): High confidence
- Yellow (70-89%): Medium confidence
- Red (<70%): Low confidence - needs review

#### Transcript Timeline
- User messages (right-aligned, blue)
- AI responses (left-aligned, gray)
- Timestamps
- Confidence scores
- Auto-scroll during live calls

#### Incoming Call Notification
Bottom-right popup when new call arrives:
- Caller number
- Language selected
- Intent detected
- Sound alert (teamstone.mp3)
- Click to monitor
- Auto-dismiss options

---

## ⚙️ Backend Details

### Project Structure

```
backend/
├── app/
│   ├── main.py                      # FastAPI application entry
│   ├── __init__.py
│   ├── api/                         # API route handlers
│   │   ├── calls.py                 # Call endpoints + WebSocket
│   │   ├── complaints.py            # Complaint CRUD
│   │   ├── admin.py                 # Admin operations
│   │   ├── notifications.py         # WebSocket events
│   │   └── ivr.py                   # IVR logic
│   ├── services/                    # Business logic
│   │   ├── call_orchestrator.py     # Main call coordinator
│   │   ├── gemini_client.py         # Gemini AI integration
│   │   ├── stt_client.py            # Sarvam STT
│   │   ├── tts_client.py            # Sarvam TTS
│   │   ├── twilio_client.py         # Twilio integration
│   │   ├── silero_vad.py            # Voice activity detection
│   │   ├── state_machine.py         # Call state management
│   │   └── websocket_broadcaster.py # Dashboard events
│   ├── models/                      # Database models
│   │   ├── __init__.py              # Model exports
│   │   ├── call.py                  # Call model
│   │   ├── complaint.py             # Complaint model
│   │   └── user.py                  # User model
│   ├── schemas/                     # Pydantic schemas
│   │   ├── call_schema.py
│   │   └── complaint_schema.py
│   ├── db/                          # Database
│   │   ├── database.py              # Connection & session
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   └── utils/                       # Utilities
│       ├── audio_utils.py
│       └── encryption.py
│
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Container config
├── start.sh                         # Startup script
└── .env                             # Environment variables
```

### Core Services

#### 1. Call Orchestrator (`call_orchestrator.py`)
**Purpose**: Central coordinator for entire call flow

**Responsibilities**:
- Manage call state machine
- Buffer and process audio chunks
- Coordinate STT → Gemini → TTS pipeline
- Handle interrupts and errors
- Broadcast WebSocket events
- Store data to database

**Key Methods**:
```python
async def start_call(session_id, caller_number, twilio_call_sid, db, language)
async def process_audio_chunk(session_id, audio_data, stream_sid, is_ulaw, db)
async def process_transcript(session_id, transcript, confidence, db)
async def generate_speech_response(session_id, text, language, db)
async def file_complaint(session_id, db)
async def end_call(session_id, db)
async def broadcast_event(session_id, event_type, event_data, db)
```

#### 2. Gemini Client (`gemini_client.py`)
**Purpose**: Interface with Google Gemini AI

**Capabilities**:
- Structured JSON extraction
- Function calling support
- Thinking/reasoning mode
- Conversation history management
- Confidence scoring

**System Prompt** (Simplified):
```
You are a complaint extractor for VMC.
Extract structured data and return ONLY JSON with:
- intent
- complaint_type
- fields (description, address, locality, pincode, landmark)
- missing_fields
- confidence (per field)
- next_action (ask/confirm/file/escalate)
- speak (short response in caller's language)

Validate addresses, normalize to English when possible.
Ask for missing required fields step-by-step.
```

#### 3. Sarvam STT Client (`stt_client.py`)
**Purpose**: Convert speech to text

**Features**:
- WebSocket streaming to Sarvam API
- Multilingual support (hi-IN, gu-IN, en-IN)
- Partial and final transcripts
- Confidence scores
- Translation to English option

#### 4. Sarvam TTS Client (`tts_client.py`)
**Purpose**: Generate speech from text

**Features**:
- Streaming TTS API
- Multiple speakers (meera, etc.)
- Language-specific voices
- μ-law audio output for Twilio
- Audio caching for common phrases

#### 5. Silero VAD (`silero_vad.py`)
**Purpose**: Voice Activity Detection

**Function**:
- Detect speech vs. silence in audio
- Determine turn boundaries
- Trigger transcript processing
- Prevent partial transcription

**Logic**:
- Accumulate audio during speech
- Detect silence threshold (e.g., 800ms)
- Mark speech segment as complete
- Send to STT

#### 6. State Machine (`state_machine.py`)
**Purpose**: Deterministic call flow control

**States**:
```python
INIT         # IVR language selection
LISTENING    # Buffering caller speech
PROCESSING   # Waiting for Gemini
ASKING       # AI asking follow-up
CONFIRMING   # Reading back extracted data
FILING       # Creating complaint
ESCALATED    # Transferred to human
ENDED        # Call completed
```

**Transitions**:
- INIT → LISTENING (language selected)
- LISTENING → PROCESSING (VAD detected end)
- PROCESSING → ASKING (missing fields)
- PROCESSING → CONFIRMING (all fields ok)
- CONFIRMING → FILING (user confirmed)
- FILING → ENDED (complaint created)
- Any → ESCALATED (low confidence / safety)

#### 7. WebSocket Broadcaster (`websocket_broadcaster.py`)
**Purpose**: Publish events to dashboard clients

**Connection Manager**:
- Maintains active WebSocket connections
- Supports rooms (per-call channels)
- Broadcasts to all or specific clients
- Heartbeat to keep connections alive

**Event Types**:
```json
{
  "type": "call_started",
  "session_id": "call_xyz",
  "caller": "+919825012345",
  "language": "hi",
  "timestamp": "2026-01-24T10:30:00Z"
}
```

---

## 🗄️ Database Schema

### PostgreSQL Tables

#### 1. `calls`
```sql
Fields:
- id: UUID (PK)
- session_id: VARCHAR(255) UNIQUE
- caller_number: VARCHAR(20)
- twilio_call_sid: VARCHAR(255)
- language: VARCHAR(10) (hi/gu/en)
- status: VARCHAR(20) (active/completed/escalated/failed)
- current_state: VARCHAR(20) (init/listening/processing/...)
- start_time: TIMESTAMP
- end_time: TIMESTAMP
- duration_seconds: INTEGER
- recording_url: TEXT
- call_metadata: JSONB (extra data)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

Indexes:
- session_id, caller_number, status, start_time, twilio_call_sid
```

#### 2. `complaints`
```sql
Fields:
- id: UUID (PK)
- call_id: UUID (FK to calls)
- ticket_id: VARCHAR(50) UNIQUE (VMC-2026-00042)
- complaint_type: VARCHAR(50)
- description: TEXT
- address: TEXT
- locality: VARCHAR(255)
- pincode: VARCHAR(10)
- contact_number: VARCHAR(255) (encrypted)
- landmark: VARCHAR(255)
- urgency: VARCHAR(20) (low/medium/high)
- status: VARCHAR(30) (registered/assigned/in_progress/resolved/closed)
- confidence_scores: JSONB
- assigned_to: UUID
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- resolved_at: TIMESTAMP

Indexes:
- ticket_id, call_id, status, created_at, pincode, complaint_type
```

#### 3. `transcripts`
```sql
Fields:
- id: UUID (PK)
- call_id: UUID (FK to calls)
- sequence_number: INTEGER
- role: VARCHAR(20) (user/assistant)
- text: TEXT
- language: VARCHAR(10)
- confidence: FLOAT
- is_final: BOOLEAN
- timestamp: TIMESTAMP

Unique: (call_id, sequence_number)
Indexes: call_id, timestamp, (call_id, sequence_number)
```

#### 4. `events`
```sql
Fields:
- id: UUID (PK)
- call_id: UUID (FK to calls)
- event_type: VARCHAR(50)
- event_data: JSONB
- timestamp: TIMESTAMP

Indexes: call_id, event_type, timestamp
```

#### 5. `users`
```sql
Fields:
- id: UUID (PK)
- username: VARCHAR(100) UNIQUE
- email: VARCHAR(255) UNIQUE
- password_hash: VARCHAR(255)
- full_name: VARCHAR(255)
- role: VARCHAR(20) (admin/operator/viewer)
- is_active: BOOLEAN
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- last_login: TIMESTAMP

Indexes: username, email, role
```

#### 6. `audit_logs`
```sql
Fields:
- id: UUID (PK)
- user_id: UUID (FK to users)
- action: VARCHAR(100)
- resource_type: VARCHAR(50)
- resource_id: VARCHAR(255)
- changes: JSONB
- ip_address: INET
- user_agent: TEXT
- timestamp: TIMESTAMP

Indexes: user_id, (resource_type, resource_id), timestamp, action
```

### Auto-Generated Ticket IDs
Format: `VMC-YYYY-NNNNN`
- VMC: Organization prefix
- YYYY: Current year
- NNNNN: Sequential 5-digit number (00001, 00002, ...)

Example: `VMC-2026-00042`

---

## 🔌 API Endpoints

### Calls API (`/api/calls`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Twilio webhook - start new call |
| WS | `/stream/{session_id}?lang=hi` | Audio streaming WebSocket |
| POST | `/{session_id}/dtmf` | Handle DTMF input |
| GET | `/{session_id}` | Get call status |
| POST | `/{session_id}/escalate` | Escalate to human |
| POST | `/{session_id}/end` | End call |
| GET | `/history` | List calls (with pagination) |
| POST | `/test/simulate-call` | Dev endpoint - simulate call |

### Complaints API (`/api/complaints`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create complaint manually |
| GET | `/` | List/search complaints |
| GET | `/{id}` | Get complaint details |
| PATCH | `/{id}` | Update complaint |
| DELETE | `/{id}` | Delete complaint |
| POST | `/{id}/correct-field` | Correct AI-extracted field |

### Admin API (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/takeover/{session_id}` | Operator takeover |
| GET | `/stats` | Dashboard statistics |
| GET | `/config` | System configuration |
| PUT | `/config` | Update configuration |
| GET | `/active-calls` | List active calls |

### WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/ws/dashboard` | Global dashboard events |
| `/ws/call/{session_id}` | Call-specific events |

### Health Check

| Endpoint | Description |
|----------|-------------|
| GET `/` | Basic health check |
| GET `/health` | Detailed service status |

---

## 📡 WebSocket Communication

### Event Types

#### call_started
```json
{
  "type": "call_started",
  "session_id": "call_20260124_001",
  "caller": "+919825012345",
  "language": "hi",
  "start_ts": "2026-01-24T10:30:00Z"
}
```

#### partial_transcript
```json
{
  "type": "partial_transcript",
  "session_id": "call_20260124_001",
  "text": "मेरे घर के सामने कचरा नहीं उठाया गया",
  "language": "hi",
  "confidence": 0.89,
  "is_final": false
}
```

#### final_transcript
```json
{
  "type": "final_transcript",
  "session_id": "call_20260124_001",
  "text": "मेरे घर के सामने तीन दिन से कचरा नहीं उठाया गया",
  "confidence": 0.95
}
```

#### form_update
```json
{
  "type": "form_update",
  "session_id": "call_20260124_001",
  "form": {
    "description": "कचरा तीन दिन से नहीं उठाया गया",
    "address": "12 MG Road, Sayajiganj, Vadodara"
  },
  "changes": [
    {
      "field": "address",
      "from": null,
      "to": "12 MG Road, Sayajiganj, Vadodara",
      "confidence": 0.88
    }
  ]
}
```

#### speak_action
```json
{
  "type": "speak_action",
  "session_id": "call_20260124_001",
  "tts_text": "कृपया अपना पिनकोड बताइए।",
  "tts_audio_url": "https://s3.amazonaws.com/..."
}
```

#### case_created
```json
{
  "type": "case_created",
  "session_id": "call_20260124_001",
  "case_id": "uuid-here",
  "ticket_id": "VMC-2026-00042",
  "status": "registered"
}
```

#### call_ended
```json
{
  "type": "call_ended",
  "session_id": "call_20260124_001",
  "end_ts": "2026-01-24T10:35:30Z",
  "duration_sec": 330
}
```

#### escalation_alert
```json
{
  "type": "escalation_alert",
  "session_id": "call_20260124_001",
  "reason": "Low confidence on required fields",
  "priority": "high"
}
```

---

## 🔄 Call Flow State Machine

### State Diagram

```
     ┌─────┐
     │INIT │ ◄─── Call starts
     └──┬──┘
        │ language_selected
        ▼
   ┌──────────┐
   │LISTENING │ ◄──┐
   └────┬─────┘    │
        │ vad_end  │ continue_asking
        ▼          │
  ┌───────────┐    │
  │PROCESSING │    │
  └─────┬─────┘    │
        │          │
   ┌────┴────┬─────┴────┬──────────┐
   │         │          │          │
   ▼         ▼          ▼          ▼
 [ask]   [confirm]   [file]   [escalate]
   │         │          │          │
   ▼         ▼          ▼          ▼
┌────────┐ ┌───────────┐ ┌──────┐ ┌─────────┐
│ASKING  │ │CONFIRMING│ │FILING│ │ESCALATED│
└────┬───┘ └─────┬─────┘ └───┬──┘ └─────────┘
     │           │            │
     └───────────┴────────────┤
                              ▼
                          ┌──────┐
                          │ENDED │
                          └──────┘
```

### State Descriptions

| State | Description | Next Action |
|-------|-------------|-------------|
| **INIT** | Language IVR playing | Wait for DTMF |
| **LISTENING** | Buffering caller speech | Process on silence |
| **PROCESSING** | Gemini extracting data | Decide next action |
| **ASKING** | AI asking follow-up question | Return to LISTENING |
| **CONFIRMING** | Reading back all fields | Wait for yes/no |
| **FILING** | Creating complaint in DB | Move to ENDED |
| **ESCALATED** | Transferred to human | Human handles |
| **ENDED** | Call completed | Cleanup |

### Decision Logic

```python
if missing_fields and retry_count < 2:
    next_action = "ask"
elif all_required_fields_present and confidence > 0.8:
    next_action = "confirm"
elif user_confirmed:
    next_action = "file"
elif safety_keywords or retry_count >= 2:
    next_action = "escalate"
```

---

## 🤖 AI Integration

### Gemini Configuration

**Model**: `gemini-2.0-flash-exp`

**Features Used**:
- Structured JSON output
- Function calling (future use)
- Thinking mode for complex reasoning
- Conversation history

**Token Limits**:
- Max input: ~30,000 tokens
- Max output: ~8,000 tokens

### System Prompt Strategy

```
You are an AI assistant for Vadodara Municipal Corporation.
Your job: Extract structured complaint data from conversations.

Input format:
{
  "history": [{"role": "user", "text": "..."}, ...],
  "current_form": {...}
}

Output format (JSON ONLY):
{
  "intent": "complaint" | "other",
  "complaint_type": "garbage_collection" | "water_supply" | ...,
  "fields": {
    "description": "...",
    "address": "...",
    "locality": "...",
    "pincode": "...",
    "landmark": "..."
  },
  "missing_fields": ["pincode"],
  "confidence": {"address": 0.88, ...},
  "next_action": "ask" | "confirm" | "file" | "escalate",
  "speak": "Short response in caller's language"
}

Rules:
1. Normalize addresses to English
2. Extract pincode from address if possible
3. Ask for ONE missing field at a time
4. Keep "speak" under 20 words
5. Escalate if uncertain about critical fields
```

### Sarvam AI Configuration

#### STT (Speech-to-Text)
- **Model**: `saarika:v2.5`
- **Languages**: `hi-IN`, `gu-IN`, `en-IN`
- **Streaming**: WebSocket
- **Sample Rate**: 16kHz (converted from 8kHz μ-law)

#### TTS (Text-to-Speech)
- **Model**: `bulbul:v2`
- **Speaker**: `meera`
- **Output**: Streaming audio
- **Format**: μ-law 8kHz for Twilio

---

## ⚡ Real-time Features

### 1. Live Call Monitoring
- Active calls appear instantly on dashboard
- Status updates (listening, processing, filing)
- Live transcript streaming
- Duration counter

### 2. Incoming Call Notifications
- Bottom-right popup when call arrives
- Sound alert (teamstone.mp3)
- Caller ID, language, intent
- Click to monitor

### 3. Form Field Updates
- Real-time field extraction
- Confidence indicators update live
- Color-coded by accuracy

### 4. Dashboard Statistics
- Auto-refreshing every 30s
- Active calls count
- Complaints registered today
- Average handle time

### 5. Heartbeat Mechanism
```javascript
// Server sends every 30s
{ "type": "heartbeat", "timestamp": "..." }

// Client responds with "ping"
// Server replies "pong"
```

---

## ⚙️ Configuration

### Backend Environment Variables

```bash
# Application
APP_NAME=VMC Voice AI
APP_ENV=development
DEBUG=true
SECRET_KEY=your-secret-key-change-in-production

# Server
HOST=0.0.0.0
PORT=8000
WORKERS=4

# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/vmc_voice_ai
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_SESSION_DB=1

# Twilio
TWILIO_ACCOUNT_SID=AC497f3df54557a95caa5368c0408bedb9
TWILIO_AUTH_TOKEN=11f44ff78dd07bf509c45efc7ecb21e5
TWILIO_PHONE_NUMBER=+17756180700
TWILIO_WEBHOOK_URL=https://your-domain.com/api/calls/start
TWILIO_STREAM_URL=wss://your-domain.com/api/calls/stream

# Google Gemini AI
GEMINI_API_KEY=GEMINI_KEY_REDACTED
GEMINI_MODEL=gemini-2.0-flash-exp

# Sarvam AI
SARVAM_API_KEY=sk_ol93ahss_i3GNLL7DhVMFfLC9lLK1IZkj
SARVAM_STT_MODEL=saarika:v2.5
SARVAM_TTS_MODEL=bulbul:v2
SARVAM_TTS_SPEAKER=meera

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=vmc-voice-ai-audio

# Security
JWT_SECRET_KEY=your-jwt-secret-key
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Feature Flags
ENABLE_CONSENT_ANNOUNCEMENT=true
ENABLE_CALL_RECORDING=true
DATA_RETENTION_DAYS=90
LOG_LEVEL=INFO
```

### Frontend Environment Variables

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# WebSocket URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## 🚀 Deployment

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- AWS S3 bucket
- Twilio account with programmable voice

### Backend Deployment

#### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

#### 2. Setup Database
```bash
# Create database
createdb vmc_voice_ai

# Run migration
psql $DATABASE_URL < app/db/migrations/001_initial_schema.sql
```

#### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

#### 4. Start Server
```bash
# Development
./start.sh

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Frontend Deployment

#### 1. Install Dependencies
```bash
cd frontend
npm install
```

#### 2. Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local
```

#### 3. Build & Run
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### Docker Deployment

```bash
# Backend
cd backend
docker build -t vmc-backend .
docker run -p 8000:8000 --env-file .env vmc-backend

# Frontend
cd frontend
docker build -t vmc-frontend .
docker run -p 3000:3000 vmc-frontend
```

### Twilio Configuration

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Select your number (+17756180700)
4. Under "Voice & Fax":
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://your-domain.com/api/calls/start`
   - **Method**: HTTP POST
5. Save configuration

---

## 🔒 Security & Privacy

### Data Protection

1. **Call Recording Consent**
   - Announced at call start
   - Consent flag stored in database

2. **PII Encryption**
   - Contact numbers encrypted at rest
   - TLS for data in transit

3. **Access Control**
   - Role-based permissions (admin/operator/viewer)
   - JWT authentication
   - Audit logs for all actions

4. **Data Retention**
   - Configurable retention period (default: 90 days)
   - Auto-deletion after retention
   - Manual deletion available

### Compliance

- **GDPR/Indian Privacy Laws**: Data export and deletion on request
- **Audit Trail**: All operator actions logged
- **Secure Storage**: Encrypted S3 buckets

---

## 📊 Monitoring & Observability

### Metrics Collected
- Calls per minute
- Average call duration
- Gemini latency
- STT/TTS latency
- AI accuracy rate
- Escalation rate

### Logging
- Structured JSON logs (structlog)
- Correlation IDs (session_id)
- Log levels: DEBUG, INFO, WARNING, ERROR

### Health Checks
- `/health` endpoint
- Service status: Gemini, Sarvam, Twilio, Database

---

## 🎯 Success Metrics

### Target KPIs
- **Call Answer Time**: < 5 seconds
- **Form Fill Accuracy**: > 85%
- **Escalation Rate**: < 10%
- **Avg Handle Time**: < 4 minutes
- **System Uptime**: > 99%

### Current Performance
- **AI Accuracy**: ~92.4%
- **Active Calls**: Real-time monitoring
- **Complaints Registered**: Auto-tracking

---

## 📝 Notes

### Known Issues
- Gemini response time can be slow (>40s) - causes WebSocket timeout
- Audio playback in notifications needs refinement

### Future Enhancements
- Native Gemini Live audio streaming
- Multi-tenant support for other cities
- Advanced analytics dashboard
- Mobile app for operators
- SMS/WhatsApp complaint filing

---

**Created**: 2026-01-24  
**Version**: 1.0.0  
**System**: VMC AI Call Center  
**Organization**: Vadodara Municipal Corporation
