# VMC Voice AI Backend

AI-driven municipal call center backend for Vadodara Municipal Corporation. This FastAPI application orchestrates voice calls using Twilio, processes speech with OpenAI Whisper, extracts structured data with Gemini AI, and generates natural responses with Sarvam AI TTS.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           VMC Voice AI System                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │   Twilio    │────▶│  FastAPI    │────▶│  Dashboard  │               │
│  │   Voice     │◀────│  Backend    │◀────│  (WebSocket)│               │
│  └─────────────┘     └──────┬──────┘     └─────────────┘               │
│                             │                                           │
│         ┌───────────────────┼───────────────────┐                       │
│         │                   │                   │                       │
│         ▼                   ▼                   ▼                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │   Whisper   │     │   Gemini    │     │  Sarvam AI  │               │
│  │    (STT)    │     │   (LLM)     │     │    (TTS)    │               │
│  └─────────────┘     └─────────────┘     └─────────────┘               │
│                             │                                           │
│                    ┌────────┴────────┐                                  │
│                    ▼                 ▼                                  │
│             ┌─────────────┐   ┌─────────────┐                          │
│             │  PostgreSQL │   │    Redis    │                          │
│             │  (Storage)  │   │  (Session)  │                          │
│             └─────────────┘   └─────────────┘                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Backend/
├── app/
│   ├── api/                    # API route handlers
│   │   ├── calls.py           # Call management endpoints
│   │   ├── complaints.py      # Complaint CRUD endpoints
│   │   └── admin.py           # Admin & config endpoints
│   ├── services/              # Business logic & integrations
│   │   ├── twilio_client.py   # Twilio voice API
│   │   ├── stt_client.py      # Whisper STT integration
│   │   ├── tts_client.py      # Sarvam AI TTS integration
│   │   ├── gemini_client.py   # Gemini AI for extraction
│   │   ├── state_machine.py   # Call flow state machine
│   │   └── websocket_broadcaster.py  # Real-time updates
│   ├── models/                # Database models (Pydantic + SQLAlchemy)
│   │   ├── call.py            # Call log models
│   │   ├── complaint.py       # Complaint models
│   │   └── user.py            # User & audit models
│   ├── schemas/               # JSON schemas & prompts
│   │   ├── complaint_schema.json    # Gemini response schema
│   │   └── gemini_system_prompt.txt # System prompt
│   ├── db/                    # Database configuration
│   │   └── migrations/        # Alembic migrations
│   └── main.py                # FastAPI application entry
├── tests/                     # Test suite
├── Dockerfile                 # Container configuration
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variables template
└── README.md                  # This file
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- FFmpeg (for audio processing)

### Installation

1. **Clone and navigate to backend:**
   ```bash
   cd Backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   .\venv\Scripts\activate  # Windows
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start the server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Docker Deployment

```bash
# Build image
docker build -t vmc-voice-ai-backend .

# Run container
docker run -d \
  --name vmc-backend \
  -p 8000:8000 \
  --env-file .env \
  vmc-voice-ai-backend
```

## 📡 API Endpoints

### Calls API (`/api/calls`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/start` | Twilio webhook for incoming calls |
| WS | `/stream/{session_id}` | Media stream WebSocket |
| GET | `/` | List all calls (paginated) |
| GET | `/{call_id}` | Get call details |
| POST | `/{call_id}/takeover` | Human takeover |
| POST | `/{call_id}/escalate` | Escalate call |
| WS | `/live` | Dashboard live feed |

### Complaints API (`/api/complaints`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List complaints (filtered) |
| POST | `/` | Create complaint |
| GET | `/{id}` | Get complaint details |
| PATCH | `/{id}` | Update complaint |
| DELETE | `/{id}` | Delete complaint |
| POST | `/{id}/fields` | Update extracted fields |
| GET | `/stats/summary` | Statistics |

### Admin API (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config` | Get system config |
| PUT | `/config` | Update config |
| GET | `/users` | List users |
| POST | `/users` | Create user |
| GET | `/audit-logs` | Audit logs |
| GET | `/stats/dashboard` | Dashboard stats |
| POST | `/data-export/{phone}` | GDPR export |
| DELETE | `/data-delete/{phone}` | GDPR delete |

## 🔄 Call Flow State Machine

```
IDLE ──▶ GREETING ──▶ LISTENING ──▶ PROCESSING ──┬──▶ ASKING ──────┐
                          ▲                      │                 │
                          │                      ├──▶ CONFIRMING ──┤
                          │                      │                 │
                          └──────────────────────┴─────────────────┘
                                                 │
                                                 ├──▶ FILING ──▶ ENDING
                                                 │
                                                 └──▶ ESCALATING ──▶ TRANSFERRING
```

### States

- **IDLE**: No active call
- **GREETING**: Playing welcome message
- **LISTENING**: Waiting for user speech
- **PROCESSING**: STT/LLM processing
- **ASKING**: Requesting missing information
- **CONFIRMING**: Verifying extracted data
- **FILING**: Creating complaint record
- **ESCALATING**: Preparing human transfer
- **TRANSFERRING**: Connecting to operator
- **ENDING**: Farewell and hangup

## 🔌 WebSocket Events

Real-time events broadcast to dashboard:

```typescript
interface WebSocketEvent {
  type: "call_started" | "call_updated" | "call_ended" | 
        "transcript_update" | "form_update" | 
        "complaint_created" | "escalation";
  session_id: string;
  timestamp: string;
  data: object;
}
```

### Form Update Event Example

```json
{
  "type": "form_update",
  "session_id": "call_20250115_00001",
  "timestamp": "2025-01-15T09:53:25+05:30",
  "form": {
    "complaint_type": "missed_collection",
    "address": "12 MG Road, Sayajiganj"
  },
  "changes": [
    {
      "field": "address",
      "from": null,
      "to": "12 MG Road, Sayajiganj",
      "confidence": 0.92
    }
  ]
}
```

## 🤖 Gemini AI Integration

### Request Payload

```python
{
    "model": "gemini-3.0-flash",
    "system": "<system_prompt>",
    "input": {
        "session_id": "call_xxx",
        "history": [...],
        "current_form": {...},
        "language": "hi"
    },
    "response_format": {
        "type": "json_schema",
        "schema": {...}
    }
}
```

### Response Schema

```json
{
  "intent": "complaint",
  "complaint_type": "missed_collection",
  "fields": {
    "address": "12 MG Road, Sayajiganj, Vadodara",
    "contact_number": "+9198210XXXXX"
  },
  "missing_fields": ["pincode"],
  "confidence": {"address": 0.92, "contact_number": 0.85},
  "next_action": "ask",
  "speak": "कृपया अपना पिनकोड बताएं।"
}
```

## 🔒 Security

- **Authentication**: JWT-based with role-based access control
- **Data Encryption**: TLS in transit, encrypted PII at rest
- **Audit Logging**: All actions logged with user context
- **Data Retention**: Configurable retention with auto-deletion
- **GDPR Compliance**: Data export and deletion endpoints
- **Consent**: Call recording announcement at start

## 📊 Monitoring

### Metrics Collected

- Calls per minute, average duration
- Gemini/Whisper/TTS latency
- Error rates by service
- Form extraction confidence distribution
- Escalation rates

### OpenTelemetry Integration

```bash
# Traces exported to OTLP endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
```

## 🧪 Testing

```bash
# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Specific test file
pytest tests/test_gemini_client.py -v
```

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Yes |
| `OPENAI_API_KEY` | OpenAI API key (Whisper) | Yes |
| `GOOGLE_API_KEY` | Google API key (Gemini) | Yes |
| `SARVAM_API_KEY` | Sarvam AI API key (TTS) | Yes |
| `JWT_SECRET_KEY` | JWT signing secret | Yes |
| `AWS_S3_BUCKET` | S3 bucket for recordings | No |

## 🚦 Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "twilio": "ready",
    "gemini": "ready",
    "whisper": "ready",
    "sarvam_tts": "ready"
  }
}
```

## 📄 License

Proprietary - Vadodara Municipal Corporation

---

Built with ❤️ for Vadodara Municipal Corporation
