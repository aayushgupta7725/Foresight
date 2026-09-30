from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .connection import Base


class User(Base):
    __tablename__ = "users"
    id       = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email    = Column(String, unique=True, index=True)


class Project(Base):
    __tablename__ = "projects"
    id           = Column(Integer, primary_key=True, index=True)
    project_id   = Column(String, unique=True, index=True)
    project_name = Column(String)
    agency       = Column(String)
    state        = Column(String)
    sector       = Column(String, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    snapshots    = relationship("ProjectSnapshot", back_populates="project",
                                cascade="all, delete-orphan")


class ProjectSnapshot(Base):
    __tablename__ = "project_snapshots"
    id            = Column(Integer, primary_key=True, index=True)
    project_id    = Column(String, ForeignKey("projects.project_id"), index=True)
    snapshot_date = Column(String)

    start_date        = Column(String, nullable=True)
    original_end_date = Column(String, nullable=True)
    revised_end_date  = Column(String, nullable=True)

    original_cost     = Column(Float, nullable=True)
    revised_cost      = Column(Float, nullable=True)
    expenditure       = Column(Float, nullable=True)
    physical_progress = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="snapshots")


class RiskResult(Base):
    __tablename__ = "risk_results"
    id            = Column(Integer, primary_key=True, index=True)
    project_id    = Column(String, ForeignKey("projects.project_id"), index=True)
    snapshot_date = Column(String)
    risk_score    = Column(Float)
    risk_label    = Column(String)
    risk_factors  = Column(Text, nullable=True)
    next_cycle_revision_risk = Column(Float, nullable=True)
    cost_revision_risk       = Column(Float, nullable=True)
    combined_risk_score      = Column(Float, nullable=True)
    shap_factors             = Column(Text, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"
    id            = Column(Integer, primary_key=True, index=True)
    project_id    = Column(String, ForeignKey("projects.project_id"), index=True)
    snapshot_date = Column(String)
    alert_type    = Column(String)
    severity      = Column(String)
    message       = Column(Text)
    is_read       = Column(Boolean, default=False)
    created_at    = Column(DateTime, default=datetime.utcnow)


class DataSource(Base):
    __tablename__ = "data_sources"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String)
    source_type   = Column(String)
    file_path     = Column(String, nullable=True)
    snapshot_date = Column(String)
    total_records = Column(Integer, default=0)
    status        = Column(String, default="processed")
    created_at    = Column(DateTime, default=datetime.utcnow)


class AgencySectorMap(Base):
    __tablename__ = "agency_sector_map"
    id         = Column(Integer, primary_key=True, index=True)
    agency     = Column(String, unique=True, index=True)
    sector     = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class SimulationResult(Base):
    __tablename__ = "simulation_results"
    id            = Column(Integer, primary_key=True, index=True)
    project_id    = Column(String, ForeignKey("projects.project_id"), index=True)
    scenario_name = Column(String, nullable=True)
    parameters    = Column(Text)
    result        = Column(Text)
    created_at    = Column(DateTime, default=datetime.utcnow)


class ColumnMapping(Base):
    __tablename__ = "column_mappings"
    id             = Column(Integer, primary_key=True, index=True)
    source_name    = Column(String)
    target_field   = Column(String)
    data_source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
