# DeepCAD Development Setup Guide

This guide covers the complete development environment setup for the DeepCAD platform, including dependency management, code quality tools, and CI/CD pipeline.

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd DeepCAD

# 2. Setup dependencies automatically
python scripts/setup_dependencies.py

# 3. Start development
./scripts/dev_fullstack.sh  # Unix/Linux/macOS
# OR
scripts\dev_fullstack.bat   # Windows
```

## System Requirements

### Required Software
- **Python 3.10+**
- **Node.js 18+**
- **Git**

### Recommended Tools
- **Poetry** (Python dependency management)
- **pnpm** (Node.js package manager)
- **Docker** (containerization)
- **VS Code** (development environment)

## Development Environment Setup

### 1. Backend Setup (Python + Poetry)

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Configure Poetry
poetry config virtualenvs.in-project true

# Install dependencies
poetry install

# Activate virtual environment
poetry shell

# Start backend server
poetry run uvicorn gateway.main:app --reload --host 0.0.0.0 --port 8080
```

### 2. Frontend Setup (TypeScript + pnpm)

```bash
# Install pnpm
npm install -g pnpm@8.15.1

# Navigate to frontend directory
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

### 3. Full Stack Development

```bash
# Option 1: Combined script (recommended)
./scripts/dev_fullstack.sh

# Option 2: Separate terminals
# Terminal 1: Backend
./scripts/dev_backend.sh

# Terminal 2: Frontend  
./scripts/dev_frontend.sh
```

## Code Quality Tools

### Pre-commit Hooks

Install and setup pre-commit hooks for automatic code quality checks:

```bash
# Install pre-commit
poetry add --group dev pre-commit

# Install hooks
poetry run pre-commit install

# Run hooks manually
poetry run pre-commit run --all-files
```

### Backend Quality Tools

```bash
# Code formatting
poetry run black .
poetry run isort .

# Linting
poetry run ruff check .
poetry run flake8 .

# Type checking
poetry run mypy core/ gateway/

# Security scanning
poetry run bandit -r . -c .bandit

# Testing
poetry run pytest --cov=core --cov=gateway
```

### Frontend Quality Tools

```bash
cd frontend

# Type checking
pnpm run type-check

# Linting
pnpm run lint
pnpm run lint:fix

# Formatting
pnpm run format

# Build check
pnpm run build
```

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment.

### Pipeline Stages

1. **Backend Tests**
   - Code formatting (Black, isort)
   - Linting (Ruff, Flake8)
   - Type checking (MyPy)
   - Unit tests (Pytest)
   - Coverage reporting

2. **Frontend Tests**
   - Type checking (TypeScript)
   - Linting (ESLint)
   - Formatting (Prettier)
   - Build verification

3. **Integration Tests**
   - Full stack health checks
   - API endpoint testing
   - End-to-end workflow validation

4. **Security Scanning**
   - Vulnerability scanning (Trivy)
   - Python security checks (Safety, Bandit)
   - Secrets detection

5. **Docker Build & Deploy**
   - Multi-stage Docker builds
   - Container registry push (GHCR)
   - Production deployment (on main/master)

### Triggering CI/CD

```bash
# Push to trigger CI
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature

# Create pull request to trigger full pipeline
gh pr create --title "Add new feature" --body "Description"
```

## Development Scripts

### Available Scripts

| Script | Purpose |
|--------|---------|
| `scripts/setup_dependencies.py` | Complete dependency setup |
| `scripts/setup_backend_deps.py` | Backend-only setup |
| `scripts/setup_frontend_deps.py` | Frontend-only setup |
| `scripts/dev_backend.sh/.bat` | Start backend server |
| `scripts/dev_frontend.sh/.bat` | Start frontend server |
| `scripts/dev_fullstack.sh` | Start both servers |

### Package Management

```bash
# Backend dependencies
poetry add <package>               # Add runtime dependency
poetry add --group dev <package>   # Add development dependency
poetry update                      # Update all dependencies
poetry show                        # List installed packages

# Frontend dependencies
cd frontend
pnpm add <package>                 # Add runtime dependency
pnpm add -D <package>              # Add development dependency
pnpm update                        # Update all dependencies
pnpm list                          # List installed packages
```

## Docker Development

### Building Images

```bash
# Build development image
docker build -t deepcad:dev .

# Run container
docker run -p 8080:8080 deepcad:dev

# Development with volumes
docker run -p 8080:8080 -v $(pwd):/app deepcad:dev
```

### Docker Compose (when available)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## IDE Configuration

### VS Code Setup

The project includes VS Code workspace settings:

- **Extensions**: Python, TypeScript, ESLint, Prettier
- **Settings**: Configured for Poetry, pnpm, and pre-commit
- **Tasks**: Build, test, and debug configurations

### Recommended Extensions

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.black-formatter",
    "ms-python.isort",
    "ms-python.mypy-type-checker",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## Environment Variables

### Backend Environment

Create `.env` file in project root:

```bash
# FastAPI settings
ENVIRONMENT=development
DEBUG=True
API_HOST=0.0.0.0
API_PORT=8080

# Database
DATABASE_URL=sqlite:///./deepcad.db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256

# Kratos settings
KRATOS_APPLICATIONS_ROOT=/path/to/kratos/applications
```

### Frontend Environment

Create `frontend/.env.local`:

```bash
# API endpoints
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080

# Feature flags
VITE_ENABLE_MOVING_MESH=true
VITE_ENABLE_AI_ASSISTANT=true
```

## Troubleshooting

### Common Issues

**Poetry not found:**
```bash
export PATH="$HOME/.local/bin:$PATH"
source ~/.bashrc
```

**pnpm not found:**
```bash
npm install -g pnpm@8.15.1
```

**Permission errors (Windows):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Port conflicts:**
- Backend: Change port in `.env` (API_PORT=8081)
- Frontend: Vite will auto-increment ports

**Dependency conflicts:**
```bash
# Backend
poetry lock --no-update
poetry install

# Frontend
cd frontend
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Getting Help

1. Check the [Technical Documentation](docs/)
2. Review [GitHub Issues](https://github.com/your-org/deepcad/issues)
3. Run health checks:
   ```bash
   curl http://localhost:8080/health
   curl http://localhost:8080/api/visualization/health
   ```

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Setup** development environment: `python scripts/setup_dependencies.py`
4. **Make** your changes
5. **Test** your changes: `poetry run pytest && cd frontend && pnpm test`
6. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
7. **Push** to the branch: `git push origin feature/amazing-feature`
8. **Open** a Pull Request

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new moving-mesh visualization
fix: resolve WebSocket connection issue
docs: update API documentation
style: format code with black
refactor: simplify mesh processing logic
test: add integration tests for API
chore: update dependencies
```

## Production Deployment

### Environment Preparation

```bash
# Build production images
docker build -t deepcad:latest .

# Run with production settings
docker run -d \
  --name deepcad-prod \
  -p 80:8080 \
  -e ENVIRONMENT=production \
  -e DEBUG=False \
  deepcad:latest
```

### Health Monitoring

```bash
# Health check endpoint
curl -f http://your-domain/health

# Detailed status
curl -f http://your-domain/api/visualization/health
```

---

For more detailed information, see the [Technical Documentation](docs/) directory.