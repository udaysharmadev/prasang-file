# PRASANG

## Repository Identity

**Name:** prasang-file  
**Language:** TypeScript  
**Package Manager:** npm  
**Framework:** VS Code Extension  
**Repository Type:** VS Code Extension

## Critical Files

- README.md
- package.json
- tsconfig.json

## Dependency Intelligence

### Core Stack

- TypeScript
- esbuild
- VS Code API

### Tooling

- ESLint
- VS Code Testing

### Architectural Signals

- TypeScript-first repository
- Bundled build pipeline
- VS Code Extension Runtime

## Entry Points

- src/extension.ts → VS Code extension activation entrypoint
- src/commands/generatePrasangCommand.ts → command execution entrypoint

## Folder Purpose Map

### .vscode

**Purpose:** VS Code workspace configuration  
**Role:** Workspace Configuration  
**Confidence:** 90%  

**Signals**
- vscode convention
- editor configuration

### src

**Purpose:** Primary application source code  
**Role:** Application Root  
**Confidence:** 40%  

**Subdomains**
- commands
- core
- generation
- intelligence
- test
- types
- utils

**Signals**
- source folder convention
- typescript files

### src/commands

**Purpose:** VS Code command orchestration  
**Role:** Command Layer  
**Confidence:** 75%  

**Signals**
- command convention
- command file pattern
- generation file pattern
- typescript files

### src/core

**Purpose:** Repository analysis logic  
**Role:** Analysis Engine  
**Confidence:** 55%  

**Signals**
- core logic convention
- analysis file pattern
- typescript files

### src/generation

**Purpose:** Content generation layer  
**Role:** Generation Layer  
**Confidence:** 40%  

**Signals**
- generation convention

### src/intelligence

**Purpose:** Repository intelligence layer  
**Role:** Intelligence Layer  
**Confidence:** 50%  

**Signals**
- intelligence convention
- typescript files

### src/test

**Purpose:** Testing infrastructure  
**Role:** Testing  
**Confidence:** 65%  

**Signals**
- testing convention
- testing file pattern
- typescript files

### src/types

**Purpose:** Shared type definitions  
**Role:** Shared Contracts  
**Confidence:** 45%  

**Signals**
- typescript convention

### src/utils

**Purpose:** Shared helper utilities  
**Role:** Utility Layer  
**Confidence:** 40%  

**Signals**
- utility convention

