# Real-Time Call Center Implementation

This document describes the real-time functionality implemented for the VMC AI Call Center system.

## Overview

The system now provides full real-time synchronization between backend events, database updates, and frontend display. All call data is fetched dynamically from the database and updated live via WebSocket connections.

## Key Features Implemented

### 1. Real-Time WebSocket Communication
- **Backend**: WebSocket broadcaster service manages connections and events
- **Frontend**: Global WebSocket manager with automatic reconnection
- **Events**: Call lifecycle events (started, updated, ended), transcript updates, form updates

### 2. Database Integration
- **Call Storage**: All calls stored in PostgreSQL with proper relationships
- **Real-Time Updates**: Database updates trigger WebSocket events
- **Data Consistency**: Frontend displays actual database data, not mock data

### 3. Live Call Monitoring
- **Active Calls**: Real-time display of ongoing calls on dashboard
- **Call Details**: Live transcript updates and form extraction
- **Status Updates**: Real-time call state changes (listening, thinking, speaking)

### 4. API Endpoints Enhanced
- **Call History**: Paginated call history with filtering
- **Call Details**: Real-time call status and transcript data
- **Test Simulation**: Development endpoint for testing real-time features

## Architecture

```
Twilio Call → Backend API → Call Orchestrator → Database + WebSocket
                                                      ↓
Frontend Dashboard ← WebSocket Manager ← WebSocket Events
```

## WebSocket Events

### Dashboard Events
- `active_calls_update`: Live list of active calls
- `call_started`: New call initiated
- `call_ended`: Call completed

### Call-Specific Events
- `final_transcript`: User speech transcribed
- `speak_action`: AI response generated
- `form_update`: Extracted fields updated
- `system_state`: AI state changes (listening/thinking/speaking)

## Frontend Components Updated

### Dashboard (`/`)
- Live calls panel shows real active calls
- Real-time statistics from database
- WebSocket connection status indicator

### Call List (`/calls`)
- Real database call history
- Proper pagination and filtering
- Status mapping from backend

### Call Details (`/calls/[id]`)
- Real-time transcript updates for active calls
- Live form extraction display
- AI state indicators

## Database Schema

### Calls Table
- `session_id`: Unique call identifier
- `caller_number`: Phone number
- `status`: Call status (active, completed, dropped, escalated)
- `start_time`, `end_time`: Call timing
- `call_metadata`: JSON field for additional data

### Transcripts Table
- `call_id`: Foreign key to calls
- `sequence_number`: Order of transcript entries
- `role`: 'user' or 'assistant'
- `text`: Transcript content
- `confidence`: STT confidence score

### Events Table
- `call_id`: Foreign key to calls
- `event_type`: Type of event
- `event_data`: JSON event payload
- `timestamp`: When event occurred

## Testing

### Development Test Endpoint
```bash
POST /api/calls/test/simulate-call
```

This endpoint creates a simulated call with:
1. Call start event
2. Transcript update
3. Form extraction
4. AI response

### WebSocket Testing
1. Open browser developer tools
2. Navigate to dashboard
3. Check WebSocket connection in Network tab
4. Trigger test call to see real-time updates

## Configuration

### Backend Environment Variables
- `CORS_ORIGINS`: Frontend URLs for CORS
- Database connection settings
- Service API keys (Twilio, Gemini, Sarvam)

### Frontend Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_WS_URL`: WebSocket URL (defaults to API URL)

## Deployment Notes

1. **WebSocket Support**: Ensure load balancer supports WebSocket connections
2. **Database**: PostgreSQL with proper indexes on frequently queried fields
3. **CORS**: Configure backend CORS for frontend domain
4. **SSL**: Use WSS for WebSocket connections in production

## Monitoring

- WebSocket connection status displayed on dashboard
- Backend logs structured events for monitoring
- Database events stored for audit trail
- Real-time call metrics available

## Future Enhancements

1. **Call Recording**: Real-time audio streaming and playback
2. **Operator Takeover**: Live handoff to human operators
3. **Advanced Analytics**: Real-time dashboard metrics
4. **Multi-tenant**: Support for multiple municipal corporations
5. **Mobile App**: Real-time mobile dashboard for field operators

## Troubleshooting

### WebSocket Connection Issues
- Check CORS configuration
- Verify WebSocket URL is accessible
- Check browser console for connection errors

### Data Not Updating
- Verify database connection
- Check backend logs for event broadcasting errors
- Ensure frontend WebSocket hooks are properly subscribed

### Performance Issues
- Monitor WebSocket connection count
- Check database query performance
- Consider implementing event throttling for high-volume scenarios