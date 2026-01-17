# VMC AI Call Center - Backend

AI-powered inbound call system for Vadodara Municipal Corporation using Gemini 3 Flash, Sarvam AI (STT/TTS), and Twilio.

## Features

- ✅ **Gemini 3 Flash** for structured complaint extraction
- ✅ **Sarvam AI STT** for multi-language speech-to-text (Hindi/Gujarati/English)
- ✅ **Sarvam AI TTS** for natural voice responses
- ✅ **State machine** for deterministic call flow management
- ✅ **WebSocket streaming** for real-time audio processing
- ✅ **PostgreSQL** for persistent storage
- ✅ **Redis** for session management
- ✅ **Real-time dashboard** via WebSocket events

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Setup Environment Variables

Copy and configure `.env`:

```bash
# Already configured with your credentials
# Just verify DATABASE_URL and REDIS_URL match your setup
```

### 3. Setup Database

```bash
# Create database
createdb vmc_voice_ai

# Run migration
psql $DATABASE_URL < app/db/migrations/001_initial_schema.sql
```

### 4. Start the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Configure Twilio

1. Go to [Twilio Console](https://console.twilio.com)
2. Configure your phone number (+17756180700)
3. Set webhook URL: `https://your-domain.com/api/calls/start`
4. Save configuration

## API Endpoints

### Calls
- `POST /api/calls/start` - Twilio webhook for incoming calls
- `WS /api/calls/stream/{session_id}` - Audio streaming WebSocket
- `POST /api/calls/{session_id}/dtmf` - DTMF input handler
- `GET /api/calls/{session_id}` - Get call status
- `POST /api/calls/{session_id}/escalate` - Escalate to human
- `POST /api/calls/{session_id}/end` - End call

### Complaints
- `POST /api/complaints` - Create complaint
- `GET /api/complaints` - List/search complaints (with pagination)
- `GET /api/complaints/{id}` - Get complaint details
- `PATCH /api/complaints/{id}` - Update complaint
- `DELETE /api/complaints/{id}` - Delete complaint

### Admin
- `POST /api/admin/takeover/{session_id}` - Operator takeover
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/config` - System configuration
- `PUT /api/admin/config` - Update configuration
- `GET /api/admin/active-calls` - List active calls

### WebSocket
- `WS /ws/dashboard` - Dashboard real-time events
- `WS /ws/call/{session_id}` - Call-specific events

## Architecture

```
Caller (PSTN)
↓
Twilio
↓ WebSocket Audio Stream
FastAPI Orchestrator
├→ Sarvam STT → Transcript
├→ Gemini 3 Flash → Structured JSON
├→ State Machine → Next Action
├→ Sarvam TTS → Audio Response
├→ PostgreSQL → Persistence
└→ WebSocket → Dashboard Events
```

## Call Flow States

1. **INIT** - Language selection IVR
2. **LISTENING** - Receiving caller speech
3. **PROCESSING** - Gemini extracting data
4. **ASKING** - AI asking for missing info
5. **CONFIRMING** - Confirming extracted data
6. **FILING** - Creating complaint in DB
7. **ESCALATED** - Transferred to human
8. **ENDED** - Call completed

## Configuration

### Environment Variables

```bash
# Gemini AI
GEMINI_API_KEY=GEMINI_KEY_REDACTED
GEMINI_MODEL=gemini-3-flash-preview

# Sarvam AI (STT & TTS)
SARVAM_API_KEY=sk_ol93ahss_i3GNLL7DhVMFfLC9lLK1IZkj
SARVAM_STT_MODEL=saarika:v2.5
SARVAM_TTS_MODEL=bulbul:v2

# Twilio
TWILIO_ACCOUNT_SID=AC497f3df54557a95caa5368c0408bedb9
TWILIO_AUTH_TOKEN=11f44ff78dd07bf509c45efc7ecb21e5
TWILIO_PHONE_NUMBER=+17756180700

# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/vmc_voice_ai

# Redis (optional for production)
REDIS_URL=redis://localhost:6379/0
```

## Development

### Running Tests

```bash
pytest tests/ -v
```

### Code Quality

```bash
# Format code
black app/

# Lint
flake8 app/

# Type check
mypy app/
```

## Production Deployment

### Using Docker

```bash
# Build image
docker build -t vmc-voice-ai-backend .

# Run container
docker run -p 8000:8000 --env-file .env vmc-voice-ai-backend
```

### Using ngrok (for local development)

```bash
ngrok http 8000
```

Then use the ngrok HTTPS URL in Twilio configuration.

## Monitoring

- **Logs**: Structured JSON logs to stdout
- **Health Check**: `GET /health`
- **Dashboard**: WebSocket real-time events at `/ws/dashboard`

## Troubleshooting

### Database Connection Errors

```bash
# Verify PostgreSQL is running
pg_isready

# Check connection
psql $DATABASE_URL
```

### API Key Issues

```bash
# Verify environment variables are loaded
python -c "import os; print(os.getenv('GEMINI_API_KEY'))"
```

### Twilio WebSocket Issues

- Ensure your server has a public HTTPS URL
- Check Twilio webhook logs in Twilio Console
- Verify WebSocket endpoint is accessible

## License

MIT License - Hackathon Project

## Support

For issues, check logs:
```bash
# View application logs
tail -f logs/app.log

# View structured logs
cat logs/app.log | jq '.'
```
