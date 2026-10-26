<div align="center">
  <br />
  <img src="public/readme/readme-hero.webp" alt="Project Banner">
  <br />
  <br />

  <div>
    <img src="https://img.shields.io/badge/-Next.js_-black?style=for-the-badge&logo=nextdotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/-Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
    <br />
    <img src="https://img.shields.io/badge/-Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" />
    <img src="https://img.shields.io/badge/-Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
    <img src="https://img.shields.io/badge/-LangSmith-1C1C1C?style=for-the-badge&logo=langchain&logoColor=white" />
    <img src="https://img.shields.io/badge/-OpenRouter-6566F1?style=for-the-badge&logo=openai&logoColor=white" />
  </div>
</div>

## Beacon | AI-Powered Codebase Dependency Mapper

## 📋 <a name="table">Table of Contents</a>

1. ✨ [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🤸 [Quick Start](#quick-start)

## <a name="introduction">✨ Introduction</a>

Beacon is a developer tool that turns any public TypeScript or JavaScript repository into an interactive dependency map. Modern engineering teams frequently ship AI-generated code without fully reading every underlying file, creating complex architectural webs with hidden imports and coupled modules. Beacon solves this by parsing raw source code into navigable nodes and edges, allowing developers to immediately visualize dependency chains, evaluate blast radii before making edits, and ask AI models for context-aware explanations grounded entirely in true AST parsing.

Built around a strict core principle, Beacon guarantees that every node and edge on the canvas comes directly from real code analysis rather than AI predictions. By keeping graph arithmetic pure and standalone, the AI agent is only permitted to explain and summarize verified structure. Packed with multi-tenant organization support via Clerk, row-level security on Supabase, and full observability tracing through LangSmith, Beacon provides production-grade infrastructure for software teams navigating large codebases.

## <a name="tech-stack">⚙️ Tech Stack</a>

- **[Next.js 16](https://nextjs.org/)** is a full-stack React framework that powers Beacon using the App Router, Server Actions, and dynamic server-rendering capabilities for seamless frontend-backend integration.

- **[TypeScript 5](https://www.typescriptlang.org/)** is a strongly typed superset of JavaScript that ensures strict type safety across the entire application and parser pipeline.

- **[ts-morph](https://ts-morph.com/)** is a wrapper around the TypeScript Compiler API that parses source code files, imports, re-exports, and dynamic references into deterministic AST graph structures.

- **[React Flow (@xyflow/react)](https://reactflow.dev/)** is an interactive canvas library used alongside dagre for laying out, rendering, and navigating complex codebase dependency graphs.

- **[Clerk](https://clerk.com/)** provides identity management and multi-tenant organization authorization, issuing tokens that govern user access throughout the platform.

- **[Supabase](https://supabase.com/)** supplies the Postgres database layer with strict Row-Level Security (RLS) policies enforced directly via JWT claims.

- **[OpenRouter](https://openrouter.ai/)** drives AI model interactions via OpenAI SDK client with pinned snapshots (such as `cohere/north-mini-code:free`), generating grounded file explanations and tailored security remediations.

- **[LangSmith](https://smith.langchain.com/)** is an observability platform that traces every LLM execution call, tracks token usage, and monitors cache hit rates against ground-truth repository inputs.

- **[Tailwind CSS v4](https://tailwindcss.com/) & [Material UI](https://mui.com/)** power Beacon's dense, high-information, responsive developer interface.

## <a name="features">🔋 Features</a>

👉 **AST Codebase Parsing**: Converts public GitHub repositories into complete node-and-edge graph maps by parsing static imports, re-exports, dynamic imports, and `require()` calls without relying on AI predictions.

👉 **Interactive Canvas Mapping**: Zoom, expand folders into individual files, select modules, and view connected incoming and outgoing dependencies rendered via React Flow.

👉 **Blast Radius Calculation**: Instant arithmetic over the graph structure to reveal exactly which files and downstream modules break if a specific file is modified.

👉 **Grounded Module Explanations**: Contextual summaries generated for any file or folder using only its real AST connections, with every mentioned filename hyperlinked directly on the map.

👉 **Automated Security Audit Engine**:
- **AST Sink Detectors**: Flags dangerous sinks including `dangerouslySetInnerHTML`, `eval`, command execution, SQL injection, and unsafe regex patterns.
- **Secret Leak Detection**: Identifies hardcoded API keys, JWTs, and private credentials across the codebase.
- **SCA Dependency Scanning**: Scans project dependencies for known vulnerabilities.
- **Reachability Analysis**: Computes call chains from public API endpoints and boundaries down to vulnerable sinks to prove real-world exploitability.

👉 **One-Click AI Remediation**: Generates verified code patches and step-by-step remediation plans for security findings, backed by live response timers and cached in Supabase.

👉 **Multi-Tenant Organizations**: Shared codebase analyses linked to Clerk organizations so team members collaborate from a single unified map with per-tenant project dashboards.

👉 **Row-Level Postgres Security**: Strict data isolation across teams using Supabase Postgres policies evaluated directly against Clerk JWT claims.

👉 **LangSmith Trace & Evaluation**: Full distributed tracing for every model call, cache verification, and benchmark evaluation against true repository file lists.

And many more, including convention-driven architectural roles and custom route table navigation.

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

**Prerequisites**

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en) (v20+)
- [pnpm](https://pnpm.io/) (Package Manager, v10+)

**Cloning the Repository**

```bash
git clone https://github.com/Mounieshh/beacon.git
cd beacon
```

**Installation**

Install the project dependencies using pnpm:

```bash
pnpm install
```

**Set Up Environment Variables**

Create a new file named `.env.local` in the root of your project and configure the following:

```env
# CLERK
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...

# LANGSMITH
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_...
LANGSMITH_PROJECT=beacon
LANGSMITH_ENDPOINT=https://api.smith.langchain.com

# OPENROUTER
OPENROUTER_API_KEY=sk-or-v1-...

# Agent Service (deep-agent/, `pnpm dev` there).
AGENT_URL=http://localhost:2024
```

Replace the placeholder values with your real credentials. You can get these by signing up at: [**Clerk**](https://clerk.com/), [**Supabase**](https://supabase.com/), [**OpenRouter**](https://openrouter.ai/), and [**LangSmith**](https://smith.langchain.com/).

**Database Setup**

Push database migrations to your Supabase instance:

```bash
npx supabase db push
```

**Running the Project**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the project.
