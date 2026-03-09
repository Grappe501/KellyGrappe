import json
import psycopg2
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "platform" / "schema_discovery.json"

DB_URL = os.getenv("SUPABASE_DB_URL")

def connect():
    return psycopg2.connect(DB_URL)

def discover_tables(conn):

    cur = conn.cursor()

    cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
    """)

    return [r[0] for r in cur.fetchall()]


def discover_columns(conn, table):

    cur = conn.cursor()

    cur.execute(f"""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name='{table}'
    """)

    return [{"name": r[0], "type": r[1]} for r in cur.fetchall()]


def discover_schema():

    conn = connect()

    tables = discover_tables(conn)

    schema = {}

    for table in tables:

        schema[table] = {
            "columns": discover_columns(conn, table)
        }

    conn.close()

    return schema


def build():

    schema = discover_schema()

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT,"w") as f:
        json.dump(schema,f,indent=2)

    print("Schema discovery complete")
    print("Tables discovered:",len(schema))


if __name__ == "__main__":
    build()