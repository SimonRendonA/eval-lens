# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in EvalLens, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email **security@rendonarango.com** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

You should receive a response within 48 hours. We'll work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

EvalLens processes user-uploaded files and (in self-hosted mode) makes API calls to third-party AI providers. Security concerns include:

- **File parsing vulnerabilities** — malformed CSV/JSONL designed to cause crashes or unexpected behavior
- **API key exposure** — any path where self-hosted API keys could leak to the client
- **Injection via file content** — malicious content in uploaded files that could execute in the browser
- **SSE stream manipulation** — tampering with the generation stream

## Design Decisions

- API keys are only read server-side in API routes. They are never sent to the client.
- The `/api/config` endpoint returns provider names and model lists, never keys.
- All file parsing happens client-side. No uploaded data is sent to our servers in hosted mode.
- EvalLens has no database, no user accounts, and no persistence. Session data lives in React state only.
- Export files are generated client-side and downloaded directly to the user's machine.

## Dependencies

We monitor dependencies for known vulnerabilities. If you notice a vulnerable dependency, please open a regular GitHub issue (dependency CVEs are not considered security vulnerabilities in EvalLens itself, but we want to address them).
