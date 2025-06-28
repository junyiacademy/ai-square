# AI Integration Technical Specification

## Overview

This document outlines the technical architecture for integrating multiple Large Language Models (LLMs) and implementing the Model Context Protocol (MCP) for AI Square's intelligent tutoring and assistant systems.

根據最新的產品需求文檔（PRD），AI 整合將採用漸進式演進策略：
- **Phase 1-2（現況）**：直接呼叫 LLM API，各功能獨立管理
- **Phase 2**：建立 LLM Service 抽象層，統一介面
- **Phase 3**：Agent 抽象層，將功能包裝成 Agent
- **Phase 4**：完整 MCP 實作，多 Agent 協作

## Architecture Design

### 漸進式 MCP 整合架構

#### Phase 1-2: 直接 LLM 呼叫（現況）
```
┌─────────────────────────────────────────────────────┐
│                 SaaS Application                     │
├─────────────────────────────────────────────────────┤
│   PBL System          Assessment         Content     │
│       ↓                    ↓               ↓        │
│  Vertex AI API       Gemini API      OpenAI API    │
└─────────────────────────────────────────────────────┘
問題：各功能重複程式碼、無法共享上下文、難以切換模型
```

#### Phase 2: LLM Service 抽象層
```
┌─────────────────────────────────────────────────────┐
│                 SaaS Application                     │
├─────────────────────────────────────────────────────┤
│   PBL System     Assessment      Content             │
│       ↓              ↓              ↓               │
│              LLM Service Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │Prompt Mgmt  │  │Model Router │  │Usage Track  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────┤
│  Vertex AI    │    Gemini    │    OpenAI    │ ...  │
└─────────────────────────────────────────────────────┘
```

#### Phase 3: Agent 系統架構
```
┌─────────────────────────────────────────────────────┐
│                 SaaS Application                     │
├─────────────────────────────────────────────────────┤
│              Agent Orchestrator                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │TutorAgent│  │Assessor  │  │Content   │  ...    │
│  │(from PBL)│  │Agent     │  │Agent     │         │
│  └──────────┘  └──────────┘  └──────────┘         │
├─────────────────────────────────────────────────────┤
│         Context Manager  │  LLM Service              │
└─────────────────────────────────────────────────────┘
```

#### Phase 4: 完整 MCP 實作
```
┌─────────────────────────────────────────────────────┐
│                 SaaS Application                     │
├─────────────────────────────────────────────────────┤
│              MCP Orchestrator                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │Agent Registry│  │Context Mgr │  │Message Bus  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────┤
│   Internal Agents    │    External Agents           │
│  ┌──────┐ ┌──────┐  │  ┌──────┐ ┌──────┐         │
│  │Tutor │ │Assess│  │  │3rd   │ │Plugin│         │
│  └──────┘ └──────┘  │  │Party │ └──────┘         │
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

### 3. 從現有功能到 Agent 系統的演進

#### Phase 2: 建立 LLM Service 層（3-6個月）

**目標**：統一所有 LLM 呼叫，為未來 Agent 系統做準備

```python
# backend/ai/services/llm_service.py
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

@dataclass
class LLMConfig:
    model: str
    temperature: float = 0.7
    max_tokens: int = 2000
    stream: bool = False

class LLMService:
    """第一步：統一 LLM 呼叫（Phase 2）"""
    def __init__(self):
        self.models = {
            'vertex': VertexAIClient(),
            'openai': OpenAIClient(), 
            'gemini': GeminiClient()
        }
        self.prompt_templates = self._load_templates()
        self.usage_tracker = UsageTracker()
    
    async def generate(self, 
                      task_type: str,
                      context: dict,
                      model: str = 'vertex') -> str:
        """統一介面，但還不是 Agent"""
        # 根據任務類型選擇 prompt 模板
        prompt = self.get_prompt(task_type, context)
        
        # 執行並追蹤使用情況
        try:
            response = await self.models[model].generate(prompt)
            await self._track_usage(task_type, model, prompt, response)
            return response
        except Exception as e:
            # 自動 fallback 到其他模型
            fallback_model = self._get_fallback(model)
            return await self.models[fallback_model].generate(prompt)
    
    def get_prompt(self, task_type: str, context: dict) -> str:
        """統一的 prompt 管理"""
        template = self.prompt_templates.get(task_type)
        return template.format(**context)
```

**Migration 範例：PBL 系統**
```python
# 現況：直接呼叫
async def chat_with_ai(stage_config, user_input):
    response = await vertex_ai.generate(
        prompt=stage_config['prompt'],
        user_input=user_input
    )
    return response

# Phase 2：使用 LLM Service
async def chat_with_ai(stage_config, user_input):
    response = await llm_service.generate(
        task_type='pbl_tutoring',
        context={
            'stage': stage_config,
            'user_input': user_input
        }
    )
    return response
```

#### Phase 3: Agent 抽象層（6-9個月）

**目標**：將現有功能包裝成標準化的 Agent
```python
# backend/ai/agents/base_agent.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseAgent(ABC):
    """Phase 3: Base agent abstraction"""
    def __init__(self, agent_id: str, capabilities: List[str]):
        self.id = agent_id
        self.capabilities = capabilities
        self.context = {}
        self.llm_service = LLMService()
    
    @abstractmethod
    async def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent task"""
        pass
    
    def can_handle(self, task_type: str) -> bool:
        """Check if agent can handle task"""
        return task_type in self.capabilities
    
    def update_context(self, context: Dict[str, Any]):
        """Update agent context"""
        self.context.update(context)

# backend/ai/agents/tutor_agent.py
class TutorAgent(BaseAgent):
    """Migrated from PBL system"""
    def __init__(self):
        super().__init__('tutor', [
            'teach', 'explain', 'guide', 
            'provide_hints', 'assess_understanding'
        ])
    
    async def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        task_type = task.get('type')
        
        if task_type == 'teach':
            return await self.teach(task)
        elif task_type == 'provide_hints':
            return await self.provide_hints(task)
        # ... other capabilities
    
    async def teach(self, task: Dict[str, Any]) -> Dict[str, Any]:
        # Migrate existing PBL teaching logic
        context = {
            'stage': task.get('stage'),
            'user_level': task.get('user_level'),
            'topic': task.get('topic'),
            'history': self.context.get('conversation_history', [])
        }
        
        response = await self.llm_service.generate(
            task_type='tutoring',
            context=context
        )
        
        # Update conversation history
        self.context.setdefault('conversation_history', []).append({
            'user': task.get('user_input'),
            'assistant': response
        })
        
        return {
            'response': response,
            'suggestions': await self.generate_suggestions(context)
        }
```

#### Phase 4: 完整 MCP 實作（9-12個月）

**目標**：實現標準 MCP Protocol，支援多 Agent 協作
```python
# backend/ai/mcp/protocol.py (Phase 4)
from typing import Dict, List, Optional, Any, Protocol
from dataclasses import dataclass, field
import asyncio

@dataclass
class MCPMessage:
    """Standard MCP message format"""
    id: str
    type: str  # 'request', 'response', 'event'
    source: str  # agent_id
    target: Optional[str]  # agent_id or None for broadcast
    payload: Dict[str, Any]
    timestamp: float

@dataclass
class AgentCapability:
    """Agent capability declaration"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]

class MCPAgent(Protocol):
    """MCP-compliant agent interface"""
    id: str
    capabilities: List[AgentCapability]
    
    async def initialize(self, context: Dict[str, Any]) -> None:
        """Initialize agent with context"""
        ...
    
    async def handle_message(self, message: MCPMessage) -> Optional[MCPMessage]:
        """Handle incoming MCP message"""
        ...
    
    async def get_context_requirements(self) -> Dict[str, Any]:
        """Return required context schema"""
        ...
    
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

### 4. 智能協調器演進

#### Phase 3: Simple Agent Orchestrator
```python
# backend/ai/orchestration/agent_orchestrator.py
from typing import Dict, List, Optional
import asyncio

class AgentOrchestrator:
    """Phase 3: Basic agent orchestration"""
    def __init__(self):
        self.agents = {
            'tutor': TutorAgent(),
            'assessor': AssessmentAgent(),
            'content': ContentAgent()
        }
        self.context_store = {}
    
    async def execute_task(self, 
                          task_type: str,
                          payload: Dict[str, Any],
                          user_id: str) -> Dict[str, Any]:
        # Find capable agent
        agent = self.select_agent(task_type)
        if not agent:
            raise ValueError(f"No agent available for task: {task_type}")
        
        # Load user context
        user_context = self.context_store.get(user_id, {})
        agent.update_context(user_context)
        
        # Execute task
        result = await agent.execute({
            'type': task_type,
            **payload
        })
        
        # Update context store
        self.context_store[user_id] = agent.context
        
        return result
    
    def select_agent(self, task_type: str) -> Optional[BaseAgent]:
        """Select agent based on capabilities"""
        for agent in self.agents.values():
            if agent.can_handle(task_type):
                return agent
        return None
```

#### Phase 4: MCP-Based Orchestrator
```python
# backend/ai/mcp/orchestrator.py
class MCPOrchestrator:
    """Phase 4: Full MCP orchestration"""
    
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

### 4. Context Management System

```python
# backend/ai/context/manager.py
from typing import Dict, Any, Optional
import json
from datetime import datetime

class ContextManager:
    """Unified context management across phases"""
    def __init__(self, storage_backend='gcs'):
        self.storage = self._init_storage(storage_backend)
        self.cache = {}  # In-memory cache
        self.ttl = 3600  # 1 hour cache
    
    async def get_context(self, 
                         user_id: str,
                         scope: str = 'global') -> Dict[str, Any]:
        """Get user context with caching"""
        cache_key = f"{user_id}:{scope}"
        
        # Check cache
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            if cached['timestamp'] > datetime.now().timestamp() - self.ttl:
                return cached['data']
        
        # Load from storage
        context = await self.storage.load(f"contexts/{user_id}/{scope}.json")
        
        # Update cache
        self.cache[cache_key] = {
            'data': context,
            'timestamp': datetime.now().timestamp()
        }
        
        return context
    
    async def update_context(self,
                           user_id: str,
                           updates: Dict[str, Any],
                           scope: str = 'global'):
        """Update user context"""
        context = await self.get_context(user_id, scope)
        context.update(updates)
        
        # Save to storage
        await self.storage.save(
            f"contexts/{user_id}/{scope}.json",
            context
        )
        
        # Update cache
        cache_key = f"{user_id}:{scope}"
        self.cache[cache_key] = {
            'data': context,
            'timestamp': datetime.now().timestamp()
        }
```

### 5. Migration Path for Existing Features

#### PBL System Migration Example
```python
# Current implementation (Phase 1)
# backend/routers/pbl.py
async def chat_with_ai(stage_config, user_input):
    # Direct Vertex AI call
    response = await vertex_ai.generate(
        prompt=stage_config['prompt'],
        user_input=user_input
    )
    return response

# Phase 2: Using LLM Service
async def chat_with_ai(stage_config, user_input):
    response = await llm_service.generate(
        task_type='pbl_tutoring',
        context={
            'stage': stage_config,
            'user_input': user_input
        }
    )
    return response

# Phase 3: Using Agent System
async def chat_with_ai(stage_config, user_input, user_id):
    response = await orchestrator.execute_task(
        task_type='teach',
        payload={
            'stage': stage_config,
            'user_input': user_input
        },
        user_id=user_id
    )
    return response['response']
```

#### Assessment System Migration
```python
# Current implementation
async def evaluate_answer(question, answer):
    prompt = f"Evaluate: Q: {question} A: {answer}"
    score = await gemini.generate(prompt)
    return score

# Phase 2: LLM Service
async def evaluate_answer(question, answer):
    return await llm_service.generate(
        task_type='assessment',
        context={'question': question, 'answer': answer}
    )

# Phase 3: Agent System
async def evaluate_answer(question, answer, user_id):
    return await orchestrator.execute_task(
        task_type='assess',
        payload={'question': question, 'answer': answer},
        user_id=user_id
    )
```
        
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

## Implementation Timeline

### Phase 2: LLM Service Layer (2025/07 - 2025/09)
**目標**: 集中化 LLM 使用，為 Agent 系統做準備

**關鍵任務**:
1. **建立 LLM Service 抽象層**
   - 從 PBL 和評估系統提取共同模式
   - 建立統一的 prompt 管理系統
   - 實作多模型支援（Vertex AI、OpenAI、Gemini）

2. **遷移現有功能**
   - PBL 系統改用 LLM Service
   - 評估系統改用 LLM Service  
   - 加入使用情況追蹤（基於複雜度估算）

3. **優化與快取**
   - 加入 Redis 快取層（根據 PRD 4.1.3）
   - 實作智能 fallback 機制
   - 效能調校與監控

**觸發條件**: DAU > 100 或 GCS API 費用 > $50/月

### Phase 3: Agent System (2025/10 - 2025/12)
**目標**: 將功能轉換為 Agent 架構

**關鍵任務**:
1. **Agent 框架設計**
   - BaseAgent 介面定義
   - AgentOrchestrator 實作
   - Context Manager（整合 GCS 儲存）

2. **Agent 遷移計畫**
   - TutorAgent（從 PBL 系統遷移）
   - AssessmentAgent（從評估功能遷移）
   - ContentAgent（新增，管理學習內容）
   - RubricsAgent（新增，處理評量標準）

3. **系統整合**
   - 更新 API endpoints 支援 Agent
   - Agent 間協調機制
   - PostgreSQL 資料庫整合（根據 PRD 4.1.3）

**觸發條件**: 功能數量 > 10 個，需要更好的模組化

### Phase 4: MCP Implementation (2026/01 - 2026/03) 
**目標**: 完整 MCP 協議支援

**關鍵任務**:
1. **MCP Protocol 實作**
   - 定義標準訊息格式
   - 建立 Message Bus
   - Agent Registry 系統
   - 跨 Agent 通訊協定

2. **進階功能**
   - Multi-Agent 工作流程
   - 上下文同步機制
   - Tool 共享框架
   - Vector DB 整合（知識庫）

3. **生態系統建設**
   - 第三方 Agent 支援
   - 開發者 SDK
   - MCP 文檔與範例

**觸發條件**: 需要支援外部 Agent 或複雜的多 Agent 協作

### Phase 5: 完整 MCP 生態系統 (2026/04+)
**目標**: 建立開放的 AI Agent 生態系統

**關鍵功能**:
- Agent Marketplace
- 自訂 Agent 開發框架  
- 企業級 Agent 管理
- 分散式 Agent 部署

## Key Technical Decisions

### 為何採用漸進式架構？
根據 PRD 4.1「儲存方案演進策略」的理念：
- **降低複雜度**：從簡單直接呼叫開始
- **快速迭代**：先驗證核心功能
- **成本控制**：避免過早優化
- **靈活調整**：根據實際需求演進

### 技術債務管理
1. **Phase 1-2 技術債**
   - 各功能重複的 LLM 呼叫程式碼
   - 缺乏統一的錯誤處理
   - 無法共享學習上下文

2. **償還計畫**
   - Phase 2: 建立 LLM Service 統一介面
   - Phase 3: Agent 架構解決模組化問題
   - Phase 4: MCP 實現完整協作能力

## Testing Strategy

### Phase 2: LLM Service 測試策略
```python
# tests/test_llm_service.py
import pytest
from unittest.mock import AsyncMock

class TestLLMService:
    async def test_provider_fallback(self):
        # Test automatic fallback on provider failure
        service = LLMService()
        service.providers['vertex'] = AsyncMock(side_effect=Exception())
        
        response = await service.generate('test', {})
        assert response is not None
    
    async def test_usage_tracking(self):
        # Verify usage is properly tracked
        service = LLMService()
        tracker = AsyncMock()
        service.usage_tracker = tracker
        
        await service.generate('test', {})
        tracker.log.assert_called_once()
```

### Phase 3: Agent Testing
```python
# tests/test_agents.py
class TestAgentSystem:
    async def test_agent_selection(self):
        orchestrator = AgentOrchestrator()
        agent = orchestrator.select_agent('teach')
        assert isinstance(agent, TutorAgent)
    
    async def test_context_persistence(self):
        # Verify context persists across calls
        orchestrator = AgentOrchestrator()
        
        # First call
        await orchestrator.execute_task(
            'teach', {'topic': 'Python'}, 'user123'
        )
        
        # Second call should have context
        result = await orchestrator.execute_task(
            'teach', {'topic': 'Lists'}, 'user123'
        )
        
        assert 'Python' in str(result)  # Previous context
```

### Performance Benchmarks
- Response time: < 2s for 95% of requests
- Token efficiency: < 2000 tokens average
- Cost per interaction: < $0.01
- Concurrent users: Support 100+ simultaneous sessions

## Migration Checklist

### From Direct Calls to LLM Service
- [ ] Identify all direct LLM calls in codebase
- [ ] Create task-specific prompt templates
- [ ] Replace direct calls with LLMService
- [ ] Add error handling and fallbacks
- [ ] Implement usage tracking
- [ ] Update tests

### From Functions to Agents
- [ ] Map features to agent capabilities
- [ ] Design agent interfaces
- [ ] Implement BaseAgent for each feature
- [ ] Create AgentOrchestrator
- [ ] Migrate API endpoints
- [ ] Update documentation

### To Full MCP Support
- [ ] Define MCP message schema
- [ ] Build message routing system
- [ ] Implement agent discovery
- [ ] Add context synchronization
- [ ] Create developer tools
- [ ] Publish MCP specification