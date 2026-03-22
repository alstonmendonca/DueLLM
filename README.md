# DueLLM

Two LLMs debate to produce better code. One builds, one critiques. Repeat until converged.

## How it works

1. You enter a coding or architecture prompt
2. **Builder** (LLM A) generates a solution
3. **Critic** (LLM B) finds flaws — bugs, edge cases, architecture issues
4. **Builder** revises based on the critique
5. Repeat until the Critic says "no major issues" or max rounds reached
6. You get a battle-tested solution

## Stack

- **Frontend:** Next.js, TypeScript, shadcn/ui, Tailwind (black & white minimalist)
- **Backend:** Python, FastAPI, boto3
- **LLM Provider:** Amazon Bedrock (Claude, Llama, Mistral)

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your AWS credentials to .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## License

MIT
