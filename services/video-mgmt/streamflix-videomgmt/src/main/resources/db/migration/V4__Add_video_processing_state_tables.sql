-- Create table for video processing state machine persistence
CREATE TABLE video_processing_states (
    video_id UUID PRIMARY KEY,
    current_state VARCHAR(50) NOT NULL,
    last_updated TIMESTAMP,
    last_event VARCHAR(100),
    error_details VARCHAR(1000),
    retry_count INT DEFAULT 0,
    compensating_transaction BOOLEAN DEFAULT FALSE
);

-- Create table required by Spring Statemachine JPA persistence
CREATE TABLE spring_statemachine (
    id VARCHAR(255) PRIMARY KEY,
    machine_id VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    state_machine_context BYTEA
);

-- Create index for faster lookups by state
CREATE INDEX idx_video_processing_current_state 
ON video_processing_states(current_state);

-- Create index for compensating transactions
CREATE INDEX idx_video_processing_compensating 
ON video_processing_states(compensating_transaction) 
WHERE compensating_transaction = TRUE;
