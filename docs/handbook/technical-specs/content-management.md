# Content Management System Technical Specification

> **Related Documents**:
> - [CMS Setup Guide](./cms-setup.md) - Deployment, configuration and Git-based architecture
> - [Product Requirements](../product-requirements-document.md) - Business requirements and roadmap
> - [Infrastructure Spec](./infrastructure.md) - Infrastructure and deployment details

## Overview

This document provides the detailed technical specification for AI Square's content management features, including the visual rubrics builder, AI-powered content generation, media library, and version control capabilities. For deployment and configuration, see the [CMS Setup Guide](./cms-setup.md).

## Architecture Design

### Content Management Architecture
```
┌────────────────────────────────────────────────────────┐
│                  Content Platform                       │
├────────────────────────────────────────────────────────┤
│              Content Creation Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Visual    │  │     AI      │  │   Import/   │   │
│  │  Builder    │  │  Generator  │  │   Export    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│              Content Storage Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Media     │  │   Version   │  │  Metadata   │   │
│  │  Library    │  │   Control   │  │   Engine    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
├────────────────────────────────────────────────────────┤
│              Content Delivery Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │     CDN     │  │   Search    │  │   Preview   │   │
│  │  Integration│  │   Engine    │  │   Engine    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘   │
└────────────────────────────────────────────────────────┘
```

## Technical Requirements

### Core Components

1. **Visual Rubrics Builder**
   - Drag-and-drop interface
   - Real-time preview
   - Template library
   - Collaborative editing

2. **AI Content Generator**
   - Multi-format content creation
   - Context-aware generation
   - Style customization
   - Quality control

3. **Media Library**
   - Asset management
   - Image/video processing
   - Metadata extraction
   - Search capabilities

4. **Version Control**
   - Content versioning
   - Diff visualization
   - Rollback capabilities
   - Audit trail

## Implementation Details

### 1. Visual Rubrics Builder

```typescript
// frontend/components/rubrics/RubricsBuilder.tsx
import React, { useState, useCallback } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

interface RubricCriterion {
  id: string
  name: string
  description: string
  weight: number
  levels: RubricLevel[]
}

interface RubricLevel {
  id: string
  score: number
  label: string
  description: string
  indicators: string[]
}

interface VisualRubric {
  id: string
  name: string
  description: string
  type: 'analytic' | 'holistic' | 'checklist'
  criteria: RubricCriterion[]
  totalPoints: number
  metadata: Record<string, any>
}

const RubricsBuilder: React.FC = () => {
  const [rubric, setRubric] = useState<VisualRubric>({
    id: '',
    name: '',
    description: '',
    type: 'analytic',
    criteria: [],
    totalPoints: 100,
    metadata: {}
  })

  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // Drag and drop handlers
  const handleDrop = useCallback((item: any, targetId: string) => {
    if (item.type === 'criterion') {
      // Add or reorder criterion
      const newCriteria = [...rubric.criteria]
      const dragIndex = newCriteria.findIndex(c => c.id === item.id)
      const dropIndex = newCriteria.findIndex(c => c.id === targetId)
      
      if (dragIndex !== -1) {
        const [removed] = newCriteria.splice(dragIndex, 1)
        newCriteria.splice(dropIndex, 0, removed)
      }
      
      setRubric({ ...rubric, criteria: newCriteria })
    }
  }, [rubric])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="rubrics-builder">
        <RubricHeader 
          rubric={rubric}
          onUpdate={setRubric}
          onPreview={() => setPreviewMode(!previewMode)}
        />
        
        <div className="builder-workspace">
          <ComponentPalette />
          
          <div className="rubric-canvas">
            {previewMode ? (
              <RubricPreview rubric={rubric} />
            ) : (
              <RubricEditor 
                rubric={rubric}
                onUpdate={setRubric}
                selectedElement={selectedElement}
                onSelectElement={setSelectedElement}
                onDrop={handleDrop}
              />
            )}
          </div>
          
          <PropertiesPanel 
            rubric={rubric}
            selectedElement={selectedElement}
            onUpdate={setRubric}
          />
        </div>
        
        <RubricToolbar 
          onSave={() => saveRubric(rubric)}
          onExport={() => exportRubric(rubric)}
          onShare={() => shareRubric(rubric)}
        />
      </div>
    </DndProvider>
  )
}

// Criterion component with drag functionality
const CriterionCard: React.FC<{
  criterion: RubricCriterion
  onUpdate: (criterion: RubricCriterion) => void
  onDelete: () => void
}> = ({ criterion, onUpdate, onDelete }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'criterion',
    item: { id: criterion.id, type: 'criterion' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const [{ isOver }, drop] = useDrop({
    accept: 'criterion',
    drop: (item) => {
      // Handle drop logic
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  return (
    <div 
      ref={(node) => drag(drop(node))}
      className={`criterion-card ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''}`}
    >
      <div className="criterion-header">
        <input 
          value={criterion.name}
          onChange={(e) => onUpdate({ ...criterion, name: e.target.value })}
          className="criterion-name"
        />
        <span className="criterion-weight">{criterion.weight}%</span>
        <button onClick={onDelete} className="delete-btn">×</button>
      </div>
      
      <textarea 
        value={criterion.description}
        onChange={(e) => onUpdate({ ...criterion, description: e.target.value })}
        className="criterion-description"
      />
      
      <LevelsGrid 
        levels={criterion.levels}
        onUpdate={(levels) => onUpdate({ ...criterion, levels })}
      />
    </div>
  )
}

// Visual rubric grid component
const RubricGrid: React.FC<{ rubric: VisualRubric }> = ({ rubric }) => {
  return (
    <div className="rubric-grid">
      <table>
        <thead>
          <tr>
            <th>Criteria</th>
            {rubric.criteria[0]?.levels.map(level => (
              <th key={level.id}>
                {level.label} ({level.score} pts)
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rubric.criteria.map(criterion => (
            <tr key={criterion.id}>
              <td className="criterion-cell">
                <strong>{criterion.name}</strong>
                <p>{criterion.description}</p>
                <span className="weight">Weight: {criterion.weight}%</span>
              </td>
              {criterion.levels.map(level => (
                <td key={level.id} className="level-cell">
                  <p>{level.description}</p>
                  {level.indicators.length > 0 && (
                    <ul className="indicators">
                      {level.indicators.map((indicator, idx) => (
                        <li key={idx}>{indicator}</li>
                      ))}
                    </ul>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### 2. AI-Powered Content Generation (Phase 3+)

根據 PRD 的漸進式架構，AI 內容生成將在 Phase 3 後導入：

```python
# backend/content/ai_generator.py
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
from enum import Enum
import asyncio
import yaml
import json
from git import Repo

class ContentType(Enum):
    LESSON = "lesson"
    ASSESSMENT = "assessment"
    RUBRIC = "rubric"
    EXERCISE = "exercise"
    EXPLANATION = "explanation"
    SUMMARY = "summary"
    QUIZ = "quiz"

@dataclass
class ContentRequest:
    type: ContentType
    topic: str
    level: str  # beginner, intermediate, advanced
    style: Optional[str] = None  # formal, casual, technical
    format: Optional[str] = None  # yaml, json, markdown
    constraints: Optional[Dict] = None
    examples: Optional[List[str]] = None
    metadata: Optional[Dict] = None
    # 新增：Git-Based 相關欄位
    target_repo: Optional[str] = None
    target_branch: Optional[str] = "main"
    auto_commit: bool = False

@dataclass
class GeneratedContent:
    id: str
    type: ContentType
    content: Union[str, Dict, List]
    format: str
    metadata: Dict
    quality_score: float
    generated_at: datetime
    provider: str
    model: str
    # 新增：Git 相關資訊
    file_path: Optional[str] = None
    commit_hash: Optional[str] = None

class AIContentGenerator:
    """AI-powered content generation system with Git integration"""
    
    def __init__(self, ai_service, content_validator, git_service):
        self.ai = ai_service
        self.validator = content_validator
        self.git = git_service  # 新增：Git 服務
        self.templates = self._load_templates()
        self.quality_checker = ContentQualityChecker()
        
    async def generate_content(
        self, 
        request: ContentRequest
    ) -> GeneratedContent:
        """Generate content based on request with Git integration"""
        
        # Phase 2: 直接呼叫 LLM
        # Phase 3+: 透過 Agent 系統
        if hasattr(self.ai, 'use_agent_system'):
            return await self._generate_via_agent(request)
        
        # Select appropriate template and model
        template = self.templates.get(request.type)
        model_config = self._select_model_config(request)
        
        # Build generation prompt
        prompt = self._build_prompt(request, template)
        
        # Add examples if provided
        if request.examples:
            prompt = self._add_examples_to_prompt(prompt, request.examples)
            
        # Generate content
        raw_content = await self.ai.generate(
            prompt, 
            model_config
        )
        
        # Post-process based on format
        processed_content = await self._post_process(
            raw_content, 
            request.format
        )
        
        # Validate content
        validation_result = await self.validator.validate(
            processed_content, 
            request.type
        )
        
        if not validation_result.is_valid:
            # Attempt to fix issues
            processed_content = await self._fix_content_issues(
                processed_content, 
                validation_result.issues
            )
            
        # Check quality
        quality_score = await self.quality_checker.check(
            processed_content, 
            request
        )
        
        # Create generated content object
        generated = GeneratedContent(
            id=self._generate_content_id(),
            type=request.type,
            content=processed_content,
            format=request.format or "text",
            metadata={
                "topic": request.topic,
                "level": request.level,
                "style": request.style,
                **request.metadata
            },
            quality_score=quality_score,
            generated_at=datetime.utcnow(),
            provider=model_config["provider"],
            model=model_config["model"]
        )
        
        # Git-Based 內容儲存 (根據 PRD 3.3)
        if request.target_repo and request.auto_commit:
            file_path = await self._save_to_git(generated, request)
            generated.file_path = file_path
            if request.auto_commit:
                commit_hash = await self.git.commit_and_push(
                    repo=request.target_repo,
                    branch=request.target_branch,
                    message=f"AI Generated: {request.type.value} - {request.topic}",
                    files=[file_path]
                )
                generated.commit_hash = commit_hash
        
        return generated
        
    async def generate_lesson_plan(
        self, 
        topic: str, 
        duration_minutes: int,
        learning_objectives: List[str],
        student_level: str
    ) -> Dict:
        """Generate complete lesson plan"""
        
        # Generate main content sections
        sections = await asyncio.gather(
            self._generate_introduction(topic, student_level),
            self._generate_main_content(topic, learning_objectives, student_level),
            self._generate_activities(topic, student_level),
            self._generate_assessment_items(topic, learning_objectives),
            self._generate_summary(topic, learning_objectives)
        )
        
        lesson_plan = {
            "title": f"{topic} - {student_level.title()} Level",
            "duration_minutes": duration_minutes,
            "learning_objectives": learning_objectives,
            "sections": {
                "introduction": sections[0],
                "main_content": sections[1],
                "activities": sections[2],
                "assessment": sections[3],
                "summary": sections[4]
            },
            "materials_needed": await self._suggest_materials(topic),
            "differentiation_strategies": await self._generate_differentiation(
                topic, 
                student_level
            ),
            "extension_activities": await self._generate_extensions(topic)
        }
        
        return lesson_plan
        
    async def enhance_content(
        self, 
        original_content: str,
        enhancement_type: str
    ) -> str:
        """Enhance existing content"""
        
        enhancement_prompts = {
            "clarity": "Rewrite this content to be clearer and more concise",
            "engagement": "Make this content more engaging and interactive",
            "accessibility": "Improve accessibility for diverse learners",
            "examples": "Add relevant examples and illustrations",
            "visuals": "Suggest visual elements to support this content"
        }
        
        prompt = f"""
        {enhancement_prompts.get(enhancement_type, "Improve this content")}:
        
        {original_content}
        
        Maintain the core information while enhancing based on the request.
        """
        
        enhanced = await self.ai.generate(
            prompt,
            {"temperature": 0.7, "max_tokens": 2000}
        )
        
        return enhanced
        
    async def generate_multi_format(
        self, 
        content_request: ContentRequest,
        formats: List[str]
    ) -> Dict[str, GeneratedContent]:
        """Generate content in multiple formats"""
        
        # Generate base content
        base_content = await self.generate_content(content_request)
        
        # Convert to requested formats
        formatted_content = {}
        
        for format in formats:
            if format == content_request.format:
                formatted_content[format] = base_content
            else:
                converted = await self._convert_format(
                    base_content.content,
                    base_content.format,
                    format
                )
                
                formatted_content[format] = GeneratedContent(
                    id=f"{base_content.id}_{format}",
                    type=base_content.type,
                    content=converted,
                    format=format,
                    metadata=base_content.metadata,
                    quality_score=base_content.quality_score,
                    generated_at=base_content.generated_at,
                    provider=base_content.provider,
                    model=base_content.model
                )
                
        return formatted_content
        
    def _build_prompt(
        self, 
        request: ContentRequest, 
        template: str
    ) -> str:
        """Build generation prompt from request and template"""
        
        prompt_parts = [
            f"Generate {request.type.value} content for: {request.topic}",
            f"Target level: {request.level}",
        ]
        
        if request.style:
            prompt_parts.append(f"Style: {request.style}")
            
        if request.constraints:
            constraints_str = "\n".join([
                f"- {k}: {v}" for k, v in request.constraints.items()
            ])
            prompt_parts.append(f"Constraints:\n{constraints_str}")
            
        prompt_parts.append(f"\n{template}")
        
        return "\n\n".join(prompt_parts)

class ContentQualityChecker:
    """Check quality of generated content"""
    
    def __init__(self):
        self.criteria = {
            "accuracy": 0.3,
            "completeness": 0.25,
            "clarity": 0.2,
            "engagement": 0.15,
            "structure": 0.1
        }
        
    async def check(
        self, 
        content: Union[str, Dict], 
        request: ContentRequest
    ) -> float:
        """Evaluate content quality"""
        
        scores = {}
        
        # Check accuracy (using fact-checking service)
        scores["accuracy"] = await self._check_accuracy(content)
        
        # Check completeness
        scores["completeness"] = self._check_completeness(
            content, 
            request
        )
        
        # Check clarity
        scores["clarity"] = self._check_clarity(content)
        
        # Check engagement
        scores["engagement"] = self._check_engagement(
            content, 
            request.level
        )
        
        # Check structure
        scores["structure"] = self._check_structure(
            content, 
            request.type
        )
        
        # Calculate weighted score
        total_score = sum(
            scores[criterion] * weight 
            for criterion, weight in self.criteria.items()
        )
        
        return total_score
```


### 3. Media Library System

```python
# backend/content/media_library.py
from typing import List, Dict, Optional, BinaryIO
import asyncio
from PIL import Image
import moviepy.editor as mp
from pathlib import Path

@dataclass
class MediaAsset:
    id: str
    filename: str
    content_type: str
    size_bytes: int
    dimensions: Optional[Dict[str, int]] = None
    duration_seconds: Optional[float] = None
    metadata: Dict = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    created_by: str = None
    url: str = None
    thumbnail_url: Optional[str] = None
    
class MediaLibrary:
    """Comprehensive media asset management system"""
    
    def __init__(self, storage_backend, processor):
        self.storage = storage_backend
        self.processor = processor
        self.search_engine = MediaSearchEngine()
        
    async def upload_asset(
        self, 
        file: BinaryIO,
        filename: str,
        user_id: str,
        metadata: Optional[Dict] = None
    ) -> MediaAsset:
        """Upload and process media asset"""
        
        # Validate file type
        content_type = self._detect_content_type(filename)
        if not self._is_allowed_type(content_type):
            raise ValueError(f"File type {content_type} not allowed")
            
        # Generate unique ID and paths
        asset_id = self._generate_asset_id()
        storage_path = self._generate_storage_path(asset_id, filename)
        
        # Upload original file
        file_size = await self.storage.upload(
            file, 
            storage_path
        )
        
        # Process based on type
        processing_result = await self._process_asset(
            storage_path, 
            content_type
        )
        
        # Extract metadata
        extracted_metadata = await self._extract_metadata(
            storage_path, 
            content_type
        )
        
        # Create asset object
        asset = MediaAsset(
            id=asset_id,
            filename=filename,
            content_type=content_type,
            size_bytes=file_size,
            dimensions=processing_result.get("dimensions"),
            duration_seconds=processing_result.get("duration"),
            metadata={
                **extracted_metadata,
                **(metadata or {})
            },
            created_by=user_id,
            url=self.storage.get_url(storage_path),
            thumbnail_url=processing_result.get("thumbnail_url")
        )
        
        # Auto-tag asset
        asset.tags = await self._auto_tag_asset(asset)
        
        # Index for search
        await self.search_engine.index_asset(asset)
        
        # Store in database
        await self.db.media_assets.insert_one(asset.dict())
        
        return asset
        
    async def _process_asset(
        self, 
        path: str, 
        content_type: str
    ) -> Dict:
        """Process asset based on type"""
        
        result = {}
        
        if content_type.startswith("image/"):
            result = await self._process_image(path)
        elif content_type.startswith("video/"):
            result = await self._process_video(path)
        elif content_type.startswith("audio/"):
            result = await self._process_audio(path)
        elif content_type == "application/pdf":
            result = await self._process_pdf(path)
            
        return result
        
    async def _process_image(self, path: str) -> Dict:
        """Process image asset"""
        
        # Load image
        image = Image.open(path)
        
        # Get dimensions
        dimensions = {
            "width": image.width,
            "height": image.height
        }
        
        # Generate thumbnails
        thumbnails = await self._generate_image_thumbnails(
            image, 
            path
        )
        
        # Optimize for web
        optimized_path = await self._optimize_image(image, path)
        
        # Extract color palette
        colors = self._extract_color_palette(image)
        
        return {
            "dimensions": dimensions,
            "thumbnail_url": thumbnails["medium"],
            "thumbnails": thumbnails,
            "optimized_url": self.storage.get_url(optimized_path),
            "color_palette": colors
        }
        
    async def _process_video(self, path: str) -> Dict:
        """Process video asset"""
        
        # Load video
        video = mp.VideoFileClip(path)
        
        # Get properties
        dimensions = {
            "width": video.w,
            "height": video.h
        }
        duration = video.duration
        
        # Generate thumbnail
        thumbnail_path = await self._generate_video_thumbnail(
            video, 
            path
        )
        
        # Generate preview clip
        preview_path = await self._generate_preview_clip(
            video, 
            path
        )
        
        # Extract keyframes
        keyframes = await self._extract_keyframes(video)
        
        # Transcode for streaming
        streaming_versions = await self._transcode_for_streaming(
            video, 
            path
        )
        
        return {
            "dimensions": dimensions,
            "duration": duration,
            "thumbnail_url": self.storage.get_url(thumbnail_path),
            "preview_url": self.storage.get_url(preview_path),
            "keyframes": keyframes,
            "streaming_urls": streaming_versions
        }
        
    async def search_assets(
        self, 
        query: str,
        filters: Optional[Dict] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[MediaAsset]:
        """Search media assets"""
        
        # Build search query
        search_params = {
            "query": query,
            "filters": filters or {},
            "limit": limit,
            "offset": offset
        }
        
        # Execute search
        results = await self.search_engine.search(search_params)
        
        # Enhance results with usage data
        for asset in results:
            asset["usage_count"] = await self._get_usage_count(asset["id"])
            asset["last_used"] = await self._get_last_used(asset["id"])
            
        return results
        
    async def get_asset_analytics(
        self, 
        asset_id: str
    ) -> Dict:
        """Get analytics for media asset"""
        
        analytics = {
            "views": await self._get_view_count(asset_id),
            "downloads": await self._get_download_count(asset_id),
            "usage_contexts": await self._get_usage_contexts(asset_id),
            "performance_score": await self._calculate_performance_score(
                asset_id
            ),
            "recommendations": await self._get_similar_assets(asset_id)
        }
        
        return analytics

class MediaSearchEngine:
    """Search engine for media assets"""
    
    def __init__(self):
        self.index = self._initialize_search_index()
        
    async def index_asset(self, asset: MediaAsset):
        """Index asset for search"""
        
        # Extract searchable text
        searchable_text = self._extract_searchable_text(asset)
        
        # Extract visual features for similarity search
        if asset.content_type.startswith("image/"):
            visual_features = await self._extract_visual_features(
                asset.url
            )
        else:
            visual_features = None
            
        # Index document
        doc = {
            "id": asset.id,
            "filename": asset.filename,
            "text": searchable_text,
            "tags": asset.tags,
            "content_type": asset.content_type,
            "metadata": asset.metadata,
            "visual_features": visual_features,
            "created_at": asset.created_at
        }
        
        await self.index.add_document(doc)
        
    async def search(self, params: Dict) -> List[Dict]:
        """Execute search query"""
        
        # Parse query
        query = params["query"]
        filters = params.get("filters", {})
        
        # Build search query
        search_query = {
            "multi_match": {
                "query": query,
                "fields": ["filename^2", "text", "tags^1.5", "metadata.*"]
            }
        }
        
        # Apply filters
        if filters:
            filter_queries = []
            
            if "content_type" in filters:
                filter_queries.append({
                    "term": {"content_type": filters["content_type"]}
                })
                
            if "date_range" in filters:
                filter_queries.append({
                    "range": {
                        "created_at": {
                            "gte": filters["date_range"]["start"],
                            "lte": filters["date_range"]["end"]
                        }
                    }
                })
                
            search_query = {
                "bool": {
                    "must": search_query,
                    "filter": filter_queries
                }
            }
            
        # Execute search
        results = await self.index.search(
            search_query,
            size=params.get("limit", 20),
            from_=params.get("offset", 0)
        )
        
        return results
```

### 4. Version Control System

```python
# backend/content/version_control.py
from typing import List, Dict, Optional, Any
import difflib
import hashlib

@dataclass
class ContentVersion:
    id: str
    content_id: str
    version_number: int
    content: Any
    content_hash: str
    author_id: str
    message: str
    created_at: datetime
    parent_version: Optional[str] = None
    metadata: Dict = field(default_factory=dict)

@dataclass
class ContentDiff:
    version_a: str
    version_b: str
    changes: List[Dict]
    additions: int
    deletions: int
    modifications: int

class ContentVersionControl:
    """Version control system for content"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.diff_engine = DiffEngine()
        
    async def create_version(
        self,
        content_id: str,
        content: Any,
        author_id: str,
        message: str,
        parent_version: Optional[str] = None
    ) -> ContentVersion:
        """Create new version of content"""
        
        # Get current version number
        current_version = await self._get_latest_version(content_id)
        version_number = (current_version.version_number + 1) if current_version else 1
        
        # Calculate content hash
        content_hash = self._calculate_hash(content)
        
        # Check if content actually changed
        if current_version and current_version.content_hash == content_hash:
            raise ValueError("No changes detected in content")
            
        # Create version object
        version = ContentVersion(
            id=self._generate_version_id(),
            content_id=content_id,
            version_number=version_number,
            content=content,
            content_hash=content_hash,
            author_id=author_id,
            message=message,
            created_at=datetime.utcnow(),
            parent_version=parent_version or (current_version.id if current_version else None)
        )
        
        # Store version
        await self.db.content_versions.insert_one(version.dict())
        
        # Update content pointer to latest version
        await self._update_content_pointer(content_id, version.id)
        
        return version
        
    async def get_diff(
        self,
        version_a_id: str,
        version_b_id: str
    ) -> ContentDiff:
        """Get diff between two versions"""
        
        # Retrieve versions
        version_a = await self.get_version(version_a_id)
        version_b = await self.get_version(version_b_id)
        
        # Calculate diff
        changes = self.diff_engine.calculate_diff(
            version_a.content,
            version_b.content
        )
        
        # Create diff object
        diff = ContentDiff(
            version_a=version_a_id,
            version_b=version_b_id,
            changes=changes,
            additions=sum(1 for c in changes if c["type"] == "add"),
            deletions=sum(1 for c in changes if c["type"] == "delete"),
            modifications=sum(1 for c in changes if c["type"] == "modify")
        )
        
        return diff
        
    async def rollback(
        self,
        content_id: str,
        target_version_id: str,
        author_id: str,
        reason: str
    ) -> ContentVersion:
        """Rollback content to specific version"""
        
        # Get target version
        target_version = await self.get_version(target_version_id)
        
        # Create new version with old content
        rollback_version = await self.create_version(
            content_id=content_id,
            content=target_version.content,
            author_id=author_id,
            message=f"Rollback to version {target_version.version_number}: {reason}",
            parent_version=None  # Break the chain to indicate rollback
        )
        
        # Add rollback metadata
        rollback_version.metadata["rollback"] = {
            "from_version": await self._get_latest_version(content_id),
            "to_version": target_version_id,
            "reason": reason
        }
        
        await self.db.content_versions.update_one(
            {"id": rollback_version.id},
            {"$set": {"metadata": rollback_version.metadata}}
        )
        
        return rollback_version
        
    async def merge_versions(
        self,
        version_a_id: str,
        version_b_id: str,
        merge_strategy: str,
        author_id: str
    ) -> ContentVersion:
        """Merge two versions of content"""
        
        version_a = await self.get_version(version_a_id)
        version_b = await self.get_version(version_b_id)
        
        # Perform merge based on strategy
        if merge_strategy == "auto":
            merged_content = await self._auto_merge(
                version_a.content,
                version_b.content
            )
        elif merge_strategy == "manual":
            # Return conflict markers for manual resolution
            merged_content = self._create_conflict_markers(
                version_a.content,
                version_b.content
            )
        else:
            raise ValueError(f"Unknown merge strategy: {merge_strategy}")
            
        # Create merged version
        merged_version = await self.create_version(
            content_id=version_a.content_id,
            content=merged_content,
            author_id=author_id,
            message=f"Merge versions {version_a.version_number} and {version_b.version_number}"
        )
        
        # Add merge metadata
        merged_version.metadata["merge"] = {
            "version_a": version_a_id,
            "version_b": version_b_id,
            "strategy": merge_strategy
        }
        
        return merged_version
        
    async def get_version_history(
        self,
        content_id: str,
        limit: int = 50
    ) -> List[ContentVersion]:
        """Get version history for content"""
        
        versions = await self.db.content_versions.find(
            {"content_id": content_id}
        ).sort("version_number", -1).limit(limit).to_list()
        
        # Add diff summary to each version
        for i, version in enumerate(versions):
            if i < len(versions) - 1:
                diff = await self.get_diff(
                    versions[i + 1]["id"],
                    version["id"]
                )
                version["diff_summary"] = {
                    "additions": diff.additions,
                    "deletions": diff.deletions,
                    "modifications": diff.modifications
                }
                
        return versions
        
    def _calculate_hash(self, content: Any) -> str:
        """Calculate hash of content"""
        
        # Convert content to string representation
        if isinstance(content, dict):
            content_str = json.dumps(content, sort_keys=True)
        elif isinstance(content, list):
            content_str = json.dumps(content)
        else:
            content_str = str(content)
            
        # Calculate SHA-256 hash
        return hashlib.sha256(content_str.encode()).hexdigest()

class DiffEngine:
    """Engine for calculating content differences"""
    
    def calculate_diff(
        self,
        content_a: Any,
        content_b: Any
    ) -> List[Dict]:
        """Calculate diff between two content objects"""
        
        if isinstance(content_a, str) and isinstance(content_b, str):
            return self._text_diff(content_a, content_b)
        elif isinstance(content_a, dict) and isinstance(content_b, dict):
            return self._dict_diff(content_a, content_b)
        elif isinstance(content_a, list) and isinstance(content_b, list):
            return self._list_diff(content_a, content_b)
        else:
            return self._generic_diff(content_a, content_b)
            
    def _text_diff(self, text_a: str, text_b: str) -> List[Dict]:
        """Calculate text diff"""
        
        lines_a = text_a.splitlines()
        lines_b = text_b.splitlines()
        
        diff = difflib.unified_diff(
            lines_a,
            lines_b,
            lineterm=''
        )
        
        changes = []
        for line in diff:
            if line.startswith('+'):
                changes.append({
                    "type": "add",
                    "content": line[1:],
                    "line": len(changes)
                })
            elif line.startswith('-'):
                changes.append({
                    "type": "delete",
                    "content": line[1:],
                    "line": len(changes)
                })
                
        return changes
        
    def _dict_diff(self, dict_a: Dict, dict_b: Dict) -> List[Dict]:
        """Calculate dictionary diff"""
        
        changes = []
        
        # Check for added keys
        for key in dict_b:
            if key not in dict_a:
                changes.append({
                    "type": "add",
                    "path": key,
                    "value": dict_b[key]
                })
                
        # Check for deleted keys
        for key in dict_a:
            if key not in dict_b:
                changes.append({
                    "type": "delete",
                    "path": key,
                    "value": dict_a[key]
                })
                
        # Check for modified values
        for key in dict_a:
            if key in dict_b and dict_a[key] != dict_b[key]:
                changes.append({
                    "type": "modify",
                    "path": key,
                    "old_value": dict_a[key],
                    "new_value": dict_b[key]
                })
                
        return changes
```

## API Specifications

### Visual Builder Endpoints

#### POST /api/rubrics/create
Create new rubric
```json
{
  "name": "Essay Rubric",
  "type": "analytic",
  "criteria": [
    {
      "name": "Content",
      "weight": 40,
      "levels": [...]
    }
  ]
}
```

#### GET /api/rubrics/{id}
Get rubric details

#### PUT /api/rubrics/{id}
Update rubric

#### POST /api/rubrics/{id}/preview
Generate rubric preview

### Content Generation Endpoints

#### POST /api/content/generate
Generate AI content
```json
{
  "type": "lesson",
  "topic": "Machine Learning Basics",
  "level": "beginner",
  "format": "markdown",
  "constraints": {
    "max_words": 1000,
    "include_examples": true
  }
}
```

#### POST /api/content/enhance
Enhance existing content
```json
{
  "content": "...",
  "enhancement_type": "clarity"
}
```

### Media Library Endpoints

#### POST /api/media/upload
Upload media asset
```
Content-Type: multipart/form-data
file: <binary>
metadata: {"tags": ["math", "geometry"]}
```

#### GET /api/media/search
Search media assets
```json
{
  "query": "geometry",
  "filters": {
    "content_type": "image/*",
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-12-31"
    }
  }
}
```

### Version Control Endpoints

#### POST /api/content/{id}/versions
Create new version
```json
{
  "content": {...},
  "message": "Updated introduction section"
}
```

#### GET /api/content/{id}/versions
Get version history

#### GET /api/versions/{id}/diff
Get diff between versions

#### POST /api/content/{id}/rollback
Rollback to version
```json
{
  "target_version_id": "v123",
  "reason": "Reverting accidental changes"
}
```

## Database Schema

```sql
-- Content items
CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50),
    title VARCHAR(255),
    current_version_id UUID,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Content versions
CREATE TABLE content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content_items(id),
    version_number INTEGER,
    content JSONB,
    content_hash VARCHAR(64),
    author_id UUID REFERENCES users(id),
    message TEXT,
    parent_version UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    UNIQUE(content_id, version_number)
);

-- Media assets
CREATE TABLE media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255),
    content_type VARCHAR(100),
    size_bytes BIGINT,
    storage_path TEXT,
    url TEXT,
    thumbnail_url TEXT,
    dimensions JSONB,
    duration_seconds FLOAT,
    metadata JSONB,
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rubrics
CREATE TABLE rubrics_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    type VARCHAR(50),
    description TEXT,
    criteria JSONB,
    total_points DECIMAL(5,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    metadata JSONB
);

-- Content usage tracking
CREATE TABLE content_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID,
    content_type VARCHAR(50),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50),
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Storage Architecture

### Cloud Storage Structure
```
/content/
  /rubrics/
    /{user_id}/
      /{rubric_id}/
        /versions/
        /exports/
  /media/
    /images/
      /{year}/{month}/
        /original/
        /thumbnails/
        /processed/
    /videos/
      /{year}/{month}/
        /original/
        /transcoded/
        /thumbnails/
    /documents/
      /{year}/{month}/
  /generated/
    /{content_type}/
      /{date}/
```

## Performance Optimization

### Caching Strategy
```python
cache_config = {
    # Generated content cache (TTL: 24 hours)
    "generated_content": {
        "key": "content:generated:{hash(request)}",
        "ttl": 86400
    },
    
    # Media metadata cache (TTL: 1 hour)
    "media_metadata": {
        "key": "media:metadata:{asset_id}",
        "ttl": 3600
    },
    
    # Version history cache (TTL: 15 minutes)
    "version_history": {
        "key": "content:versions:{content_id}",
        "ttl": 900
    },
    
    # Search results cache (TTL: 5 minutes)
    "search_results": {
        "key": "search:{hash(query)}",
        "ttl": 300
    }
}
```

### CDN Configuration
- Static assets served through CloudFlare CDN
- Dynamic image resizing at edge
- Video adaptive bitrate streaming
- Geographic content distribution

## Security Considerations

### Access Control
- Role-based permissions for content operations
- Public/private content visibility
- Sharing permissions with granular control
- Audit logging for all modifications

### Content Security
- Virus scanning for uploaded files
- Content moderation for generated text
- NSFW detection for images/videos
- Plagiarism checking for educational content

### Data Protection
- Encryption at rest for sensitive content
- Secure URLs with expiration for media
- Version history retention policies
- GDPR-compliant data handling

## Monitoring & Analytics

### Key Metrics
- Content generation success rate
- Media upload/processing times
- Storage usage trends
- Popular content tracking
- Version control activity

### Content Analytics
```python
analytics_metrics = {
    "content_performance": {
        "views": "Track content view counts",
        "engagement": "Time spent, interactions",
        "effectiveness": "Learning outcome correlation"
    },
    "generation_metrics": {
        "quality_scores": "AI content quality tracking",
        "generation_time": "Time to generate content",
        "revision_rate": "How often content is edited"
    },
    "media_metrics": {
        "usage_frequency": "How often assets are used",
        "storage_efficiency": "Compression ratios",
        "processing_time": "Media processing duration"
    }
}
```

## Implementation Roadmap

See [CMS Setup Guide - Implementation Roadmap](./cms-setup.md#implementation-roadmap) for the complete phased implementation plan.

## 技術債務與優化

### 優先處理項目
1. **內容驗證框架**：確保 YAML/JSON 格式正確性
2. **Git 操作優化**：批次處理減少 API 呼叫
3. **快取策略**：從記憶體快取逐步升級到 Redis
4. **錯誤處理**：完善的錯誤訊息和復原機制

### 效能目標
- 內容載入時間 < 200ms
- 編輯器回應時間 < 100ms
- Git 操作完成時間 < 2s
- 並發編輯支援 > 50 users