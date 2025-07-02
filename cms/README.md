# AI Square CMS

LLM-powered Content Management System for AI Square educational platform.

## 🚀 Quick Start

### Prerequisites

1. Google Cloud Project with Vertex AI enabled
2. Service account with necessary permissions
3. Node.js 18+ installed

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Google Cloud credentials
   ```

3. Start development server:
   ```bash
   npm run dev
   # or from project root
   make run-cms
   ```

The CMS will be available at http://localhost:3001

## 🌟 Features

### ✅ Implemented
- **File Browser**: Navigate YAML content files with search functionality
- **Monaco Editor**: Advanced YAML editor with syntax highlighting
- **Vertex AI Integration**: LLM-powered content assistance
- **AI Quick Actions**:
  - Complete incomplete YAML content
  - Translate to 9 languages (en, zhTW, es, ja, ko, fr, de, ru, it)
  - Improve content quality and validation
- **Smart Chat**: Context-aware AI assistant for content editing

### 🚧 In Progress
- GitHub integration for PR workflow
- Visual editor mode
- Enhanced preview functionality
- Authentication system

### 📋 Planned
- Real-time collaboration
- Content validation rules
- Version history
- Automated testing integration

## 🏗️ Architecture

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Monaco Editor** for code editing
- **Radix UI** for components

### AI Integration
- **Google Vertex AI** with Gemini 1.5 Flash
- **Context-aware prompts** for educational content
- **Multilingual support** with cultural adaptation
- **YAML-specific optimizations**

### File Management
- Reads from `cms/content/` directory
- Supports `.yaml` and `.yml` files
- Safe file operations with path validation
- Organized content structure with subdirectories

## 🤖 AI Features

### Quick Actions
1. **Complete Content**: Automatically fill missing YAML fields
2. **Translate**: Generate translations for all supported languages
3. **Improve**: Enhance content quality and fix validation issues

### Smart Chat
- Context-aware conversations about content
- Automatic YAML detection and validation
- Educational content expertise

### Supported Languages
- English (en)
- Traditional Chinese (zhTW)
- Spanish (es)
- Japanese (ja)
- Korean (ko)
- French (fr)
- German (de)
- Russian (ru)
- Italian (it)

## 📝 Usage Examples

### Starting the CMS
```bash
# From project root
make run-cms

# Direct npm command
cd cms && npm run dev -- --port 3001
```

### Environment Variables
```bash
# Required for Vertex AI
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path-to-service-account.json

# Optional for GitHub integration
GITHUB_TOKEN=your-github-token
GITHUB_OWNER=your-username
GITHUB_REPO=ai-square
```

### Content Structure
The CMS expects content in this structure:
```
cms/content/
├── rubrics_data/
│   ├── ai_lit_domains.yaml
│   └── ksa_codes.yaml
├── pbl_data/
│   ├── _scenario_template.yaml
│   ├── ai_education_design_scenario.yaml
│   └── high_school_*.yaml
└── assessment_data/
    └── ai_literacy_questions.yaml
```

## 🔧 Development

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npx tsc --noEmit
```

## 🚀 Deployment

The CMS can be deployed alongside the main AI Square application or as a standalone service.

### Environment Setup
1. Configure Google Cloud credentials
2. Set up Vertex AI API access
3. Configure GitHub integration (optional)

### Production Build
```bash
npm run build
npm start
```

## 🛠️ API Endpoints

### File Management
- `GET /api/files` - List all YAML files
- `GET /api/content?path=<file>` - Read file content
- `POST /api/content` - Save file content

### AI Services
- `POST /api/ai/assist` - Quick AI actions
- `POST /api/ai/chat` - Interactive AI chat

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for all new code
3. Test AI features with realistic content
4. Document any new environment variables

## 📄 License

Part of the AI Square project.