"""
Database module — SQLite connection and schema initialization.
Kept separate so the database layer can be swapped (e.g. PostgreSQL) without
touching business logic.
"""

import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "../../database/wardrobe.db"))
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "../../database/schema.sql")


def get_connection() -> sqlite3.Connection:
    """Return a new SQLite connection with row_factory set for dict-like access."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create all tables if they don't already exist."""
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    with open(SCHEMA_PATH, "r") as f:
        schema = f.read()
    conn = get_connection()
    with conn:
        conn.executescript(schema)
    conn.close()
    print(f"[DB] Initialised at {DB_PATH}")
