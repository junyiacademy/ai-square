# AI Integration Technical Specification

## Overview

This document outlines the technical architecture for integrating multiple Large Language Models (LLMs) and implementing the Model Context Protocol (MCP) for AI Square's intelligent tutoring and assistant systems.

## Architecture Design

### Multi-LLM Integration Architecture
```
┌─────────────────────────────────────────────────────┐
│                   AI Square Platform                 │
├─────────────────────────────────────────────────────┤
│              AI Orchestration Layer                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Router    │  │   Cache     │  │  Rate Limit │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────┤
│              Model Abstraction Layer                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ OpenAI API  │  │ Google AI   │  │ Anthropic   │ │
│  │   (GPT-4)   │  │  (Gemini)   │  │  (Claude)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────┤
│                  MCP Protocol Layer                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Context   │  │   Tools     │  │  Prompts    │ │
│  │  Provider   │  │  Registry   │  │  Templates  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Technical Requirements

### Core Components

1. **LLM Integration Service**
   - Unified API interface for multiple LLM providers
   - Dynamic model selection based on task requirements
   - Fallback mechanisms for high availability
   - Response streaming support

2. **MCP Implementation**
   - Context window management
   - Tool registration and execution
   - Prompt template system
   - Memory persistence

3. **Agent Orchestration**
   - Multi-agent coordination
   - Task decomposition
   - Result aggregation
   - State management

## Implementation Details

### 1. Unified LLM Interface

```python
# backend/ai/llm_interface.py
from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, List, Optional
from dataclasses import dataclass

@dataclass
class LLMConfig:
    model: str
    temperature: float = 0.7
    max_tokens: int = 2000
    top_p: float = 1.0
    stream: bool = False
    
@dataclass
class Message:
    role: str  # 'system', 'user', 'assistant'
    content: str
    metadata: Optional[Dict] = None

class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def generate(
        self, 
        messages: List[Message], 
        config: LLMConfig
    ) -> str:
        """Generate a response from the LLM"""
        pass
        
    @abstractmethod
    async def stream_generate(
        self, 
        messages: List[Message], 
        config: LLMConfig
    ) -> AsyncIterator[str]:
        """Stream response tokens from the LLM"""
        pass
        
    @abstractmethod
    async def embed(self, text: str) -> List[float]:
        """Generate embeddings for text"""
        pass
```

### 2. Provider Implementations

```python
# backend/ai/providers/openai_provider.py
import openai
from typing import AsyncIterator, List

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        
    async def generate(
        self, 
        messages: List[Message], 
        config: LLMConfig
    ) -> str:
        response = await self.client.chat.completions.create(
            model=config.model,
            messages=[
                {"role": m.role, "content": m.content} 
                for m in messages
            ],
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            top_p=config.top_p
        )
        return response.choices[0].message.content
        
    async def stream_generate(
        self, 
        messages: List[Message], 
        config: LLMConfig
    ) -> AsyncIterator[str]:
        stream = await self.client.chat.completions.create(
            model=config.model,
            messages=[
                {"role": m.role, "content": m.content} 
                for m in messages
            ],
            temperature=config.temperature,
            max_tokens=config.max_tokens,
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
                
    async def embed(self, text: str) -> List[float]:
        response = await self.client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding

# backend/ai/providers/gemini_provider.py
import google.generativeai as genai
from typing import AsyncIterator, List

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        
    async def generate(
        self, 
        messages: List[Message], 
        config: LLMConfig
    ) -> str:
        model = genai.GenerativeModel(config.model)
        
        # Convert messages to Gemini format
        chat = model.start_chat(history=[])
        for message in messages:
            if message.role == "user":
                response = await chat.send_message_async(
                    message.content,
                    generation_config={
                        "temperature": config.temperature,
                        "max_output_tokens": config.max_tokens,
                        "top_p": config.top_p
                    }
                )
        
        return response.text
        
    async def stream_generate(
        self, 
        messages: List[Message], 
        config: LLMConfig
    ) -> AsyncIterator[str]:
        model = genai.GenerativeModel(config.model)
        chat = model.start_chat(history=[])
        
        # Send last user message with streaming
        last_message = next(
            m for m in reversed(messages) if m.role == "user"
        )
        
        response = await chat.send_message_async(
            last_message.content,
            stream=True,
            generation_config={
                "temperature": config.temperature,
                "max_output_tokens": config.max_tokens
            }
        )
        
        async for chunk in response:
            yield chunk.text
            
    async def embed(self, text: str) -> List[float]:
        model = genai.GenerativeModel("models/embedding-001")
        result = await model.embed_content_async(text)
        return result.embedding
```

### 3. MCP Protocol Implementation

```python
# backend/ai/mcp/protocol.py
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
import json

@dataclass
class Tool:
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Callable
    
@dataclass
class Context:
    """Represents the context window for an AI agent"""
    messages: List[Message] = field(default_factory=list)
    tools: List[Tool] = field(default_factory=list)
    memory: Dict[str, Any] = field(default_factory=dict)
    max_tokens: int = 8000
    current_tokens: int = 0
    
    def add_message(self, message: Message):
        """Add message to context with token management"""
        # Estimate tokens (rough approximation)
        message_tokens = len(message.content.split()) * 1.3
        
        # Remove old messages if exceeding limit
        while self.current_tokens + message_tokens > self.max_tokens:
            if self.messages:
                removed = self.messages.pop(0)
                self.current_tokens -= len(removed.content.split()) * 1.3
                
        self.messages.append(message)
        self.current_tokens += message_tokens
        
    def get_tools_schema(self) -> List[Dict]:
        """Get OpenAI-compatible tools schema"""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters
                }
            }
            for tool in self.tools
        ]

class MCPAgent:
    """Agent that implements the Model Context Protocol"""
    
    def __init__(
        self, 
        provider: LLMProvider,
        context: Context,
        system_prompt: str
    ):
        self.provider = provider
        self.context = context
        self.system_prompt = system_prompt
        
    async def process(self, user_input: str) -> str:
        """Process user input and generate response"""
        # Add user message to context
        self.context.add_message(Message("user", user_input))
        
        # Prepare messages with system prompt
        messages = [
            Message("system", self.system_prompt),
            *self.context.messages
        ]
        
        # Check if we need to use tools
        if self.context.tools:
            # First, let the model decide if it needs to use tools
            tool_check_config = LLMConfig(
                model="gpt-4-turbo-preview",
                temperature=0.3,
                max_tokens=1000
            )
            
            # Add tools to the request
            response = await self._call_with_tools(
                messages, 
                tool_check_config
            )
        else:
            # Direct generation without tools
            config = LLMConfig(
                model="gpt-4-turbo-preview",
                temperature=0.7,
                max_tokens=2000
            )
            response = await self.provider.generate(messages, config)
            
        # Add assistant response to context
        self.context.add_message(Message("assistant", response))
        
        return response
        
    async def _call_with_tools(
        self, 
        messages: List[Message], 
        config: LLMConfig
    ) -> str:
        """Handle tool calls from the model"""
        # Implementation depends on provider
        # This is a simplified version
        tools_prompt = self._generate_tools_prompt()
        enhanced_messages = messages + [
            Message("system", tools_prompt)
        ]
        
        response = await self.provider.generate(
            enhanced_messages, 
            config
        )
        
        # Parse and execute any tool calls
        tool_calls = self._parse_tool_calls(response)
        if tool_calls:
            results = await self._execute_tools(tool_calls)
            # Add results to context and regenerate
            for result in results:
                self.context.add_message(
                    Message("system", f"Tool result: {result}")
                )
            # Recursive call to process with tool results
            return await self.process("")
            
        return response
        
    def _generate_tools_prompt(self) -> str:
        """Generate prompt describing available tools"""
        tools_desc = "\n".join([
            f"- {t.name}: {t.description}"
            for t in self.context.tools
        ])
        return f"Available tools:\n{tools_desc}\n\nUse tools by responding with: TOOL: <tool_name> ARGS: <json_args>"
        
    def _parse_tool_calls(self, response: str) -> List[Dict]:
        """Parse tool calls from model response"""
        # Simple parser - in production use more robust parsing
        tool_calls = []
        if "TOOL:" in response:
            # Extract tool calls
            pass
        return tool_calls
        
    async def _execute_tools(
        self, 
        tool_calls: List[Dict]
    ) -> List[Any]:
        """Execute requested tools"""
        results = []
        for call in tool_calls:
            tool = next(
                (t for t in self.context.tools if t.name == call["name"]), 
                None
            )
            if tool:
                result = await tool.handler(**call.get("args", {}))
                results.append(result)
        return results
```

### 4. AI Orchestration Service

```python
# backend/ai/orchestrator.py
from typing import Dict, List, Optional
import asyncio
from enum import Enum

class TaskType(Enum):
    TUTORING = "tutoring"
    ASSESSMENT = "assessment"
    CONTENT_GENERATION = "content_generation"
    CODE_ASSISTANCE = "code_assistance"
    GENERAL = "general"

class AIOrchestrator:
    """Orchestrates AI agents for different tasks"""
    
    def __init__(self):
        self.providers = {
            "openai": OpenAIProvider(settings.OPENAI_API_KEY),
            "gemini": GeminiProvider(settings.GEMINI_API_KEY),
            "anthropic": AnthropicProvider(settings.ANTHROPIC_API_KEY)
        }
        self.model_selection = {
            TaskType.TUTORING: ("openai", "gpt-4-turbo-preview"),
            TaskType.ASSESSMENT: ("openai", "gpt-4"),
            TaskType.CONTENT_GENERATION: ("anthropic", "claude-3-opus"),
            TaskType.CODE_ASSISTANCE: ("openai", "gpt-4-turbo-preview"),
            TaskType.GENERAL: ("gemini", "gemini-pro")
        }
        
    async def process_request(
        self,
        task_type: TaskType,
        messages: List[Message],
        user_preferences: Optional[Dict] = None
    ) -> str:
        """Process an AI request with appropriate model selection"""
        
        # Select provider and model based on task
        provider_name, model = self.model_selection[task_type]
        provider = self.providers[provider_name]
        
        # Apply user preferences (e.g., preferred model)
        if user_preferences and "preferred_model" in user_preferences:
            provider_name = user_preferences["preferred_model"]
            provider = self.providers.get(provider_name, provider)
            
        # Configure based on task type
        config = self._get_task_config(task_type, model)
        
        try:
            # Primary attempt
            response = await provider.generate(messages, config)
            
            # Log usage for billing
            await self._log_usage(
                provider_name, 
                model, 
                messages, 
                response
            )
            
            return response
            
        except Exception as e:
            # Fallback to alternative provider
            fallback_provider = self._get_fallback_provider(provider_name)
            if fallback_provider:
                return await fallback_provider.generate(messages, config)
            raise e
            
    def _get_task_config(
        self, 
        task_type: TaskType, 
        model: str
    ) -> LLMConfig:
        """Get configuration based on task type"""
        configs = {
            TaskType.TUTORING: LLMConfig(
                model=model,
                temperature=0.7,
                max_tokens=2000,
                top_p=0.9
            ),
            TaskType.ASSESSMENT: LLMConfig(
                model=model,
                temperature=0.3,
                max_tokens=1000,
                top_p=1.0
            ),
            TaskType.CONTENT_GENERATION: LLMConfig(
                model=model,
                temperature=0.8,
                max_tokens=4000,
                top_p=0.95
            ),
            TaskType.CODE_ASSISTANCE: LLMConfig(
                model=model,
                temperature=0.2,
                max_tokens=3000,
                top_p=1.0
            ),
            TaskType.GENERAL: LLMConfig(
                model=model,
                temperature=0.5,
                max_tokens=1500,
                top_p=1.0
            )
        }
        return configs.get(task_type, configs[TaskType.GENERAL])
        
    def _get_fallback_provider(self, primary: str) -> Optional[LLMProvider]:
        """Get fallback provider for resilience"""
        fallback_map = {
            "openai": self.providers.get("anthropic"),
            "anthropic": self.providers.get("openai"),
            "gemini": self.providers.get("openai")
        }
        return fallback_map.get(primary)
        
    async def _log_usage(
        self, 
        provider: str, 
        model: str, 
        messages: List[Message], 
        response: str
    ):
        """Log API usage for billing and analytics"""
        # Implementation for usage tracking
        pass
```

### 5. Intelligent Tutoring System

```python
# backend/ai/tutoring/tutor.py
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class LearningContext:
    student_id: str
    current_topic: str
    knowledge_level: str  # beginner, intermediate, advanced
    learning_style: str  # visual, auditory, kinesthetic
    past_interactions: List[Dict]
    assessment_scores: Dict[str, float]

class AITutor:
    """Intelligent tutoring system with personalized learning"""
    
    def __init__(self, orchestrator: AIOrchestrator):
        self.orchestrator = orchestrator
        self.prompt_templates = self._load_prompt_templates()
        
    async def generate_lesson(
        self, 
        topic: str, 
        context: LearningContext
    ) -> Dict:
        """Generate a personalized lesson"""
        # Build personalized prompt
        system_prompt = self.prompt_templates["lesson_generation"].format(
            topic=topic,
            level=context.knowledge_level,
            style=context.learning_style
        )
        
        messages = [
            Message("system", system_prompt),
            Message("user", f"Create a lesson on {topic}")
        ]
        
        # Add context from past interactions
        if context.past_interactions:
            recent_context = self._summarize_interactions(
                context.past_interactions[-5:]
            )
            messages.insert(1, Message("system", recent_context))
            
        # Generate lesson content
        lesson_content = await self.orchestrator.process_request(
            TaskType.TUTORING,
            messages
        )
        
        # Generate practice problems
        practice_problems = await self._generate_practice_problems(
            topic, 
            context
        )
        
        # Generate visual aids if needed
        visual_aids = None
        if context.learning_style == "visual":
            visual_aids = await self._generate_visual_aids(topic)
            
        return {
            "topic": topic,
            "content": lesson_content,
            "practice_problems": practice_problems,
            "visual_aids": visual_aids,
            "estimated_duration": self._estimate_duration(lesson_content),
            "difficulty_level": context.knowledge_level
        }
        
    async def provide_feedback(
        self, 
        student_answer: str, 
        correct_answer: str,
        context: LearningContext
    ) -> Dict:
        """Provide intelligent feedback on student answers"""
        prompt = self.prompt_templates["feedback"].format(
            student_answer=student_answer,
            correct_answer=correct_answer,
            level=context.knowledge_level
        )
        
        messages = [
            Message("system", prompt),
            Message("user", "Provide constructive feedback")
        ]
        
        feedback = await self.orchestrator.process_request(
            TaskType.TUTORING,
            messages
        )
        
        # Analyze common mistakes
        mistake_analysis = await self._analyze_mistakes(
            student_answer, 
            correct_answer
        )
        
        return {
            "feedback": feedback,
            "is_correct": self._check_correctness(
                student_answer, 
                correct_answer
            ),
            "mistake_analysis": mistake_analysis,
            "improvement_suggestions": await self._suggest_improvements(
                mistake_analysis, 
                context
            )
        }
        
    async def adaptive_questioning(
        self, 
        topic: str, 
        context: LearningContext
    ) -> Dict:
        """Generate adaptive questions based on student performance"""
        # Analyze recent performance
        performance_analysis = self._analyze_performance(
            context.assessment_scores
        )
        
        # Determine appropriate difficulty
        difficulty = self._determine_difficulty(performance_analysis)
        
        prompt = self.prompt_templates["adaptive_questions"].format(
            topic=topic,
            difficulty=difficulty,
            weak_areas=performance_analysis.get("weak_areas", [])
        )
        
        messages = [
            Message("system", prompt),
            Message("user", f"Generate 5 questions on {topic}")
        ]
        
        questions = await self.orchestrator.process_request(
            TaskType.ASSESSMENT,
            messages
        )
        
        return {
            "questions": questions,
            "difficulty": difficulty,
            "focus_areas": performance_analysis.get("weak_areas", [])
        }
        
    def _load_prompt_templates(self) -> Dict[str, str]:
        """Load tutoring prompt templates"""
        return {
            "lesson_generation": """
You are an expert AI tutor creating a personalized lesson.
Topic: {topic}
Student Level: {level}
Learning Style: {style}

Create an engaging lesson that:
1. Introduces concepts gradually
2. Uses examples appropriate for the learning style
3. Includes interactive elements
4. Checks understanding throughout
""",
            "feedback": """
You are providing constructive feedback to a student.
Student Answer: {student_answer}
Correct Answer: {correct_answer}
Student Level: {level}

Provide feedback that:
1. Acknowledges what the student did well
2. Gently corrects mistakes
3. Explains why the correct answer is right
4. Encourages continued learning
""",
            "adaptive_questions": """
Generate assessment questions for adaptive learning.
Topic: {topic}
Difficulty: {difficulty}
Weak Areas: {weak_areas}

Create questions that:
1. Match the specified difficulty level
2. Focus on identified weak areas
3. Build on previous knowledge
4. Include a mix of question types
"""
        }
```

## API Specifications

### AI Service Endpoints

#### POST /api/ai/chat
General AI chat endpoint
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain quantum computing"
    }
  ],
  "task_type": "general",
  "options": {
    "model": "gpt-4",
    "temperature": 0.7
  }
}
```

#### POST /api/ai/tutor/lesson
Generate personalized lesson
```json
{
  "topic": "Python loops",
  "student_id": "user-123",
  "context": {
    "knowledge_level": "beginner",
    "learning_style": "visual"
  }
}
```

#### POST /api/ai/tutor/feedback
Get feedback on student answer
```json
{
  "question": "What is a for loop?",
  "student_answer": "A loop that runs forever",
  "correct_answer": "A loop that iterates over a sequence",
  "student_id": "user-123"
}
```

#### POST /api/ai/assessment/generate
Generate assessment questions
```json
{
  "topic": "Data structures",
  "difficulty": "intermediate",
  "question_count": 10,
  "question_types": ["multiple_choice", "short_answer", "coding"]
}
```

#### POST /api/ai/content/generate
Generate educational content
```json
{
  "content_type": "lesson_plan",
  "topic": "Machine Learning Basics",
  "target_audience": "high_school",
  "duration_minutes": 45
}
```

## Data Models

### AI Interaction Storage
```sql
-- AI interactions table
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID,
    task_type VARCHAR(50),
    provider VARCHAR(50),
    model VARCHAR(100),
    messages JSONB,
    response TEXT,
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    latency_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning contexts
CREATE TABLE learning_contexts (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    current_topic VARCHAR(255),
    knowledge_level VARCHAR(50),
    learning_style VARCHAR(50),
    strengths JSONB,
    weaknesses JSONB,
    preferences JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI generated content
CREATE TABLE ai_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50),
    topic VARCHAR(255),
    content JSONB,
    metadata JSONB,
    provider VARCHAR(50),
    model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);
```

## Caching Strategy

### Redis Cache Structure
```python
# Cache keys structure
cache_keys = {
    # LLM response cache (TTL: 1 hour)
    "llm_response": "ai:response:{hash(messages)}",
    
    # Embedding cache (TTL: 30 days)
    "embedding": "ai:embedding:{hash(text)}",
    
    # Generated content cache (TTL: 7 days)
    "content": "ai:content:{content_type}:{topic}:{hash(params)}",
    
    # User context cache (TTL: 1 day)
    "user_context": "ai:context:{user_id}",
    
    # Model availability (TTL: 5 minutes)
    "model_status": "ai:status:{provider}:{model}"
}
```

## Performance Requirements

### Response Times
- Chat responses: < 3 seconds
- Content generation: < 10 seconds
- Embedding generation: < 500ms
- Assessment generation: < 5 seconds

### Throughput
- Support 1000 concurrent AI sessions
- Handle 10,000 requests/hour
- Process 100 streaming connections simultaneously

### Optimization Strategies
1. **Request Batching**: Batch embedding requests
2. **Response Streaming**: Stream long responses
3. **Smart Caching**: Cache common queries and content
4. **Load Balancing**: Distribute across providers
5. **Context Compression**: Optimize token usage

## Security Considerations

### API Key Management
- Store API keys in secure vault (GCP Secret Manager)
- Rotate keys quarterly
- Monitor usage patterns for anomalies
- Implement key-specific rate limits

### Content Filtering
- Pre-filter inappropriate requests
- Post-filter AI responses
- Log filtered content for review
- Implement user reporting system

### Data Privacy
- Anonymize user data in prompts
- Don't send PII to external APIs
- Implement data retention policies
- Allow users to delete AI interaction history

## Error Handling

### Provider Failures
```python
class AIErrorHandler:
    async def handle_provider_error(
        self, 
        error: Exception, 
        provider: str
    ) -> Dict:
        if isinstance(error, RateLimitError):
            # Switch to backup provider
            return {"action": "fallback", "wait_time": 60}
        elif isinstance(error, APIKeyError):
            # Alert administrators
            return {"action": "alert", "severity": "critical"}
        elif isinstance(error, TimeoutError):
            # Retry with shorter prompt
            return {"action": "retry", "modification": "shorten"}
```

### Response Validation
- Validate AI responses for completeness
- Check for harmful content
- Ensure response format compliance
- Handle incomplete responses

## Monitoring & Analytics

### Key Metrics
- API usage by provider and model
- Response times and latencies
- Error rates and types
- Token usage and costs
- User satisfaction scores

### Logging
```python
# Structured logging for AI interactions
logger.info("AI_INTERACTION", {
    "user_id": user_id,
    "task_type": task_type,
    "provider": provider,
    "model": model,
    "tokens": token_count,
    "latency_ms": latency,
    "success": success,
    "error": error_message
})
```

### Cost Tracking
- Real-time cost monitoring
- Per-user usage tracking
- Budget alerts
- Cost optimization recommendations

## Future Enhancements

### Phase 2 (Q2 2025)
- Fine-tuned models for specific domains
- Multi-modal AI (image, audio)
- Local LLM integration
- Advanced prompt engineering

### Phase 3 (Q3 2025)
- Custom model training
- Federated learning support
- Real-time collaboration with AI
- Voice-based tutoring

### Phase 4 (Q4 2025)
- AI-generated interactive simulations
- Predictive learning paths
- Emotional intelligence integration
- Cross-lingual tutoring

## Testing Strategy

### Unit Tests
- Provider interface implementations
- MCP protocol handling
- Context management
- Tool execution

### Integration Tests
- End-to-end AI workflows
- Provider failover scenarios
- Caching behavior
- Rate limiting

### Performance Tests
- Load testing with concurrent users
- Latency benchmarking
- Token optimization
- Cost efficiency analysis