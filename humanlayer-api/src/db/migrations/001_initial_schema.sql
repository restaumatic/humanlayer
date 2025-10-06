-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,  -- First 8 chars for display (e.g., "sk-test-")
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    is_active BOOLEAN NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- Function Calls table
CREATE TABLE IF NOT EXISTS function_calls (
    call_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,

    -- Spec fields (JSON would be simpler but expanding for queryability)
    fn TEXT NOT NULL,
    kwargs TEXT NOT NULL,  -- JSON
    channel TEXT,  -- JSON (ContactChannel)
    reject_options TEXT,  -- JSON array
    state TEXT,  -- JSON

    -- Metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

    -- Foreign key to status (1:1 relationship)
    -- CONSTRAINT fk_status FOREIGN KEY (call_id) REFERENCES function_call_status(call_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_function_calls_run_id ON function_calls(run_id);
CREATE INDEX IF NOT EXISTS idx_function_calls_created_at ON function_calls(created_at);

-- Function Call Status table (1:1 with function_calls)
CREATE TABLE IF NOT EXISTS function_call_status (
    call_id TEXT PRIMARY KEY,
    requested_at DATETIME NOT NULL,
    responded_at DATETIME,
    approved BOOLEAN,  -- NULL = pending, 1 = approved, 0 = denied
    comment TEXT,
    reject_option_name TEXT,
    slack_message_ts TEXT,

    FOREIGN KEY (call_id) REFERENCES function_calls(call_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_function_call_status_approved ON function_call_status(approved);

-- Human Contacts table
CREATE TABLE IF NOT EXISTS human_contacts (
    call_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,

    -- Spec fields
    msg TEXT NOT NULL,
    subject TEXT,
    channel TEXT,  -- JSON (ContactChannel)
    response_options TEXT,  -- JSON array
    state TEXT,  -- JSON

    -- Metadata
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP

    -- CONSTRAINT fk_status FOREIGN KEY (call_id) REFERENCES human_contact_status(call_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_human_contacts_run_id ON human_contacts(run_id);
CREATE INDEX IF NOT EXISTS idx_human_contacts_created_at ON human_contacts(created_at);

-- Human Contact Status table (1:1 with human_contacts)
CREATE TABLE IF NOT EXISTS human_contact_status (
    call_id TEXT PRIMARY KEY,
    requested_at DATETIME,
    responded_at DATETIME,
    response TEXT,
    response_option_name TEXT,

    FOREIGN KEY (call_id) REFERENCES human_contacts(call_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_human_contact_status_response ON human_contact_status(response);
