# CLAUDE.md - AI Assistant Guide for XangamSage

> **Purpose**: This document provides comprehensive guidance for AI assistants (like Claude) working on the XangamSage codebase. It outlines the project structure, development workflows, coding conventions, and best practices to ensure consistent and effective assistance.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Development Workflows](#development-workflows)
5. [Coding Conventions](#coding-conventions)
6. [Testing Strategy](#testing-strategy)
7. [Build & Deployment](#build--deployment)
8. [AI Assistant Guidelines](#ai-assistant-guidelines)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

### About XangamSage

**Status**: New Project (Repository Initialized)

XangamSage is a [DESCRIPTION PENDING - Update when project scope is defined]

### Key Objectives

- [Objective 1 - To be defined]
- [Objective 2 - To be defined]
- [Objective 3 - To be defined]

### Project Metadata

- **Repository**: xangam-tech/XangamSage
- **Primary Language**: [To be determined]
- **License**: [To be determined]
- **Maintainers**: [To be listed]

---

## Repository Structure

> **Note**: This section should be updated as the project structure is established.

```
XangamSage/
├── .git/                  # Git version control
├── CLAUDE.md             # This file - AI assistant guide
├── README.md             # [To be created] Project documentation
├── src/                  # [To be created] Source code
├── tests/                # [To be created] Test files
├── docs/                 # [To be created] Additional documentation
├── config/               # [To be created] Configuration files
└── scripts/              # [To be created] Utility scripts
```

### Key Directories

| Directory | Purpose | Notes |
|-----------|---------|-------|
| `src/` | Main source code | [Update when created] |
| `tests/` | Test suites | [Update when created] |
| `docs/` | Documentation | [Update when created] |
| `config/` | Configuration files | [Update when created] |

---

## Technology Stack

> **Current Status**: To be determined based on project requirements.

### Languages & Frameworks

- **Primary Language**: [To be determined]
- **Framework**: [To be determined]
- **Runtime/Platform**: [To be determined]

### Development Tools

- **Version Control**: Git
- **Package Manager**: [To be determined]
- **Build Tool**: [To be determined]
- **Linter/Formatter**: [To be determined]

### Key Dependencies

[To be listed when dependencies are added]

---

## Development Workflows

### Branch Strategy

**Current Branch Naming Convention**:
- Feature branches: `claude/claude-md-<session-id>`
- Development branch: [To be determined]
- Production branch: [To be determined]

### Git Workflow

1. **Creating a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Making Changes**
   - Write code following coding conventions
   - Add tests for new functionality
   - Update documentation as needed

3. **Committing**
   ```bash
   git add .
   git commit -m "Clear, descriptive commit message"
   ```

4. **Pushing**
   ```bash
   git push -u origin branch-name
   ```

### Commit Message Conventions

[To be defined - Consider adopting Conventional Commits or similar]

Example format:
```
type(scope): brief description

Detailed explanation if needed

- Additional context
- Breaking changes
- Issue references
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## Coding Conventions

> **Note**: Update this section with project-specific conventions as they are established.

### General Principles

1. **Clarity over Cleverness**: Write code that is easy to understand
2. **Consistency**: Follow established patterns in the codebase
3. **DRY (Don't Repeat Yourself)**: Avoid code duplication
4. **YAGNI (You Aren't Gonna Need It)**: Don't add functionality until needed
5. **KISS (Keep It Simple, Stupid)**: Prefer simple solutions

### Code Style

[To be defined based on chosen language/framework]

- **Indentation**: [spaces/tabs, size]
- **Line Length**: [max characters]
- **Naming Conventions**:
  - Variables: [convention]
  - Functions: [convention]
  - Classes: [convention]
  - Constants: [convention]

### File Organization

[To be defined]

---

## Testing Strategy

### Testing Philosophy

[To be defined - unit tests, integration tests, e2e tests, etc.]

### Running Tests

```bash
# Command to be defined
```

### Writing Tests

[Guidelines for writing tests]

### Test Coverage

- **Target**: [e.g., 80% code coverage]
- **Required for**: [e.g., all new features, bug fixes]

---

## Build & Deployment

### Local Development Setup

```bash
# Steps to be defined when project is initialized
# Example:
# 1. Clone repository
# 2. Install dependencies
# 3. Configure environment
# 4. Run development server
```

### Building for Production

```bash
# Build command to be defined
```

### Deployment Process

[To be documented when deployment pipeline is established]

---

## AI Assistant Guidelines

### When Working with This Codebase

1. **Always Read Before Modifying**
   - Never propose changes to code you haven't read
   - Understand existing patterns before suggesting modifications

2. **Use Task Management**
   - Use TodoWrite tool for multi-step tasks
   - Track progress and keep user informed
   - Mark tasks as completed immediately when done

3. **Security First**
   - Watch for security vulnerabilities (XSS, SQL injection, command injection, etc.)
   - Follow OWASP Top 10 guidelines
   - Immediately fix any insecure code you write

4. **Avoid Over-Engineering**
   - Only make changes that are directly requested or clearly necessary
   - Keep solutions simple and focused
   - Don't add features, refactoring, or improvements beyond what was asked
   - Don't add error handling for scenarios that can't happen

5. **File Operations**
   - Prefer editing existing files over creating new ones
   - Use specialized tools (Read, Edit, Write) instead of bash commands
   - Don't create documentation unless explicitly requested

6. **Communication**
   - Be concise and clear
   - Use code references with `file_path:line_number` format
   - Output explanations as text, not in code comments or bash echo

### Recommended Tool Usage

- **Searching Code**: Use Task tool with Explore subagent for complex searches
- **Reading Files**: Use Read tool (not cat/head/tail)
- **Editing Files**: Use Edit tool (not sed/awk)
- **Writing Files**: Use Write tool (not echo/cat with heredoc)
- **Finding Files**: Use Glob tool (not find/ls)
- **Searching Content**: Use Grep tool (not grep/rg commands)

### Git Operations Best Practices

1. **Pushing Changes**
   - Always use `git push -u origin <branch-name>`
   - Branch must start with 'claude/' and end with matching session ID
   - Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s) on network errors

2. **Fetching/Pulling**
   - Prefer fetching specific branches: `git fetch origin <branch-name>`
   - Retry up to 4 times with exponential backoff on network failures

3. **Safety Protocol**
   - NEVER update git config
   - NEVER run destructive commands (force push, hard reset) without explicit permission
   - NEVER skip hooks unless explicitly requested
   - NEVER force push to main/master without warning
   - Avoid `git commit --amend` unless very specific conditions are met

---

## Common Tasks

### Task Checklist for AI Assistants

When completing a task, follow this checklist:

- [ ] Read the task description carefully
- [ ] Create a todo list if the task has multiple steps
- [ ] Read relevant files before making changes
- [ ] Understand existing code patterns
- [ ] Make minimal, focused changes
- [ ] Test changes if testing infrastructure exists
- [ ] Update documentation if needed
- [ ] Commit with clear message
- [ ] Push to appropriate branch
- [ ] Mark all todos as completed

### Common Workflows

#### Adding a New Feature

1. Create todo list for the feature
2. Research existing codebase patterns
3. Implement feature following conventions
4. Add tests for new functionality
5. Update documentation
6. Commit and push changes

#### Fixing a Bug

1. Reproduce and understand the bug
2. Locate the problematic code
3. Fix the issue with minimal changes
4. Add test to prevent regression
5. Commit and push the fix

#### Refactoring Code

1. Understand current implementation
2. Identify specific improvements needed
3. Make incremental, safe changes
4. Ensure tests still pass
5. Commit each logical change separately

---

## Troubleshooting

### Common Issues

[To be populated as common issues are identified]

### Getting Help

- Check existing documentation
- Review recent commit history for context
- Examine similar code in the repository
- Ask the user for clarification if needed

---

## Maintenance

### Keeping This Document Updated

This CLAUDE.md file should be updated whenever:

- Project structure changes significantly
- New conventions or patterns are established
- Development workflows are modified
- New tools or technologies are adopted
- Common issues or solutions are identified

**Last Updated**: 2026-01-23
**Last Updated By**: Claude (Initial creation)
**Next Review**: [To be scheduled]

---

## Additional Resources

### Internal Documentation

- README.md - [To be created]
- Architecture docs - [To be created]
- API documentation - [To be created]

### External References

[Links to relevant external documentation, style guides, etc.]

---

## Notes for Future Development

### Pending Decisions

- [ ] Choose primary programming language/framework
- [ ] Define coding style guide
- [ ] Establish testing strategy
- [ ] Set up CI/CD pipeline
- [ ] Define deployment process
- [ ] Create project documentation structure

### Ideas & Considerations

- Consider adopting established style guides (e.g., Airbnb, Google)
- Evaluate need for pre-commit hooks
- Plan for internationalization if needed
- Consider security scanning tools
- Plan for logging and monitoring

---

**Remember**: This is a living document. Keep it updated as the project evolves!
