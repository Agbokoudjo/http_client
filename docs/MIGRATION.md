# Changelog

All notable changes to `@wlindabla/http_client` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-04

### 🎉 Initial Release

First stable release of `@wlindabla/http_client` - a powerful, event-driven HTTP client for Node.js and browsers.

### ✨ Features

#### Core Functionality
- **Universal Support**: Works seamlessly in both Node.js (18+) and modern browsers
- **Event-Driven Architecture**: Inspired by Symfony HttpKernel with complete request lifecycle events
- **Delegate Pattern**: Flexible business logic injection at every request stage
- **Type-Safe**: Full TypeScript support with strict typing and generics

#### HTTP Methods
- Support for all standard HTTP methods: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- Automatic request body serialization (JSON, FormData, URLSearchParams)
- Multiple response types: json, text, blob, arrayBuffer, formData, stream

#### Request Management
- **Smart Retry**: Built-in retry mechanism with exponential backoff
- **Timeout Control**: Configurable timeouts with automatic abort
- **Request Cancellation**: Manual cancellation support with cleanup
- **Request Deduplication**: Prevent duplicate simultaneous requests

#### Event System
- `REQUEST` - Intercept before sending
- `BEFORE_SEND` - Last chance to modify request
- `RESPONSE` - Transform responses
- `ERROR` - Handle and recover from errors
- `TERMINATE` - Always called for cleanup

#### Developer Experience
- Zero runtime dependencies
- Comprehensive TypeScript definitions
- Detailed error messages with `HttpFetchError`
- Well-documented API with examples
- Extensive test coverage (80%+)

### 📦 Package Information

- **Package Name**: `@wlindabla/http_client`
- **Version**: 1.0.0
- **License**: MIT
- **Author**: AGBOKOUDJO Franck
- **Repository**: GitHub (to be published)

### 🔧 Technical Details

- **Node.js**: >=18.0.0
- **TypeScript**: >=5.0.0
- **Build Targets**: CommonJS + ESM
- **Browser Support**: All modern browsers with Fetch API

### 📚 Documentation

- Complete README with quick start guide
- Detailed API Reference
- Advanced usage guide with patterns
- Migration guide from Axios and Fetch
- Real-world examples for both environments

### 🧪 Testing

- Unit tests for all core functionality
- Integration tests with real HTTP server
- Browser-specific and Node.js-specific tests
- E2E tests for common scenarios
- Automated test suite with Vitest

---

## [Unreleased]

### Planned Features

- [ ] WebSocket support
- [ ] GraphQL client integration
- [ ] Request/Response interceptor chains
- [ ] Built-in rate limiting
- [ ] Offline queue for failed requests
- [ ] Progress tracking for uploads/downloads
- [ ] Automatic request retrying based on response headers
- [ ] Request/Response compression
- [ ] HTTP/2 multiplexing support

---

# Contributing to @wlindabla/http_client

Thank you for your interest in contributing to `@wlindabla/http_client`! This document provides guidelines and instructions for contributing.

---

## 📋 Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Making Changes](#making-changes)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Coding Standards](#coding-standards)
8. [Commit Messages](#commit-messages)

---

## 🤝 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Harassment, discriminatory language, or personal attacks
- Trolling or insulting/derogatory comments
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Yarn >= 4.0.0 (preferred) or npm
- Git
- A GitHub account

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/Agbokoudjo/http_client.git
cd http_client
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/Agbokoudjo/http_client.git
```

---

## 💻 Development Setup

### Install Dependencies

```bash
# Using Yarn (recommended)
yarn install

# Using npm
npm install
```

### Build the Project

```bash
# Build all formats (CJS + ESM + Types)
yarn build

# Build specific format
yarn build:cjs
yarn build:esm
yarn build:types
```

### Run Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run specific test suite
yarn test:unit
yarn test:integration
yarn test:e2e
```

### Development Workflow

```bash
# Start development with auto-rebuild
yarn dev

# Run linter
yarn lint

# Format code
yarn format

# Type check
yarn typecheck
```

---

## 🔧 Making Changes

### Branch Naming

Create a descriptive branch name:

```bash
# For features
git checkout -b feature/add-websocket-support

# For bug fixes
git checkout -b fix/timeout-handling

# For documentation
git checkout -b docs/improve-api-reference

# For refactoring
git checkout -b refactor/simplify-event-system
```

### Workflow

1. **Update your fork**:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

2. **Create a feature branch**:

```bash
git checkout -b feature/your-feature-name
```

3. **Make your changes**:
   - Write code following our [coding standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**:

```bash
yarn test
yarn lint
yarn typecheck
```

5. **Commit your changes** (see [commit messages](#commit-messages))

6. **Push to your fork**:

```bash
git push origin feature/your-feature-name
```

7. **Open a Pull Request**

---

## 🧪 Testing

### Writing Tests

- **Unit tests**: Test individual functions and classes in isolation
- **Integration tests**: Test interactions between components
- **E2E tests**: Test complete workflows

**Example unit test**:

```typescript
import { describe, it, expect } from 'vitest';
import { isClientError } from '../src/utils';

describe('isClientError', () => {
  it('should return true for 4xx status codes', () => {
    expect(isClientError(400)).toBe(true);
    expect(isClientError(404)).toBe(true);
  });

  it('should return false for non-4xx status codes', () => {
    expect(isClientError(200)).toBe(false);
    expect(isClientError(500)).toBe(false);
  });
});
```

### Test Coverage Requirements

- Minimum 80% coverage for new code
- All public APIs must have tests
- Critical paths must have integration tests

### Running Specific Tests

```bash
# Run tests for a specific file
yarn test src/core/FetchRequest.test.ts

# Run tests matching a pattern
yarn test --grep "error handling"

# Run tests in UI mode
yarn test:ui
```

---

## 📝 Pull Request Process

### Before Submitting

1. **Ensure all tests pass**:

```bash
yarn test
yarn lint
yarn typecheck
yarn build
```

2. **Update documentation**:
   - README.md (if adding features)
   - API-REFERENCE.md (if changing APIs)
   - JSDoc comments in code

3. **Update CHANGELOG.md**:

```markdown
## [Unreleased]

### Added
- New feature description (#PR-number)

### Changed
- What was changed (#PR-number)

### Fixed
- Bug fix description (#PR-number)
```

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Fixes #(issue number)

## How Has This Been Tested?
Describe the tests you ran

## Checklist
- [ ] My code follows the code style of this project
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] All new and existing tests passed
- [ ] I have updated the documentation accordingly
- [ ] I have updated the CHANGELOG.md
```

### Review Process

1. A maintainer will review your PR within 3-5 business days
2. Address any requested changes
3. Once approved, a maintainer will merge your PR

---

## 📐 Coding Standards

### TypeScript Style Guide

**Use strict typing**:

```typescript
// ✅ Good
function fetchUser(id: string): Promise<User> {
  // ...
}

// ❌ Bad
function fetchUser(id: any): Promise<any> {
  // ...
}
```

**Prefer interfaces over types**:

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

// ❌ Bad (unless necessary)
type User = {
  id: string;
  name: string;
}
```

**Use readonly where appropriate**:

```typescript
interface FetchResponse {
  readonly status: number;
  readonly data: any;
}
```

### Code Organization

- One class/interface per file
- Group related functionality
- Use barrel exports (index.ts)

**File structure**:

```
src/
├── core/           # Core functionality
├── events/         # Event classes
├── contracts/      # Interfaces
├── types/          # Type definitions
├── utils/          # Utility functions
└── index.ts        # Main export
```

### Naming Conventions

- **Classes**: PascalCase (`FetchRequest`, `HttpEvent`)
- **Interfaces**: PascalCase with `Interface` suffix (`FetchDelegateInterface`)
- **Functions**: camelCase (`fetchData`, `parseResponse`)
- **Constants**: UPPER_SNAKE_CASE (`HTTP_CLIENT_EVENTS`)
- **Files**: kebab-case (`fetch-request.ts`)

### Documentation

**Add JSDoc comments for all public APIs**:

```typescript
/**
 * Executes an HTTP request and returns the response.
 * 
 * @returns A promise that resolves to the HTTP response
 * @throws {HttpFetchError} If the request fails after all retries
 * 
 * @example
 * ```typescript
 * const response = await request.handle();
 * console.log(response.data);
 * ```
 */
async handle(): Promise<FetchResponseInterface> {
  // ...
}
```

---

## 💬 Commit Messages

### Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(events): add TERMINATE event to lifecycle"

# Bug fix
git commit -m "fix(request): resolve timeout not being cancelled"

# Documentation
git commit -m "docs(readme): add migration guide from axios"

# Breaking change
git commit -m "feat(api)!: change FetchRequest constructor signature

BREAKING CHANGE: FetchRequest now requires dispatcher as second parameter"
```

---

## 🏆 Recognition

Contributors will be recognized in:
- README.md Contributors section
- Release notes
- GitHub contributors graph

---

## 📞 Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/Agbokoudjo/http_client/discussions)
- **Bugs**: Open a [GitHub Issue](https://github.com/Agbokoudjo/http_client/issues)
- **Email**: internationaleswebservices@gmail.com

---

## 📄 License

By contributing to `@wlindabla/http_client`, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! 🎉**

Your efforts help make this library better for everyone.