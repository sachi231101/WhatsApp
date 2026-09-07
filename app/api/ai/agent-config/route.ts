import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/app/api/authWrapper';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface AgentConfigData {
  agentName: string;
  isPaused: boolean;
  website: string;
  businessName: string;
  greetingMessage: string;
  currency: string;
  businessType: string;
  whatBusinessDoes: string;
  groundRules: string;
  tone: 'friendly' | 'professional' | 'concise' | 'playful';
  responseLength: 'short' | 'medium' | 'long';
  advancedTone: string;
  sources: Array<{
    id: string;
    type: 'url' | 'file' | 'text';
    name: string;
    details: string;
    status: 'Ready' | 'Crawling' | 'Indexed';
  }>;
  images: Array<{
    id: string;
    title: string;
    url: string;
    enabled: boolean;
  }>;
  skills: Array<{
    id: string;
    title: string;
    description: string;
    enabled: boolean;
  }>;
}

const DEFAULT_CONFIG: AgentConfigData = {
  agentName: 'Chat agent',
  isPaused: true,
  website: 'https://academyhunt.com',
  businessName: 'Academy Hunt',
  greetingMessage: 'Hello! Welcome to Academy Hunt. How can we help you today?',
  currency: 'Not set',
  businessType: 'Education',
  whatBusinessDoes:
    'Academy Hunt is a premier professional education and career development institute offering certified courses in Artificial Intelligence, Full-Stack Development, Data Science, and Digital Marketing with 100% placement support.',
  groundRules:
    'Always remain polite, encouraging, and helpful. Never guarantee admissions without eligibility check. Always mention our upcoming scholarship batch and offer to book a 15-minute live counselling demo.',
  tone: 'friendly',
  responseLength: 'medium',
  advancedTone: 'Use clear, accessible language. Include bullet points when explaining course curricula or fee structures.',
  sources: [
    {
      id: 'src-1',
      type: 'url',
      name: 'academyhunt.com',
      details: '1 website • 42 pages crawled',
      status: 'Ready',
    },
    {
      id: 'src-2',
      type: 'file',
      name: 'Academy_Hunt_Curriculum_2026.pdf',
      details: 'PDF • 14 pages • 3.2 MB',
      status: 'Ready',
    },
  ],
  images: [
    {
      id: 'img-1',
      title: 'Academy Hunt Main Campus',
      url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80',
      enabled: true,
    },
    {
      id: 'img-2',
      title: 'AI Lab & Classroom',
      url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80',
      enabled: true,
    },
    {
      id: 'img-3',
      title: 'Student Convocation & Placements',
      url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=80',
      enabled: true,
    },
    {
      id: 'img-4',
      title: 'Industry Certification Badge',
      url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80',
      enabled: true,
    },
  ],
  skills: [
    {
      id: 'skill-faq',
      title: 'FAQ / Support',
      description:
        'The contact asks a general question about the business — products, pricing, policies, hours, location, delivery areas, services, or "do you have/do you offer X". Use this whenever the answer should come from the business\'s own knowledge.',
      enabled: true,
    },
    {
      id: 'skill-handoff',
      title: 'Human Handoff',
      description:
        'The contact explicitly asks for a human/agent/manager, is clearly frustrated after you\'ve tried to help, raises something out of the bot\'s scope, or the matter is sensitive. Use it to hand off cleanly.',
      enabled: true,
    },
    {
      id: 'skill-demo',
      title: 'Lead Qualification & Demo Booking',
      description:
        'Captures prospect name, WhatsApp number, course preferences, and books live product demos/counselling sessions directly into the Dashboard Calendar with conflict detection.',
      enabled: true,
    },
    {
      id: 'skill-order',
      title: 'Course Enrollment & Admission Lookup',
      description:
        'Looks up student admission status, receipt numbers, and batch start dates using the student phone number.',
      enabled: false,
    },
    {
      id: 'skill-payment',
      title: 'WhatsApp Pay & Fee Links',
      description:
        'Generates instant Razorpay and WhatsApp Pay links for application fees and tuition instalments.',
      enabled: false,
    },
  ],
};

/**
 * GET /api/ai/agent-config
 * Retrieves the saved AI Agent builder config for the current workspace
 */
export const GET = withAuth(async function getAgentConfig(_request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;

    // Check if configuration exists in ai_configurations or ai_agents
    const { rows } = await sql`
      SELECT 
        name as "agentName",
        status,
        tone,
        role_description as "whatBusinessDoes",
        system_prompt as "groundRules"
      FROM ai_agents
      WHERE workspace_id = ${workspaceId}
      LIMIT 1
    `;

    if (rows.length > 0) {
      const a = rows[0];
      return NextResponse.json({
        status: 'ok',
        data: {
          ...DEFAULT_CONFIG,
          agentName: a.agentName || DEFAULT_CONFIG.agentName,
          isPaused: a.status === 'paused',
          tone: a.tone || DEFAULT_CONFIG.tone,
          whatBusinessDoes: a.whatBusinessDoes || DEFAULT_CONFIG.whatBusinessDoes,
          groundRules: a.groundRules || DEFAULT_CONFIG.groundRules,
        },
      });
    }

    return NextResponse.json({
      status: 'ok',
      data: DEFAULT_CONFIG,
    });
  } catch (error) {
    console.error('Error fetching agent config:', error);
    return NextResponse.json({ status: 'ok', data: DEFAULT_CONFIG });
  }
});

/**
 * POST /api/ai/agent-config
 * Saves updated AI Agent builder config for the workspace
 */
export const POST = withAuth(async function saveAgentConfig(request: NextRequest, session) {
  try {
    const workspaceId = session.workspace.workspaceId;
    const body: Partial<AgentConfigData> = await request.json();

    const agentName = body.agentName || DEFAULT_CONFIG.agentName;
    const status = body.isPaused ? 'paused' : 'active';
    const tone = body.tone || 'friendly';
    const whatBusinessDoes = body.whatBusinessDoes || DEFAULT_CONFIG.whatBusinessDoes;
    const groundRules = body.groundRules || DEFAULT_CONFIG.groundRules;

    await sql`
      INSERT INTO ai_agents (
        workspace_id,
        name,
        slug,
        role_description,
        system_prompt,
        tone,
        status,
        model_name
      )
      VALUES (
        ${workspaceId},
        ${agentName},
        'chat-agent',
        ${whatBusinessDoes},
        ${groundRules},
        ${tone},
        ${status},
        'gemini-2.0-flash'
      )
      ON CONFLICT (workspace_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        role_description = EXCLUDED.role_description,
        system_prompt = EXCLUDED.system_prompt,
        tone = EXCLUDED.tone,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      status: 'ok',
      message: 'Agent configuration published successfully!',
      data: body,
    });
  } catch (error) {
    console.error('Error saving agent config:', error);
    return NextResponse.json({ error: 'Failed to save agent configuration' }, { status: 500 });
  }
});
