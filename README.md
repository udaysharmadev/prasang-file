<div align="center">

# Prasang

**Repository intelligence for AI models.**

Generate a single `PRASANG.md` that gives AI tools deep understanding of your codebase - without dumping code.

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## The Problem

AI models struggle with repositories.

When you paste code into ChatGPT, Claude, or Cursor, the model sees text — not architecture. It doesn't know which files orchestrate the system, which modules are leaf dependencies, or where execution begins. The context window fills with syntax while the actual structure stays invisible.

Current approaches make this worse:

| Approach | What happens |
|----------|-------------|
| **Paste files manually** | You pick the wrong ones. The model hallucinates the rest. |
| **Dump everything** (Repomix, etc.) | Context window fills with boilerplate. Signal drowns in noise. |
| **Let the model guess** | It invents architecture. Confidently wrong. |
| **Write docs** | They go stale. They describe intent, not structure. |

The fundamental issue: **AI models need repository understanding, not repository text.**

Architecture, dependency relationships, execution flow, blast radius, folder conventions — these are the things that prevent hallucination. And none of them survive a raw code paste.

---

## What Prasang Does

Prasang analyzes your repository and generates a single `PRASANG.md` file that compresses structural intelligence into a format AI models can actually use.

```
Repository
  ↓  static analysis
Repository Intelligence
  ↓  deterministic compression
PRASANG.md
  ↓  context injection
Better AI understanding
```

The generated file is designed for one thing:

> **Maximum repository understanding per token.**

No prose. No filler. Every line exists because it helps an AI model make better decisions about your codebase.

---

## What Prasang Understands

### Repository Identity

Detects the fundamental characteristics of your repository from `package.json`, config files, and project structure.

```md
## Repository Identity

Name: prasang-file
Language: TypeScript
Framework: VS Code Extension
Repository Type: VS Code Extension
```

---

### Dependency Intelligence

Compresses dependencies into architecture signals.

Example:

```md
## Dependency Intelligence

### Core Stack
- TypeScript
- React
- Next.js

### Tooling
- ESLint
- Prettier

### Architectural Signals
- TypeScript-first repository
- Bundled build pipeline
- VS Code Extension Runtime
```

---

### Folder Intelligence

PRASANG understands:

- folder purpose
- architectural role
- confidence scoring
- repository conventions
- subsystem boundaries

Example:

```md
### src/core

Purpose: Repository analysis logic
Role: Analysis Engine
Confidence: 55%

Signals
- core logic convention
- analysis file pattern
```

---

### Architecture Compression

Instead of feeding AI an entire codebase:

```txt
src/
1000 files
50000 lines
```

PRASANG compresses:

```txt
Architecture
Subsystems
Dependencies
Roles
Conventions
Entry points
```

---

## Current Capabilities

- [x] Repository identity detection
- [x] Framework detection
- [x] Dependency intelligence
- [x] Folder intelligence
- [x] Architectural role mapping
- [x] Confidence scoring
- [x] Architecture compression
- [ ] Entry point detection
- [ ] Import graph intelligence
- [ ] Blast radius analysis
- [ ] Git intelligence
- [ ] AST-aware repository cognition

---

## Philosophy

PRASANG is **not a documentation generator**.

It is a:

> Repository Intelligence Engine

Core principles:

- Architecture aware
- Dependency aware
- Convention aware
- AI optimized
- Token optimized
- Deterministic where possible
- Server-side rendering
```

### Entry Points

Detects runtime entrypoints, command registries, and execution roots through file pattern matching and content analysis. Filters out build artifacts — only source-level entrypoints are reported.

Supports VS Code extensions, React, Next.js (App Router and Pages Router), Node.js, Express, and Python.

```md
## Entry Points

### Runtime Entry (VS Code)
- src/extension.ts
  VS Code extension activation entrypoint
  **Confidence:** 70%

### Command Registry (VS Code)
- package.json → contributes.commands
  Registers 1 VS Code command(s): Generate PRASANG File
  **Confidence:** 25%
```

### Folder Intelligence

Maps every folder to its architectural purpose, role, and confidence score using a deterministic taxonomy with weighted evidence scoring.

```md
## Folder Purpose Map

### src/core
**Purpose:** Repository analysis logic
**Role:** Analysis Engine
**Confidence:** 90%

**Signals**
- core logic convention
- analysis file pattern
- typescript files
```

Confidence is computed from weighted evidence — folder naming conventions, file patterns, implementation density, subdomain coherence — not guesswork.

### System Relationships

Parses local import statements to build a directed dependency graph. Groups relationships by architectural flow, traced from root nodes through the import chain.

```md
## System Relationships

### Runtime Flow

src/extension.ts
→ src/commands/generatePrasangCommand.ts

src/commands/generatePrasangCommand.ts
→ src/core/createPrasangFile.ts

src/core/createPrasangFile.ts
→ src/core/analyzeRepository.ts
→ src/core/analyzeFolders.ts
→ src/core/analyzeDependencies.ts
→ src/core/analyzeEntryPoints.ts
→ src/core/analyzeImports.ts
```

No AST parser. No external dependencies. Deterministic line-by-line import parsing that handles TypeScript, JavaScript, `require()`, and re-exports.

### High Impact Files

Classifies files by their structural role in the import graph:

| Category | Criteria | Meaning |
|----------|----------|---------|
| **Orchestrator** | Imports 3+ local modules | Coordinates multiple subsystems |
| **Hub** | Imported by 3+ files | Central dependency — changes propagate widely |
| **Central Engine** | High in-degree and out-degree | Both consumed and consuming |
| **Entry Point** | Zero in-degree, positive out-degree | Root node — nothing imports it |

```md
## High Impact Files

### Orchestrators
- src/core/createPrasangFile.ts — imports 7 local modules

### Hubs
- src/core/analyzeImports.ts — imported by 3 files

### Entry Points
- src/extension.ts — root node, imports 1 module
```

### Blast Radius

For every file with significant downstream impact, Prasang computes which files are affected by a change — and separates **direct** from **indirect** impact to prevent overstating causality.

```md
## Blast Radius

src/intelligence/confidenceEngine.ts

**Direct Impact**
- src/core/analyzeEntryPoints.ts (Repository analysis logic)
- src/core/analyzeFolders.ts (Repository analysis logic)

**Indirect Impact**
- src/core/createPrasangFile.ts (Repository analysis logic)
- src/commands/generatePrasangCommand.ts (VS Code command orchestration)
- src/extension.ts (Primary application source code)
```

Direct impact = files that directly import the changed file.
Indirect impact = files affected through transitive dependency chains.

---

## How It Differs from Code Dumping

| | Code dump tools | Prasang |
|---|----------------|---------|
| **Output** | Raw source files concatenated | Compressed structural intelligence |
| **Token usage** | Fills context window with syntax | Maximizes understanding per token |
| **Architecture** | Lost in the noise | Explicitly mapped |
| **Relationships** | Not represented | Import graph with flow grouping |
| **Impact analysis** | Not available | Direct + indirect blast radius |
| **Determinism** | Varies | Same input → same output, always |

Prasang doesn't replace reading code. It gives AI models the structural context they need to reason about code they haven't seen.


---

## Installation

Coming soon.

Currently under active development.

### VS Code Marketplace

> Coming soon. The extension is in active development.

### From Source

```bash
git clone https://github.com/yourusername/prasang-file.git
cd prasang-file
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

### Usage

1. Open a repository in VS Code
2. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Run **Generate PRASANG File**
4. A `PRASANG.md` file is created at the repository root

Paste the contents of `PRASANG.md` into any AI model's context window before asking questions about the repository.

---

## Development

```bash
# Install dependencies
npm install

# Type check
npm run check-types

# Lint
npm run lint

# Full build (type check + lint + bundle)
npm run compile

# Watch mode
npm run watch

# Run tests
npm test
```

### Project Structure

```
src/
├── commands/
│   └── generatePrasangCommand.ts    # VS Code command handler
├── core/
│   ├── analyzeBlastRadius.ts        # Reverse transitive impact analysis
│   ├── analyzeDependencies.ts       # package.json dependency intelligence
│   ├── analyzeEntryPoints.ts        # Pattern-based entry detection
│   ├── analyzeFolders.ts            # Folder purpose and confidence scoring
│   ├── analyzeHighImpact.ts         # Graph-based file classification
│   ├── analyzeImports.ts            # Import graph construction
│   ├── analyzeRepository.ts         # Repository identity detection
│   └── createPrasangFile.ts         # Orchestrator + PRASANG.md generation
├── intelligence/
│   ├── confidenceEngine.ts          # Weighted evidence scoring
│   └── folderTaxonomy.ts            # Folder naming convention database
└── extension.ts                     # VS Code extension entry
```

---

## Design Principles

**Deterministic.** Same repository → same output. No randomness, no LLM calls, no network requests.

**No AST (yet).** Import parsing and structural analysis use line-by-line heuristics. This covers the vast majority of real-world TypeScript and JavaScript without introducing parser dependencies.

**Evidence-based confidence.** Confidence scores are computed from weighted evidence items — taxonomy matches, file patterns, implementation density, subdomain coherence. Every score is traceable and debuggable.

**Accuracy over impressiveness.** Blast radius separates direct from indirect impact. Confidence never claims 100% without strong evidence. Build artifacts are filtered from entry points. The system is designed to minimize hallucination risk, not maximize output volume.

**Token-optimized output.** The arrow notation for system relationships, the compressed dependency intelligence, the evidence-based folder map — every formatting choice prioritizes information density.

---

## Roadmap

Current focus areas, roughly ordered by priority:

- [ ] **Confidence calibration** — continued tuning of evidence weights across diverse repository types
- [ ] **Multi-language entry detection** — Go, Rust, Java entry patterns
- [ ] **Architecture pattern recognition** — monorepo detection, microservice boundaries, API/client separation
- [ ] **Git intelligence** — change frequency analysis, ownership signals, recently modified hotspots
- [ ] **AST cognition layer** — export analysis, function signature extraction, type relationship mapping
- [ ] **Configuration intelligence** — environment detection, feature flags, build configuration awareness
- [ ] **VS Code Marketplace publishing** — packaging, icons, marketplace listing


---

## Contributing

<<<<<<< HEAD
Ideas, feedback, and contributions are welcome.

If you find issues or have suggestions, open an issue.
Contributions are welcome. If you're interested in improving repository intelligence:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Make your changes with production-grade TypeScript
4. Ensure `npm run compile` passes (type check + lint + build)
5. Submit a pull request

Please keep changes deterministic and debuggable. Avoid introducing external parser dependencies unless strictly necessary.

---

## License

MIT

---

<div align="center">
<br />

**Prasang** — compress repository intelligence, not repository text.

</div>

