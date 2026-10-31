from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

import os

# Allow overriding the SQLite DB path via FORESIGHT_DB_PATH env var; defaults to ./foresight.db relative to working directory
SQLALCHEMY_DATABASE_URL = f"sqlite:///{os.getenv('FORESIGHT_DB_PATH', './foresight.db')}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
