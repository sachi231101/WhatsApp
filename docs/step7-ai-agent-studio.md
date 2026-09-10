# Step 7: AI Agent Studio Architecture & Documentation

Wazzi App's **AI Agent Studio** provides an enterprise-grade control center for creating, managing, testing, versioning, and deploying autonomous AI agents for WhatsApp Business.

---

## 1. Architectural Overview

```
WhatsApp Customer Message
        ↓
Meta Webhook (/api/webhook)
        ↓
Webhook Storage & Signature Validation (webhook_events)
        ↓
BullMQ Inbound Webhook Queue (whatsapp-webhook)
        ↓
Webhook Worker (webhookWorker.ts)
        ↓
Message Storage & Conversation Resolution (conversations & messages)
        ↓
AI Handling Decision (conversation.handling_mode)
        ↓
BullMQ AI Message Queue (whatsapp-ai-message)
        ↓
AI Worker (aiWorker.ts)
        ↓
AIOrchestrator
        ↓
Active Agent & Current Published Immutable Version
        ↓
ConversationContextBuilder (History + Contact 360 + Knowledge Hook)
        ↓
AI Provider Abstraction (AIProviderFactory → OpenAIProvider)
        ↓
Production Guardrails & Escalation Decision
        ↓
Existing Outbound Message Service (inboxService)
        ↓
BullMQ Outbound WhatsApp Queue (whatsapp-outbound)
        ↓
Meta WhatsApp Cloud API
        ↓
Ably Realtime Events (`workspace:{wsId}:project:{projId}:ai`)
        ↓
Production Team Inbox UI
```

---

## 2. AI Provider Abstraction

AI provider interactions are decoupled from business logic via standard interfaces in `lib/ai/providers/`:

- **`AIProvider` Interface**:
  - `generateResponse(options: AICompletionOptions): Promise<AICompletionResult>`
  - `generateStructuredOutput<T>(options: AICompletionOptions, schemaName?: string): Promise<{ data: T; raw: AICompletionResult }>`
  - `countTokens(text: string): number`
  - `healthCheck(): Promise<AIProviderHealth>`

- **`AIProviderFactory`**:
  - Central factory for instantiating AI providers based on provider identifier (`openai`).
  - Extensible architecture designed for future Google Gemini and Anthropic Claude additions without refactoring the agent pipeline.

- **`OpenAIProvider`**:
  - Primary LLM provider implementation supporting `gpt-4o-mini`, `gpt-4o`, and `gpt-3.5-turbo`.
  - Configurable server-side via `OPENAI_API_KEY`.
  - Built-in request timeouts (25s), token estimation, and test mocking harness for Vitest.

---

## 3. Database Models

The AI Agent Studio uses PostgreSQL tables managed via Drizzle ORM and automatic idempotent migrations in `lib/auth/context.ts`:

### `ai_agents`
- `id` (UUID, Primary Key)
- `workspace_id` (UUID, Foreign Key → `workspaces.id`)
- `project_id` (UUID, Foreign Key → `projects.id`)
- `name` (VARCHAR(100))
- `slug` (VARCHAR(100), Unique per project)
- `description` (TEXT)
- `status` (`DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED`)
- `handling_mode` (`AI_HANDLING`, `HUMAN_HANDLING`, `HYBRID`)
- `current_version_id` (UUID, Pointer to current published version)
- `created_by` (UUID, Foreign Key → `users.id`)
- `created_at`, `updated_at`, `archived_at` (TIMESTAMPTZ)

### `ai_agent_versions` (Immutable Published Versions)
- `id` (UUID, Primary Key)
- `agent_id` (UUID, Foreign Key → `ai_agents.id`)
- `workspace_id` (UUID, Foreign Key → `workspaces.id`)
- `project_id` (UUID, Foreign Key → `projects.id`)
- `version_number` (INT, Unique per agent)
- `status` (`DRAFT`, `PUBLISHED`, `ARCHIVED`)
- `role` (TEXT)
- `system_instructions` (TEXT)
- `tone` (VARCHAR(50))
- `language` (VARCHAR(50))
- `greeting_message` (TEXT)
- `fallback_message` (TEXT)
- `response_behavior` (JSONB)
- `escalation_enabled` (BOOLEAN)
- `escalation_message` (TEXT)
- `escalation_conditions` (JSONB)
- `max_response_length` (INT)
- `temperature` (NUMERIC(3, 2))
- `model` (VARCHAR(100))
- `provider` (VARCHAR(50))
- `configuration` (JSONB)
- `created_by` (UUID)
- `created_at`, `published_at` (TIMESTAMPTZ)

### `ai_agent_knowledge_bases` (Future Step 8 Hook)
- `id` (UUID, Primary Key)
- `agent_id` (UUID, Foreign Key → `ai_agents.id`)
- `knowledge_base_id` (UUID)
- `created_at` (TIMESTAMPTZ)

### `ai_usage` (Telemetry & Observability)
- `id` (UUID, Primary Key)
- `workspace_id`, `project_id`, `agent_id`, `agent_version_id`, `conversation_id`
- `provider`, `model`
- `input_tokens`, `output_tokens`, `total_tokens`, `latency_ms`
- `status` (`SUCCESS`, `FAILED`, `ESCALATED`)
- `error_code` (VARCHAR(100))
- `created_at` (TIMESTAMPTZ)

---

## 4. Draft System & Immutable Versioning

Agents follow a strict versioning and publishing lifecycle:

1. **Create Draft**: Creating an agent generates Version 1 in `DRAFT` status.
2. **Draft Updates**: Modifying an agent in draft updates the existing draft version.
3. **Publishing**:
   - Validates all mandatory fields (`name`, `role`, `systemInstructions`, `provider`, `model`).
   - Marks the draft version as `PUBLISHED` with timestamp.
   - Archives the previous published version (`ARCHIVED`).
   - Sets `ai_agents.current_version_id` to the newly published version.
   - Sets `ai_agents.status` to `ACTIVE`.
   - Records an immutable audit log (`agent.published`).
   - Emits realtime Ably event (`agent.published`).
4. **Immutability Guarantee**: Once published, a version can **never** be edited. Subsequent edits fork a new draft version with incremented `version_number`.
5. **Rollback**:
   - Allows rolling back to any historical published version.
   - Copies the historical configuration into a new active version (preserving audit history without rewriting historical records).
   - Records an audit log (`agent.rollback`).

---

## 5. WhatsApp Inbox Integration & Handling Modes

Incoming WhatsApp messages are handled asynchronously via BullMQ workers:

- **`AI_HANDLING`**: The active AI agent automatically evaluates the inbound message, retrieves conversation context, calls the LLM, applies guardrails, and sends replies via WhatsApp.
- **`HUMAN_HANDLING`**: Automatically pauses AI replies for this conversation. Used when a human agent takes over or after escalation.
- **`HYBRID`**: AI responds to customer inquiries unless built-in or configured escalation conditions trigger human handoff.

### Escalation Flow
1. Evaluates human intent patterns (e.g., "speak to human", "agent please", "talk to representative") and custom keyword conditions configured on the agent version.
2. If triggered:
   - Sets `conversations.handling_mode = 'HUMAN_HANDLING'`.
   - Records `contact_activities` entry with reason.
   - Emits `ai.escalated` and `conversation.updated` realtime events.
   - Sends configured `escalation_message` to the customer.

---

## 6. Routes & Endpoints

### Frontend UI Routes
- `/projects/[id]/ai` → Redirects to `/projects/[id]/ai/agents`
- `/projects/[id]/ai/agents` → Agent list page (search, filters, status, cards, actions)
- `/projects/[id]/ai/agents/new` → 5-step creation wizard with draft saving and live preview
- `/projects/[id]/ai/agents/[agentId]` → Agent overview, version history, usage metrics, configuration
- `/projects/[id]/ai/agents/[agentId]/edit` → Agent draft editor with tabbed configuration
- `/projects/[id]/ai/agents/[agentId]/test` → Interactive AI test playground and debug inspector

### API Endpoints
- `GET /api/projects/[id]/ai/agents` — List project agents
- `POST /api/projects/[id]/ai/agents` — Create new agent + initial draft
- `GET /api/projects/[id]/ai/agents/[agentId]` — Get agent details and versions
- `PATCH /api/projects/[id]/ai/agents/[agentId]` — Update draft configuration
- `DELETE /api/projects/[id]/ai/agents/[agentId]` — Archive agent
- `POST /api/projects/[id]/ai/agents/[agentId]/publish` — Publish draft version
- `POST /api/projects/[id]/ai/agents/[agentId]/pause` — Pause agent
- `POST /api/projects/[id]/ai/agents/[agentId]/activate` — Activate agent
- `POST /api/projects/[id]/ai/agents/[agentId]/duplicate` — Clone agent into new draft
- `POST /api/projects/[id]/ai/agents/[agentId]/rollback` — Roll back to prior version
- `POST /api/projects/[id]/ai/agents/[agentId]/test` — Test playground sandbox
- `POST /api/projects/[id]/ai/agents/preview-test` — Wizard preview test sandbox
- `GET /api/projects/[id]/ai/agents/[agentId]/versions` — List immutable versions
- `GET /api/projects/[id]/ai/agents/[agentId]/usage` — Get usage telemetry summary

---

## 7. Security & Zero Fake Data Policy

- **Multi-Tenant Isolation**: Every database query strictly filters by both `workspace_id` and `project_id`. No cross-tenant access is permitted.
- **Role-Based Access Control**:
  - `OWNER` / `ADMIN`: Full AI agent management, publishing, rollback, and deletion.
  - `MEMBER`: Create, edit drafts, and test agents.
  - `VIEWER`: Read-only access and testing sandbox.
- **Zero Fake Data**:
  - If no agents exist, empty states are shown.
  - Test playground queries the real configured LLM provider.
  - If `OPENAI_API_KEY` is missing or unconfigured, the UI clearly displays: `"AI provider is not configured."`. No mock answers are fabricated.
- **Secret Protection**: Provider API keys and internal credentials are never sent to the client, never returned in API payloads, and omitted from audit logs.

---

## 8. Configuration

Add the following to `.env.local`:

```bash
# OpenAI Provider Configuration (Server-side only)
OPENAI_API_KEY='sk-your-openai-api-key-here'
```
