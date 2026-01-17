#!/bin/bash

# VMC AI Call Center - Startup Script

set -e

echo "🚀 Starting VMC AI Call Center Backend..."

# Check environment
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with all required credentials."
    exit 1
fi

# Load environment
export $(cat .env | grep -v '^#' | xargs)

echo "✅ Environment loaded"

# Check database
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL not set, using default"
    export DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5432/vmc_voice_ai"
fi

echo "📦 Checking dependencies..."
pip install -r requirements.txt --quiet

echo "🗄️  Setting up database..."

# Check if database exists
if PGPASSWORD=vmc_ai_2026 psql -U postgres -h localhost -d vmc_voice_ai -c '\q' 2>/dev/null; then
    echo "✅ Database connected"
    
    # Run migration if needed
    if [ -f "app/db/migrations/001_initial_schema.sql" ]; then
        echo "🔨 Running database migrations..."
        PGPASSWORD=vmc_ai_2026 psql -U postgres -h localhost -d vmc_voice_ai -f app/db/migrations/001_initial_schema.sql 2>&1 | grep -v "ERROR.*already exists" | grep -E "(CREATE TABLE|INSERT|ERROR)" || true
        echo "✅ Migrations complete"
    fi
else
    echo "⚠️  Warning: Cannot connect to database"
    echo "Please ensure PostgreSQL is running and DATABASE_URL is correct"
fi

echo "🔍 Checking API keys..."

if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ Error: GEMINI_API_KEY not set!"
    exit 1
fi
echo "✅ Gemini API key found"

if [ -z "$SARVAM_API_KEY" ]; then
    echo "❌ Error: SARVAM_API_KEY not set!"
    exit 1
fi
echo "✅ Sarvam API key found"

if [ -z "$TWILIO_ACCOUNT_SID" ]; then
    echo "⚠️  Warning: Twilio credentials not configured"
else
    echo "✅ Twilio credentials found"
fi

echo ""
echo "=========================================="
echo  "VMC AI Call Center Backend"
echo "=========================================="
echo ""
echo "📍 Server will start on http://0.0.0.0:8000"
echo "📊 Health check: http://localhost:8000/health"
echo "📡 API docs: http://localhost:8000/docs"
echo ""
echo "🔗 Twilio Webhook URL (use with ngrok):"
echo "   POST https://your-domain.com/api/calls/start"
echo ""
echo "=========================================="
echo ""

# Start the server
echo "🚀 Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
