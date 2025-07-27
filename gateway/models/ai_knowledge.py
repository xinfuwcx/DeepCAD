"""
AI Knowledge base and vector search models
"""
from sqlalchemy import Column, String, JSON, Float, Boolean, ForeignKey, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from .base import BaseModel
import enum


class KnowledgeType(enum.Enum):
    """Types of knowledge in the system"""
    ENGINEERING_STANDARD = "engineering_standard"
    DESIGN_CASE = "design_case"
    RESEARCH_PAPER = "research_paper"
    BEST_PRACTICE = "best_practice"
    FAILURE_CASE = "failure_case"
    CALCULATION_METHOD = "calculation_method"
    CODE_REFERENCE = "code_reference"


class KnowledgeSource(enum.Enum):
    """Source of knowledge"""
    MANUAL_INPUT = "manual_input"
    DOCUMENT_UPLOAD = "document_upload"
    API_IMPORT = "api_import"
    USER_EXPERIENCE = "user_experience"
    COMPUTATION_RESULT = "computation_result"


class KnowledgeEntry(BaseModel):
    """Core knowledge base entry with vector search support"""
    __tablename__ = 'knowledge_entries'
    
    # Content
    title = Column(String(500), nullable=False, index=True)
    content = Column(Text, nullable=False)
    summary = Column(String(1000), nullable=True)
    
    # Classification
    knowledge_type = Column(String(50), nullable=False)  # Using string for flexibility
    knowledge_source = Column(String(50), nullable=False)
    tags = Column(JSON, nullable=True)  # Array of string tags
    
    # Metadata
    language = Column(String(10), default='zh', nullable=False)
    confidence_score = Column(Float, default=1.0)  # Reliability of information
    
    # Document information
    source_document = Column(String(500), nullable=True)
    page_number = Column(Integer, nullable=True)
    section_reference = Column(String(200), nullable=True)
    
    # Usage tracking
    access_count = Column(Integer, default=0)
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    
    # Vector embedding for semantic search (1536 dimensions for OpenAI embeddings)
    embedding = Column(Vector(1536), nullable=True)
    
    # Validation and quality
    is_verified = Column(Boolean, default=False)
    verified_by = Column(UUID(as_uuid=True), nullable=True)
    verification_date = Column(DateTime(timezone=True), nullable=True)


class DesignCase(BaseModel):
    """Specific design case with detailed parameters"""
    __tablename__ = 'design_cases'
    
    # Project information
    project_name = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    project_type = Column(String(100), nullable=False)
    completion_year = Column(Integer, nullable=True)
    
    # Design parameters (JSON for flexibility)
    excavation_geometry = Column(JSON, nullable=False)
    support_system = Column(JSON, nullable=False)
    soil_conditions = Column(JSON, nullable=False)
    
    # Performance data
    monitoring_data = Column(JSON, nullable=True)
    performance_metrics = Column(JSON, nullable=True)
    lessons_learned = Column(Text, nullable=True)
    
    # Files and references
    drawing_files = Column(JSON, nullable=True)  # File paths/URLs
    report_files = Column(JSON, nullable=True)
    photo_files = Column(JSON, nullable=True)
    
    # Associated knowledge entry
    knowledge_entry_id = Column(UUID(as_uuid=True), ForeignKey('knowledge_entries.id'), nullable=False)
    knowledge_entry = relationship("KnowledgeEntry")


class EngineeringStandard(BaseModel):
    """Engineering standards and codes"""
    __tablename__ = 'engineering_standards'
    
    # Standard identification
    standard_code = Column(String(50), nullable=False, unique=True, index=True)
    standard_title = Column(String(300), nullable=False)
    issuing_body = Column(String(200), nullable=False)
    
    # Version information
    version = Column(String(20), nullable=False)
    publication_date = Column(DateTime(timezone=True), nullable=True)
    effective_date = Column(DateTime(timezone=True), nullable=True)
    
    # Geographic scope
    country = Column(String(50), nullable=True)
    region = Column(String(100), nullable=True)
    
    # Content structure
    sections = Column(JSON, nullable=True)  # Hierarchical section structure
    formulas = Column(JSON, nullable=True)  # Key formulas with parameters
    tables = Column(JSON, nullable=True)    # Standard tables and values
    
    # Status
    is_current = Column(Boolean, default=True)
    superseded_by = Column(UUID(as_uuid=True), nullable=True)
    
    # Associated knowledge entry
    knowledge_entry_id = Column(UUID(as_uuid=True), ForeignKey('knowledge_entries.id'), nullable=False)
    knowledge_entry = relationship("KnowledgeEntry")


class CalculationMethod(BaseModel):
    """Calculation methods and formulas"""
    __tablename__ = 'calculation_methods'
    
    # Method identification
    method_name = Column(String(200), nullable=False, index=True)
    method_category = Column(String(100), nullable=False)  # stability, settlement, etc.
    
    # Mathematical definition
    formula = Column(Text, nullable=False)  # LaTeX or MathML format
    variables = Column(JSON, nullable=False)  # Variable definitions
    units = Column(JSON, nullable=False)     # Unit specifications
    
    # Applicability
    applicable_conditions = Column(JSON, nullable=True)
    limitations = Column(Text, nullable=True)
    accuracy_range = Column(String(100), nullable=True)
    
    # Implementation
    python_code = Column(Text, nullable=True)  # Python implementation
    example_calculation = Column(JSON, nullable=True)
    
    # References
    source_standard = Column(String(100), nullable=True)
    research_papers = Column(JSON, nullable=True)
    
    # Associated knowledge entry
    knowledge_entry_id = Column(UUID(as_uuid=True), ForeignKey('knowledge_entries.id'), nullable=False)
    knowledge_entry = relationship("KnowledgeEntry")


class UserQuery(BaseModel):
    """User queries for learning and improvement"""
    __tablename__ = 'user_queries'
    
    # Query content
    query_text = Column(Text, nullable=False)
    query_type = Column(String(50), nullable=False)  # search, calculation, design, etc.
    
    # Context
    user_context = Column(JSON, nullable=True)  # Current project context
    session_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Processing
    intent_classification = Column(String(100), nullable=True)
    extracted_parameters = Column(JSON, nullable=True)
    
    # Response
    response_text = Column(Text, nullable=True)
    knowledge_sources = Column(JSON, nullable=True)  # Which entries were used
    confidence_score = Column(Float, nullable=True)
    
    # Feedback
    user_rating = Column(Integer, nullable=True)  # 1-5 scale
    user_feedback = Column(Text, nullable=True)
    
    # Query embedding for analysis
    query_embedding = Column(Vector(1536), nullable=True)


class KnowledgeRelation(BaseModel):
    """Relations between knowledge entries"""
    __tablename__ = 'knowledge_relations'
    
    # Related entries
    source_id = Column(UUID(as_uuid=True), ForeignKey('knowledge_entries.id'), nullable=False)
    target_id = Column(UUID(as_uuid=True), ForeignKey('knowledge_entries.id'), nullable=False)
    
    # Relation type
    relation_type = Column(String(50), nullable=False)  # references, contradicts, extends, etc.
    relation_strength = Column(Float, default=1.0)  # 0-1 scale
    
    # Context
    relation_context = Column(Text, nullable=True)
    is_verified = Column(Boolean, default=False)
    
    # Relationships
    source_entry = relationship("KnowledgeEntry", foreign_keys=[source_id])
    target_entry = relationship("KnowledgeEntry", foreign_keys=[target_id])