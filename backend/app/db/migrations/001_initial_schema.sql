-- VMC AI Call Center - Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2026-01-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CALLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    caller_number VARCHAR(20) NOT NULL,
    twilio_call_sid VARCHAR(255),
    language VARCHAR(10) DEFAULT 'hi', -- hi, gu, en
    status VARCHAR(20) DEFAULT 'active', -- active, completed, escalated, failed
    current_state VARCHAR(20) DEFAULT 'init', -- init, listening, processing, asking, confirming, filing, escalated, ended
    start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    recording_url TEXT,
    call_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for calls
CREATE INDEX idx_calls_session_id ON calls(session_id);
CREATE INDEX idx_calls_caller_number ON calls(caller_number);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_start_time ON calls(start_time DESC);
CREATE INDEX idx_calls_twilio_sid ON calls(twilio_call_sid);

-- ============================================
-- COMPLAINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    ticket_id VARCHAR(50) UNIQUE NOT NULL,
    complaint_type VARCHAR(50) NOT NULL, -- garbage_collection, missed_collection, streetlight, water_supply, drainage, road_repair, stray_animal, encroachment, other
    description TEXT,
    address TEXT NOT NULL,
    locality VARCHAR(255),
    pincode VARCHAR(10),
    contact_number VARCHAR(255), -- Encrypted
    landmark VARCHAR(255),
    urgency VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    status VARCHAR(30) DEFAULT 'registered', -- registered, assigned, in_progress, resolved, closed
    confidence_scores JSONB DEFAULT '{}',
    assigned_to UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Indexes for complaints
CREATE INDEX idx_complaints_ticket_id ON complaints(ticket_id);
CREATE INDEX idx_complaints_call_id ON complaints(call_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX idx_complaints_pincode ON complaints(pincode);
CREATE INDEX idx_complaints_complaint_type ON complaints(complaint_type);

-- ============================================
-- TRANSCRIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL, -- user, assistant
    text TEXT NOT NULL,
    language VARCHAR(10),
    confidence FLOAT,
    is_final BOOLEAN DEFAULT false,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(call_id, sequence_number)
);

-- Indexes for transcripts
CREATE INDEX idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX idx_transcripts_timestamp ON transcripts(timestamp);
CREATE INDEX idx_transcripts_call_sequence ON transcripts(call_id, sequence_number);

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- call_started, partial_transcript, final_transcript, form_update, speak_action, case_created, call_ended, escalation_alert
    event_data JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX idx_events_call_id ON events(call_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'viewer', -- admin, operator, viewer
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Indexes for users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- AUDIT_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    changes JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate ticket ID
CREATE OR REPLACE FUNCTION generate_ticket_id()
RETURNS TRIGGER AS $$
DECLARE
    year_str VARCHAR(4);
    sequence_num INTEGER;
    new_ticket_id VARCHAR(50);
BEGIN
    -- Get current year
    year_str := TO_CHAR(NOW(), 'YYYY');
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM complaints
    WHERE ticket_id LIKE 'VMC-' || year_str || '-%';
    
    -- Generate ticket ID: VMC-YYYY-NNNNN
    new_ticket_id := 'VMC-' || year_str || '-' || LPAD(sequence_num::TEXT, 5, '0');
    
    NEW.ticket_id := new_ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Trigger to auto-generate ticket ID if not provided
CREATE TRIGGER generate_ticket_id_trigger BEFORE INSERT ON complaints
    FOR EACH ROW
    WHEN (NEW.ticket_id IS NULL OR NEW.ticket_id = '')
    EXECUTE FUNCTION generate_ticket_id();

-- ============================================
-- SEED DATA (Development)
-- ============================================

-- Create default admin user (password: admin123 - change in production!)
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
    'admin',
    'admin@vmc.gov.in',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5K9BlB5jDvKly', -- bcrypt hash of 'admin123'
    'System Administrator',
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Create sample operator user (password: operator123)
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
    'operator1',
    'operator@vmc.gov.in',
    '$2b$12$8VJ8FNmwzW7zqLqZXxGKB.r8hT9p4EQqtJQBEhTXGWQvjCYzRn0Zy', -- bcrypt hash of 'operator123'
    'Call Center Operator',
    'operator'
) ON CONFLICT (username) DO NOTHING;

COMMIT;
