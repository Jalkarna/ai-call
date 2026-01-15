# VMC Voice AI - Admin Dashboard Frontend

A modern Next.js 16 admin dashboard for the Vadodara Municipal Corporation Voice AI Call Center System. This frontend provides real-time monitoring, complaint management, and call analytics.

## 🚀 Features

- **Real-time Call Monitoring** - WebSocket-powered live call feed with status updates
- **AI Confidence Indicators** - Visual representation of extraction accuracy
- **Human Takeover Controls** - Seamless transition from AI to human operators
- **Complaint Management** - Full CRUD with inline editing and field corrections
- **Audio Playback** - Built-in player for call recordings
- **Transcript Timeline** - Interactive conversation view with speaker differentiation
- **Dark/Light Mode** - Theme toggle with system preference detection
- **Responsive Design** - Works on desktop, tablet, and mobile

## 📁 Project Structure

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Dashboard home
│   ├── layout.tsx           # Root layout with providers
│   ├── loading.tsx          # Global loading state
│   ├── calls/
│   │   ├── page.tsx         # Call list with filters
│   │   └── [id]/page.tsx    # Call detail with transcript
│   ├── complaints/
│   │   ├── page.tsx         # Complaint list with search
│   │   └── [id]/page.tsx    # Complaint detail with editing
│   ├── analytics/
│   │   └── page.tsx         # Charts and statistics
│   └── settings/
│       └── page.tsx         # System configuration
│
├── components/               # Reusable components
│   ├── ui/                  # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── layout/
│   │   └── shell.tsx        # App shell with sidebar
│   ├── audio-player.tsx     # Call recording playback
│   ├── confidence-indicator.tsx  # AI confidence visualization
│   ├── notification-panel.tsx    # Real-time alerts sidebar
│   ├── takeover-modal.tsx   # Human takeover controls
│   ├── transcript-timeline.tsx  # Conversation display
│   ├── mode-toggle.tsx      # Dark/light theme switch
│   └── theme-provider.tsx   # Theme context provider
│
├── lib/                     # Utilities and services
│   ├── api.ts              # API service layer
│   ├── types.ts            # TypeScript interfaces
│   ├── websocket.ts        # WebSocket hooks
│   ├── mock-data.ts        # Demo data generators
│   └── utils.ts            # Helper functions
│
└── public/                  # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16.1.1 with App Router & Turbopack
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui + Radix UI primitives
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Theme**: next-themes

## 📦 Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# WebSocket URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Backend Connection

The frontend expects the FastAPI backend to be running on port 8000. See the Backend README for setup instructions.

## 📚 Component Library

### Core Components

#### `AudioPlayer`
Full-featured audio player for call recordings.

```tsx
import { AudioPlayer } from "@/components/audio-player";

<AudioPlayer
  src="/recordings/call-123.wav"  // Optional: falls back to demo
  title="Call Recording"
  duration={180}  // seconds
/>
```

#### `ConfidenceIndicator`
Visual representation of AI extraction confidence.

```tsx
import { ConfidenceIndicator, ConfidenceBadge, FieldWithConfidence } from "@/components/confidence-indicator";

// Progress bar
<ConfidenceIndicator confidence={0.92} size="md" />

// Badge only
<ConfidenceBadge confidence={0.88} />

// Field with inline edit
<FieldWithConfidence
  label="Address"
  value="123 Main St"
  confidence={0.85}
  editable
  onEdit={() => handleEdit("address")}
/>
```

#### `TranscriptTimeline`
Interactive conversation display.

```tsx
import { TranscriptTimeline, LiveTranscriptIndicator } from "@/components/transcript-timeline";

<TranscriptTimeline
  entries={transcriptEntries}
  height="400px"
  showConfidence
  autoScroll
/>

// For live calls
<LiveTranscriptIndicator isRecording={true} />
```

#### `TakeoverModal`
Human takeover controls for live calls.

```tsx
import { TakeoverModal } from "@/components/takeover-modal";

<TakeoverModal
  callId="call-123"
  sessionId="session-456"
  callerNumber="+91 98250 XXXXX"
  currentIntent="Garbage Collection"
  language="Hindi"
  sentiment="Frustrated"
  extractedFields={{ address: "123 Main St" }}
  onTakeover={(data) => handleTakeover(data)}
  onEscalate={(data) => handleEscalate(data)}
/>
```

#### `NotificationPanel`
Real-time alerts sidebar.

```tsx
import { NotificationPanel } from "@/components/notification-panel";

<NotificationPanel />  // Auto-connects to WebSocket
```

## 🔌 API Integration

### API Service Layer

```tsx
import { callsApi, complaintsApi, adminApi, healthApi } from "@/lib/api";

// Fetch calls with filters
const calls = await callsApi.list({
  status: "Completed",
  language: "Hindi",
  limit: 20,
  offset: 0,
});

// Get call details
const call = await callsApi.getById("call-123");

// Request human takeover
await callsApi.takeover("call-123", "session-456", "Customer requested");

// Complaints
const complaints = await complaintsApi.list({ urgency: "Critical" });
await complaintsApi.update("complaint-123", { status: "In Progress" });
await complaintsApi.correctField("complaint-123", "location", "New Address");
```

### WebSocket Hooks

```tsx
import { useWebSocket, useLiveCallFeed, useCallSession, useSystemAlerts } from "@/lib/websocket";

// Generic WebSocket connection
const { events, isConnected } = useWebSocket("live_calls");

// Live call feed for dashboard
const { activeCalls, stats } = useLiveCallFeed();

// Subscribe to specific call session
const { transcript, extractedFields, callState } = useCallSession("session-123");

// System alerts
const { alerts, clearAlert } = useSystemAlerts();
```

## 🎨 Theming

The app uses next-themes for dark/light mode support.

```tsx
import { ModeToggle } from "@/components/mode-toggle";

<ModeToggle />  // Toggle button

// Or programmatically
import { useTheme } from "next-themes";
const { theme, setTheme } = useTheme();
```

## 📊 TypeScript Interfaces

Key types matching the backend models:

```tsx
import type {
  CallLog,
  CallDetail,
  Complaint,
  ComplaintDetail,
  WebSocketEvent,
  FormUpdateEvent,
  GeminiResponse,
  FieldConfidence,
  TranscriptEntry,
} from "@/lib/types";
```

## 🧪 Development

```bash
# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint

# Type check
npx tsc --noEmit
```

## 📝 Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats, live calls, recent complaints |
| `/calls` | Paginated call list with filters |
| `/calls/[id]` | Call detail with audio, transcript, extracted fields |
| `/complaints` | Searchable complaint list |
| `/complaints/[id]` | Complaint detail with edit, status update |
| `/analytics` | Charts for call volume, categories, SLA |
| `/settings` | System configuration, user management |

## 🔗 Related

- [Backend Documentation](../Backend/README.md) - FastAPI backend setup

## 📄 License

MIT License - Vadodara Municipal Corporation Voice AI Project
