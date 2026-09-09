import { sql } from '@/lib/db';
import { AIMessage } from './providers/types';

export interface ContextOptions {
  workspaceId: string;
  projectId: string;
  conversationId: string;
  contactId?: string;
  maxRecentMessages?: number;
  maxTokens?: number;
}

export interface ConversationContext {
  messages: AIMessage[];
  contactDetails?: {
    name: string;
    phone: string;
    email?: string | null;
    company?: string | null;
    leadScore?: number;
  };
  knowledgeContext?: string;
}

export class ConversationContextBuilder {
  /**
   * Future-ready Knowledge Hook for Step 8 RAG integration.
   * In Step 7, returns empty knowledge context.
   */
  static async retrieveRelevantKnowledge(
    _query: string,
    _agentId: string,
    _workspaceId: string,
    _projectId: string,
  ): Promise<string> {
    // Step 8 will connect pgvector embeddings and semantic search here.
    return '';
  }

  /**
   * Builds the conversation history and customer metadata for AI context.
   */
  static async buildContext(options: ContextOptions): Promise<ConversationContext> {
    const {
      workspaceId,
      projectId,
      conversationId,
      maxRecentMessages = 10,
    } = options;

    // 1. Fetch recent messages for the conversation (excluding internal notes)
    const { rows: msgRows } = await sql`
      SELECT direction, body, created_at, type
      FROM messages
      WHERE conversation_id = ${conversationId}
        AND workspace_id = ${workspaceId}
        AND project_id = ${projectId}
        AND is_internal = FALSE
      ORDER BY created_at DESC
      LIMIT ${maxRecentMessages}
    `;

    // Messages fetched DESC, reverse to chronological ASC
    const chronological = [...msgRows].reverse();

    const messages: AIMessage[] = chronological
      .filter((m: any) => m.body && m.body.trim())
      .map((m: any) => ({
        role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
        content: String(m.body).trim(),
      }));

    // 2. Fetch contact info if conversation is linked
    let contactDetails: ConversationContext['contactDetails'];
    const { rows: convRows } = await sql`
      SELECT c.contact_id, ct.display_name, ct.phone_number, ct.email, ct.company, ct.lead_score
      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      WHERE c.id = ${conversationId}
        AND c.workspace_id = ${workspaceId}
        AND c.project_id = ${projectId}
      LIMIT 1
    `;

    if (convRows.length > 0) {
      const r = convRows[0];
      contactDetails = {
        name: r.display_name || 'Customer',
        phone: r.phone_number || '',
        email: r.email,
        company: r.company,
        leadScore: r.lead_score,
      };
    }

    return {
      messages,
      contactDetails,
      knowledgeContext: '',
    };
  }
}
