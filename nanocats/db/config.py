"""Database configuration and constants."""

from pathlib import Path

# Data directory and database path
DATA_DIR = Path.home() / ".nanocats" / "data"
DB_PATH = DATA_DIR / "nanocats.db"

# Buffer configuration
BUFFER_SIZE = 100
FLUSH_INTERVAL = 10  # seconds

# Table names
TABLE_TOKEN_USAGE = "token_usage"
TABLE_LOGS = "logs"

# Index names
INDEX_TOKEN_TIMESTAMP = "idx_token_timestamp"
INDEX_TOKEN_AGENT = "idx_token_agent"
INDEX_LOGS_TIMESTAMP = "idx_logs_timestamp"
INDEX_LOGS_TYPE = "idx_logs_type"
INDEX_LOGS_AGENT = "idx_logs_agent"
