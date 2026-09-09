'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCheck,
  Globe,
  X,
  Zap,
  Headphones,
  Users,
  Sliders,
  Briefcase,
  Smile,
  ChevronDown,
  ChevronRight,
  Send,
  Loader2,
  BookOpen,
  Brain,
  Settings,
  Settings2,
  FlaskConical,
  RotateCcw,
  Sparkles,
  Info,
  GraduationCap,
  FileText,
  Eye,
  MessageCircle,
  MessageSquare,
  Plus,
  UploadCloud,
  CheckCircle2,
  Phone,
  Shield,
  Clock,
  ExternalLink,
  Lightbulb,
  Search,
  HelpCircle,
  AlignLeft,
  Link as LinkIcon,
  Trash2,
  Database,
  Pencil,
  Sparkles as SparklesIcon,
} from 'lucide-react';

// ─── Custom Icons ─────────────────────────────────────────────────────────────
function TieIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 2h4l1 3-3 1-3-1 1-3z" />
      <path d="M9 6l3 1 3-1 1.5 12-4.5 3-4.5-3L9 6z" />
    </svg>
  );
}

function YouTubeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#ef4444">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function GoogleDriveIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M7.71 3.5L1.15 15l3.43 5.95 6.56-11.45L7.71 3.5z" fill="#0066DA" />
      <path d="M16.29 3.5H7.71l3.43 6 4.29 7.5 4.28-7.5-3.42-6z" fill="#00AC47" />
      <path d="M22.85 15l-3.43-5.95-4.28 7.5L11.71 22.5h8.57l2.57-7.5z" fill="#EA4335" />
      <path d="M11.71 22.5l3.43-6H4.58l-3.43 6h10.56z" fill="#2684FC" />
      <path d="M16.29 3.5l6.56 11.5-3.43 6-6.56-11.5 3.43-6z" fill="#FFBA00" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5;
type ToneType = 'professional' | 'friendly' | 'casual';

interface AgentRoleItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

interface ConnectedSource {
  id: string;
  type: 'website' | 'documents' | 'faqs' | 'text' | 'youtube' | 'drive';
  name: string;
  details: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Basics', sublabel: 'Basic information' },
  { id: 2, label: 'Instructions', sublabel: 'Set behavior & role' },
  { id: 3, label: 'Knowledge', sublabel: 'Connect data sources' },
  { id: 4, label: 'Behavior', sublabel: 'Advanced settings' },
  { id: 5, label: 'Test & Publish', sublabel: 'Test and activate' },
] as const;

const ROLES: AgentRoleItem[] = [
  {
    id: 'sales-assistant',
    title: 'Sales Assistant',
    description: 'Generate leads and help with sales',
    icon: GraduationCap,
  },
  {
    id: 'customer-support',
    title: 'Customer Support',
    description: 'Answer questions and solve customer issues',
    icon: Headphones,
  },
  {
    id: 'lead-qualification',
    title: 'Lead Qualification',
    description: 'Qualify and score incoming student leads',
    icon: Users,
  },
  {
    id: 'academic-counselor',
    title: 'Academic Counselor',
    description: 'Guide students on courses, schedules, and admissions',
    icon: BookOpen,
  },
  {
    id: 'custom-role',
    title: 'Custom Assistant',
    description: 'Define your own tailored workflow and role',
    icon: Sliders,
  },
];

const DEFAULT_INSTRUCTIONS = `You are a helpful sales assistant for ABC Academy.
Answer questions about our courses, fees, admission process, schedules, and placements.
Be polite, professional, and keep your answers short and clear.
If you don't know something, ask the user to contact our team.`;

const DEFAULT_GUIDELINES = `• Always be polite and respectful.
• Provide accurate information only about our courses and services.
• Do not make false promises.
• If the user asks something unrelated, politely redirect to education-related topics.`;

const INITIAL_CHAT_MESSAGES_STEP2: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'user',
    text: 'What courses do you offer?',
    time: '10:24 AM',
  },
  {
    id: 'msg-2',
    sender: 'agent',
    text: `We offer a variety of courses including Data Science, Web Development, Digital Marketing, and more.

Would you like to know more about any specific course?`,
    time: '10:24 AM',
  },
];

const INITIAL_CHAT_MESSAGES_STEP3: ChatMessage[] = [
  {
    id: 'k-msg-1',
    sender: 'user',
    text: 'What are your admission requirements?',
    time: '10:24 AM',
  },
  {
    id: 'k-msg-2',
    sender: 'agent',
    text: `Admission requirements include a completed application form, academic documents, and a valid ID proof.

Would you like me to share the detailed admission process?`,
    time: '10:24 AM',
  },
];

const INITIAL_CHAT_MESSAGES_STEP4: ChatMessage[] = [
  {
    id: 'b-msg-1',
    sender: 'user',
    text: 'Do you have online classes?',
    time: '10:24 AM',
  },
  {
    id: 'b-msg-2',
    sender: 'agent',
    text: `Yes! We offer both online and offline classes for all our courses. 🌟

You can attend live interactive sessions from anywhere, and you'll get the same course materials, certifications, and support as our offline students.

Would you like to know more about a specific course?`,
    time: '10:24 AM',
  },
];

const INITIAL_CHAT_MESSAGES_STEP5: ChatMessage[] = [
  {
    id: 'tp-msg-1',
    sender: 'user',
    text: 'What courses do you offer?',
    time: '10:24 AM',
  },
  {
    id: 'tp-msg-2',
    sender: 'agent',
    text: `We offer a variety of courses including Data Science, Web Development, Digital Marketing, and more.

Would you like to know more about any specific course?`,
    time: '10:24 AM',
  },
  {
    id: 'tp-msg-3',
    sender: 'user',
    text: 'What is the admission process?',
    time: '10:25 AM',
  },
  {
    id: 'tp-msg-4',
    sender: 'agent',
    text: `The admission process is simple:

1. Fill out the online application form
2. Submit the required documents
3. Pay the admission fee
4. Receive confirmation from our team

Would you like me to share the application link?`,
    time: '10:25 AM',
  },
];

const PREVIEW_ANSWERS: Record<string, string> = {
  'What courses do you offer?': `We offer a variety of courses including Data Science, Web Development, Digital Marketing, and more.

Would you like to know more about any specific course?`,
  'What are the course fees?': `Our course fees vary depending on the program:
• Full Stack Web Development: ₹35,000
• Data Science & AI Masterclass: ₹45,000
• Digital Marketing Professional: ₹25,000

We also offer flexible 0% interest EMI options! Would you like me to share the fee breakdown?`,
  'How can I get admission?': `Admission is simple! Here are the 3 quick steps:
1. Fill out our online application form.
2. Attend a short counseling & skill assessment session.
3. Complete enrollment and access the learning portal immediately.

Would you like me to send you the direct registration link?`,
  'Do you offer online classes?': `Yes! All our courses are available in live online interactive batches with weekend & weekday schedules. 🌟

You can attend live interactive sessions from anywhere, and you'll get the same course materials, certifications, and support as our offline students.

Would you like to know more about a specific course?`,
  'What are your admission requirements?': `Admission requirements include a completed application form, academic documents, and a valid ID proof.

Would you like me to share the detailed admission process?`,
  'What is the admission process?': `The admission process is simple:

1. Fill out the online application form
2. Submit the required documents
3. Pay the admission fee
4. Receive confirmation from our team

Would you like me to share the application link?`,
};

export default function CreateAIAgentPage() {
  const router = useRouter();

  // Step state defaults to 5 to match the newly requested Step 5: Test & Publish screen
  const [currentStep, setCurrentStep] = useState<Step>(5);

  // Form State - Step 2
  const [systemInstructions, setSystemInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [selectedRole, setSelectedRole] = useState<AgentRoleItem>(ROLES[0]);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [tone, setTone] = useState<ToneType>('professional');
  const [keyGuidelines, setKeyGuidelines] = useState(DEFAULT_GUIDELINES);

  // Step 1 Basics State
  const [agentName, setAgentName] = useState('ABC Academy Assistant');
  const [agentDescription, setAgentDescription] = useState(
    'Handles course inquiries, pricing, and enrollment conversations.'
  );
  const [defaultLanguage, setDefaultLanguage] = useState('English');
  const [additionalLanguages, setAdditionalLanguages] = useState(['Hindi']);

  // Step 3 Knowledge State
  const [connectedSources, setConnectedSources] = useState<ConnectedSource[]>([
    { id: 'src-1', type: 'website', name: 'https://abcacademy.com', details: 'Synced just now' },
    { id: 'src-2', type: 'documents', name: 'Course_Brochure_2026.pdf', details: 'Synced just now' },
  ]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [tempInput, setTempInput] = useState('');

  // Step 4 Behavior & Settings State
  const [responseStyle, setResponseStyle] = useState('Balanced');
  const [responseDelay, setResponseDelay] = useState('Instant');
  const [maxResponseLength, setMaxResponseLength] = useState('Medium (Default)');
  const [autoReply, setAutoReply] = useState(true);
  const [useKnowledgeOnly, setUseKnowledgeOnly] = useState(true);
  const [escalateToHuman, setEscalateToHuman] = useState(false);
  const [workingHours, setWorkingHours] = useState<'24/7' | 'specific'>('24/7');
  const [behaviorLanguage, setBehaviorLanguage] = useState('English');

  // Preview Chat States
  const [chatMessagesStep2, setChatMessagesStep2] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES_STEP2);
  const [chatMessagesStep3, setChatMessagesStep3] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES_STEP3);
  const [chatMessagesStep4, setChatMessagesStep4] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES_STEP4);
  const [chatMessagesStep5, setChatMessagesStep5] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES_STEP5);

  const [isReplying, setIsReplying] = useState(false);
  const [step4Input, setStep4Input] = useState('');
  const [step5Input, setStep5Input] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Handle example question click (Step 2)
  const handleAskQuestion = (question: string) => {
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: question,
      time: '10:25 AM',
    };
    setChatMessagesStep2((prev) => [...prev, userMsg]);
    setIsReplying(true);

    setTimeout(() => {
      const replyText =
        PREVIEW_ANSWERS[question] ||
        `Thanks for asking! As an AI assistant for ABC Academy, I can help you with this. Would you like our admissions advisor to contact you directly?`;

      const agentMsg: ChatMessage = {
        id: `agt-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        time: '10:25 AM',
      };
      setChatMessagesStep2((prev) => [...prev, agentMsg]);
      setIsReplying(false);
    }, 600);
  };

  // Step 4 live send message
  const handleSendStep4Message = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step4Input.trim()) return;
    const query = step4Input.trim();
    setStep4Input('');

    const userMsg: ChatMessage = {
      id: `usr-s4-${Date.now()}`,
      sender: 'user',
      text: query,
      time: '10:25 AM',
    };
    setChatMessagesStep4((prev) => [...prev, userMsg]);
    setIsReplying(true);

    setTimeout(() => {
      const replyText =
        PREVIEW_ANSWERS[query] ||
        `Thanks for your message! Our AI responds according to your configured ${responseStyle.toLowerCase()} style and ${responseDelay.toLowerCase()} delay settings.`;

      const agentMsg: ChatMessage = {
        id: `agt-s4-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        time: '10:25 AM',
      };
      setChatMessagesStep4((prev) => [...prev, agentMsg]);
      setIsReplying(false);
    }, responseDelay === 'Instant' ? 400 : 1200);
  };

  // Step 5 live send message
  const handleSendStep5Message = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step5Input.trim()) return;
    const query = step5Input.trim();
    setStep5Input('');

    const userMsg: ChatMessage = {
      id: `usr-s5-${Date.now()}`,
      sender: 'user',
      text: query,
      time: '10:26 AM',
    };
    setChatMessagesStep5((prev) => [...prev, userMsg]);
    setIsReplying(true);

    setTimeout(() => {
      const replyText =
        PREVIEW_ANSWERS[query] ||
        `Thanks for reaching out to ABC Academy! As your AI assistant, I can confirm that your application or inquiry has been noted. Would you like more details?`;

      const agentMsg: ChatMessage = {
        id: `agt-s5-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        time: '10:26 AM',
      };
      setChatMessagesStep5((prev) => [...prev, agentMsg]);
      setIsReplying(false);
    }, 500);
  };

  // Reset chat
  const handleResetChat = () => {
    setChatMessagesStep2(INITIAL_CHAT_MESSAGES_STEP2);
    setChatMessagesStep3(INITIAL_CHAT_MESSAGES_STEP3);
    setChatMessagesStep4(INITIAL_CHAT_MESSAGES_STEP4);
    setChatMessagesStep5(INITIAL_CHAT_MESSAGES_STEP5);
    setIsReplying(false);
  };

  // Add source helper
  const handleAddSource = (type: ConnectedSource['type'], defaultName: string) => {
    const newSource: ConnectedSource = {
      id: `src-${Date.now()}`,
      type,
      name: tempInput.trim() || defaultName,
      details: 'Synced just now',
    };
    setConnectedSources((prev) => [...prev, newSource]);
    setActiveModal(null);
    setTempInput('');
  };

  // Publish agent handler
  const handlePublish = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
    }, 800);
  };

  // Stepper navigation
  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      handlePublish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    } else {
      router.push('/ai-agents');
    }
  };

  const RoleIcon = selectedRole.icon;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
      <div className="max-w-[1340px] mx-auto px-6 py-6 space-y-6">
        {/* ── Top Header Section ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Back link */}
          <Link
            href="/ai-agents"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to AI Agents
          </Link>

          <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-4">
            <div>
              <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">
                Create AI Agent
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Set up a new AI agent to handle your WhatsApp conversations.
              </p>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0">
              {STEPS.map((stepItem, idx) => {
                const isCompleted = stepItem.id < currentStep;
                const isActive = stepItem.id === currentStep;

                return (
                  <div key={stepItem.id} className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(stepItem.id as Step)}
                      className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
                    >
                      {/* Step Circle */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                          isCompleted
                            ? 'bg-[#10b981] text-white shadow-xs'
                            : isActive
                            ? 'bg-[#1b59f8] text-white shadow-sm shadow-blue-500/25'
                            : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : stepItem.id}
                      </div>

                      {/* Labels */}
                      <div className="min-w-0 pr-1">
                        <p
                          className={`text-xs font-bold leading-tight whitespace-nowrap ${
                            isActive
                              ? 'text-[#1b59f8]'
                              : isCompleted
                              ? 'text-gray-900'
                              : 'text-gray-900 group-hover:text-gray-700'
                          }`}
                        >
                          {stepItem.label}
                        </p>
                        <p
                          className={`text-[11px] leading-tight mt-0.5 whitespace-nowrap ${
                            isActive ? 'text-[#1b59f8] font-medium' : 'text-gray-400'
                          }`}
                        >
                          {stepItem.sublabel}
                        </p>
                      </div>
                    </button>

                    {/* Connecting line */}
                    {idx < STEPS.length - 1 && (
                      <div className="w-5 lg:w-7 h-[1px] bg-gray-200 mx-2 lg:mx-2.5 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Main Two-Column Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* Left Column: Form Cards                                              */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 sm:p-7 space-y-6">
            {/* ── STEP 5: Test & Publish (Matches Mockup) ─────────────────────── */}
            {currentStep === 5 && (
              <>
                {/* Header with Purple Flask Icon */}
                <div className="flex items-start gap-3.5 pb-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-100">
                    <FlaskConical className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Test & Publish
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Try your agent, review the configuration, and publish it when you&apos;re ready.
                    </p>
                  </div>
                </div>

                {/* Section 1: 1. Test Your Agent */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1b59f8] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Send className="w-4 h-4 text-[#1b59f8]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">1. Test Your Agent</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Send a message to see how your agent responds using the configured instructions and knowledge.
                      </p>
                    </div>
                  </div>

                  {/* Soft Blue Notice */}
                  <div className="bg-[#f0f6ff] border border-blue-100 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-blue-900/80">
                    <Info className="w-4 h-4 text-[#1b59f8] flex-shrink-0" />
                    <span>This test uses your current configuration and knowledge sources.</span>
                  </div>
                </div>

                {/* Section 2: 2. Configuration Summary */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1b59f8] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4 text-[#1b59f8]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">2. Configuration Summary</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Review your settings before publishing.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-blue-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-blue-600" />
                      Edit
                    </button>
                  </div>

                  {/* Clean Summary Table */}
                  <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white text-xs sm:text-sm divide-y divide-gray-100 shadow-2xs">
                    {/* Agent Name */}
                    <div className="flex items-center px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0">
                        Agent Name
                      </span>
                      <span className="text-gray-600 font-medium">{agentName}</span>
                    </div>

                    {/* Role */}
                    <div className="flex items-center px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0">
                        Role
                      </span>
                      <span className="text-gray-600 font-medium">{selectedRole.title}</span>
                    </div>

                    {/* Instructions */}
                    <div className="flex items-start px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0 mt-0.5">
                        Instructions
                      </span>
                      <span className="text-gray-600 font-medium leading-relaxed">
                        Help students with course information, fees, admission, and schedules. Be polite and professional.
                      </span>
                    </div>

                    {/* Knowledge Sources */}
                    <div className="flex items-center px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0">
                        Knowledge Sources
                      </span>
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <Database className="w-4 h-4 text-blue-600" />
                        <span>2 sources connected</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-blue-600 hover:underline font-semibold ml-auto text-xs cursor-pointer"
                      >
                        View
                      </button>
                    </div>

                    {/* Response Style */}
                    <div className="flex items-center px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0">
                        Response Style
                      </span>
                      <span className="text-gray-600 font-medium">{responseStyle}</span>
                    </div>

                    {/* Auto-reply */}
                    <div className="flex items-center px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0">
                        Auto-reply
                      </span>
                      <span className="text-gray-600 font-medium">{autoReply ? 'Enabled' : 'Disabled'}</span>
                    </div>

                    {/* Human Escalation */}
                    <div className="flex items-center px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0">
                        Human Escalation
                      </span>
                      <span className="text-gray-600 font-medium">{escalateToHuman ? 'Enabled' : 'Disabled'}</span>
                    </div>

                    {/* Working Hours */}
                    <div className="flex items-center px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0">
                        Working Hours
                      </span>
                      <span className="text-gray-600 font-medium">
                        {workingHours === '24/7' ? 'Always available (24/7)' : 'Specific hours'}
                      </span>
                    </div>

                    {/* Language */}
                    <div className="flex items-center px-4 py-3">
                      <span className="w-40 sm:w-44 font-semibold text-gray-800 flex-shrink-0">
                        Language
                      </span>
                      <span className="text-gray-600 font-medium">{behaviorLanguage}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation */}
                <div className="pt-4 flex items-center justify-between gap-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-[#1b59f8] rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#1b59f8]" />
                    Previous
                  </button>

                  <div className="flex flex-col items-end">
                    <button
                      type="button"
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="flex items-center gap-2 px-6 py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer disabled:opacity-70"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Publish Agent
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-gray-400 mt-1">
                      You can always edit these settings later.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 4: Behavior & Settings ─────────────────────────────────── */}
            {currentStep === 4 && (
              <>
                <div className="flex items-start gap-3.5 pb-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-100">
                    <Settings className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Behavior & Settings
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Configure how your AI agent should respond and handle conversations.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#1b59f8]" />
                    <h3 className="text-sm font-bold text-gray-900">Response Behavior</h3>
                  </div>

                  <div className="space-y-3.5 pl-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800">
                          Response style
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Control how detailed the AI responses should be.
                        </p>
                      </div>
                      <div className="relative min-w-[190px]">
                        <select
                          value={responseStyle}
                          onChange={(e) => setResponseStyle(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer appearance-none pr-8"
                        >
                          <option value="Balanced">Balanced</option>
                          <option value="Precise">Precise</option>
                          <option value="Detailed">Detailed</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800">
                          Response delay
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Add a small delay to make responses feel natural.
                        </p>
                      </div>
                      <div className="relative min-w-[190px]">
                        <select
                          value={responseDelay}
                          onChange={(e) => setResponseDelay(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer appearance-none pr-8"
                        >
                          <option value="Instant">Instant</option>
                          <option value="1-2 seconds">1-2 seconds</option>
                          <option value="3-5 seconds">3-5 seconds</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800">
                          Maximum response length
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Limit the length of AI responses.
                        </p>
                      </div>
                      <div className="relative min-w-[190px]">
                        <select
                          value={maxResponseLength}
                          onChange={(e) => setMaxResponseLength(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer appearance-none pr-8"
                        >
                          <option value="Short">Short</option>
                          <option value="Medium (Default)">Medium (Default)</option>
                          <option value="Long">Long</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#1b59f8]" />
                    <h3 className="text-sm font-bold text-gray-900">Conversation Settings</h3>
                  </div>

                  <div className="space-y-3.5 pl-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800">
                          Auto-reply to new messages
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Automatically respond to incoming WhatsApp messages.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoReply(!autoReply)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-shrink-0 ${
                          autoReply ? 'bg-[#1b59f8]' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            autoReply ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800">
                          Use knowledge base only
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Only answer from the provided knowledge sources.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseKnowledgeOnly(!useKnowledgeOnly)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-shrink-0 ${
                          useKnowledgeOnly ? 'bg-[#1b59f8]' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            useKnowledgeOnly ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-gray-800">
                          Escalate to human agent
                        </p>
                        <p className="text-[11px] text-gray-400">
                          Transfer to a human when the AI is unsure or requested.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEscalateToHuman(!escalateToHuman)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer flex-shrink-0 ${
                          escalateToHuman ? 'bg-[#1b59f8]' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            escalateToHuman ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#1b59f8]" />
                    <h3 className="text-sm font-bold text-gray-900">Availability</h3>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pl-6">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800">Working hours</p>
                      <p className="text-[11px] text-gray-400">
                        Set when the AI agent should respond.
                      </p>
                    </div>

                    <div className="space-y-2.5 min-w-[200px]">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-gray-800">
                        <input
                          type="radio"
                          name="workingHours"
                          checked={workingHours === '24/7'}
                          onChange={() => setWorkingHours('24/7')}
                          className="w-4 h-4 text-[#1b59f8] accent-[#1b59f8]"
                        />
                        Always available (24/7)
                      </label>

                      <div>
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-gray-800">
                          <input
                            type="radio"
                            name="workingHours"
                            checked={workingHours === 'specific'}
                            onChange={() => setWorkingHours('specific')}
                            className="w-4 h-4 text-[#1b59f8] accent-[#1b59f8]"
                          />
                          Specific hours
                        </label>
                        <p className="text-[11px] text-gray-400 pl-6 mt-0.5">
                          Set custom working hours.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#1b59f8]" />
                    <h3 className="text-sm font-bold text-gray-900">Language</h3>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pl-6">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-gray-800">Default language</p>
                      <p className="text-[11px] text-gray-400">Language for AI responses.</p>
                    </div>
                    <div className="relative min-w-[190px]">
                      <select
                        value={behaviorLanguage}
                        onChange={(e) => setBehaviorLanguage(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer appearance-none pr-8"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Arabic">Arabic</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-[#1b59f8] rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#1b59f8]" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Knowledge Base ──────────────────────────────────────── */}
            {currentStep === 3 && (
              <>
                <div className="flex items-start gap-3.5 pb-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-100">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Knowledge Base
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Connect data sources to help your AI agent give accurate and relevant answers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between bg-white hover:border-blue-200 transition-all shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                        <Globe className="w-5 h-5 text-[#1b59f8]" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">Website</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Add your website URL to sync content automatically.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveModal('website')}
                        className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 hover:text-blue-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        + Add Website
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between bg-white hover:border-red-200 transition-all shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <FileText className="w-5 h-5 text-red-500" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">Documents</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Upload PDFs, DOCX, or TXT files with your information.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveModal('documents')}
                        className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 hover:text-blue-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        + Upload Files
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between bg-white hover:border-orange-200 transition-all shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center mb-3">
                        <HelpCircle className="w-5 h-5 text-orange-500" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">FAQs</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Add common questions and answers.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveModal('faqs')}
                        className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 hover:text-blue-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        + Add FAQs
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between bg-white hover:border-purple-200 transition-all shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                        <AlignLeft className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">Text Content</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Add custom text, policies, or important information.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveModal('text')}
                        className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 hover:text-blue-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        + Add Text
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between bg-white hover:border-red-200 transition-all shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center mb-3">
                        <YouTubeIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">YouTube / Video</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Add YouTube links to learn from your video content.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveModal('youtube')}
                        className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 hover:text-blue-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        + Add YouTube
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200/80 rounded-2xl p-4 flex flex-col justify-between bg-white hover:border-emerald-200 transition-all shadow-2xs">
                    <div>
                      <div className="w-9 h-9 rounded-full bg-emerald-50/80 flex items-center justify-center mb-3">
                        <GoogleDriveIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">Google Drive</h3>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Connect your Google Drive to access files.
                      </p>
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setActiveModal('drive')}
                        className="w-full py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 hover:text-blue-700 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        Connect Drive
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Connected Sources ({connectedSources.length})
                  </h3>

                  {connectedSources.length === 0 ? (
                    <div className="border border-gray-200/60 rounded-2xl py-12 px-6 text-center bg-[#fafbfc]">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-400">
                        <BookOpen className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">No data sources added yet</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                        Add at least one data source to help your AI agent provide accurate answers based on your business information.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {connectedSources.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3.5 bg-gray-50/80 border border-gray-200 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1b59f8] flex items-center justify-center font-bold text-xs">
                              {item.type[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-gray-900">{item.name}</p>
                              <p className="text-[11px] text-gray-400">{item.details}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setConnectedSources((prev) => prev.filter((s) => s.id !== item.id))
                            }
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between gap-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-[#1b59f8] rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#1b59f8]" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: Instructions & Role ─────────────────────────────────── */}
            {currentStep === 2 && (
              <>
                <div className="flex items-start gap-3.5 pb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-100">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Instructions & Role
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Define how your AI agent should behave, its role, and communication style.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-gray-800">
                    System Instructions <span className="text-gray-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={systemInstructions}
                    onChange={(e) => setSystemInstructions(e.target.value)}
                    maxLength={1000}
                    className="w-full px-4 py-3 text-xs sm:text-sm text-gray-800 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder-gray-400 leading-relaxed transition-all resize-y"
                    placeholder="Enter instructions for your AI agent..."
                  />
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-0.5">
                    <span>These instructions will guide your AI agent&apos;s behavior.</span>
                    <span className="font-medium text-gray-500">
                      {systemInstructions === DEFAULT_INSTRUCTIONS ? '215' : systemInstructions.length}/1000
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-gray-800">
                    Agent Role
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className="w-full border border-gray-200 rounded-xl p-3.5 flex items-center justify-between cursor-pointer hover:border-gray-300 transition-all bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-[#1b59f8] flex items-center justify-center flex-shrink-0">
                          <RoleIcon className="w-5 h-5 text-gray-800" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">
                            {selectedRole.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {selectedRole.description}
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                          roleDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {roleDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden py-1">
                        {ROLES.map((role) => {
                          const IconComp = role.icon;
                          const isSelected = role.id === selectedRole.id;
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => {
                                setSelectedRole(role);
                                setRoleDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50/60 ${
                                isSelected ? 'bg-blue-50 text-[#1b59f8]' : 'text-gray-800'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                    ? 'bg-[#1b59f8] text-white'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <IconComp className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-bold leading-tight">
                                  {role.title}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                  {role.description}
                                </p>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#1b59f8]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-gray-800">
                    Tone of Voice
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setTone('professional')}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        tone === 'professional'
                          ? 'border-[#1b59f8] bg-[#f0f5ff]'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tone === 'professional' ? 'bg-blue-100/70 text-[#1b59f8]' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <TieIcon className="w-4 h-4 text-[#1b59f8]" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs sm:text-sm font-bold leading-tight ${
                            tone === 'professional' ? 'text-[#1b59f8]' : 'text-gray-900'
                          }`}
                        >
                          Professional
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Formal and helpful</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTone('friendly')}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        tone === 'friendly'
                          ? 'border-[#10b981] bg-emerald-50/50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tone === 'friendly' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Smile className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs sm:text-sm font-bold leading-tight ${
                            tone === 'friendly' ? 'text-emerald-700' : 'text-gray-900'
                          }`}
                        >
                          Friendly
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Warm and conversational</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTone('casual')}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        tone === 'casual'
                          ? 'border-purple-500 bg-purple-50/50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          tone === 'casual' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs sm:text-sm font-bold leading-tight ${
                            tone === 'casual' ? 'text-purple-700' : 'text-gray-900'
                          }`}
                        >
                          Casual
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Relaxed and informal</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm font-bold text-gray-800">
                    Key Guidelines (Optional)
                  </label>
                  <textarea
                    rows={5}
                    value={keyGuidelines}
                    onChange={(e) => setKeyGuidelines(e.target.value)}
                    className="w-full px-4 py-3 text-xs sm:text-sm text-gray-800 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder-gray-400 leading-relaxed transition-all resize-y"
                    placeholder="Enter bullet point guidelines for edge cases and topics to avoid..."
                  />
                </div>

                <div className="pt-4 flex items-center justify-between gap-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-[#1b59f8] rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#1b59f8]" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 1: Basics ──────────────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-start gap-3.5 pb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                    <Bot className="w-5 h-5 text-[#1b59f8]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Basic Information
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Name your agent and define languages for customer communication.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1.5">
                    Agent Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="e.g. Sales Assistant"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Describe what this agent does..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1.5">
                      Default Language
                    </label>
                    <select
                      value={defaultLanguage}
                      onChange={(e) => setDefaultLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-800 mb-1.5">
                      Additional Languages
                    </label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {additionalLanguages.map((lang) => (
                        <span
                          key={lang}
                          className="px-2.5 py-1 bg-blue-50 text-[#1b59f8] rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        >
                          {lang}
                          <button
                            type="button"
                            onClick={() =>
                              setAdditionalLanguages(
                                additionalLanguages.filter((l) => l !== lang)
                              )
                            }
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const remaining = ['Tamil', 'Telugu', 'Bengali', 'Marathi'].find(
                            (l) => !additionalLanguages.includes(l)
                          );
                          if (remaining)
                            setAdditionalLanguages([...additionalLanguages, remaining]);
                        }}
                        className="px-2.5 py-1 border border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-600 hover:border-blue-400 hover:text-[#1b59f8]"
                      >
                        + Add Language
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-[#1b59f8] rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#1b59f8]" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* Right Column: Preview Panel (Switches per Step)                      */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-5">
            {/* ── STEP 5 RIGHT PANEL: Chat Test (Matches Mockup) ─────────────── */}
            {currentStep === 5 ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 sm:p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#10b981] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <MessageCircle className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        Chat Test
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Try a few questions to see how your agent responds.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                {/* WhatsApp Chat Simulation (4 preloaded messages) */}
                <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-4 sm:p-5 space-y-3.5 min-h-[300px]">
                  {chatMessagesStep5.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isUser ? 'justify-end' : 'items-start gap-2.5'}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-[#1b59f8] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line shadow-sm ${
                            isUser
                              ? 'bg-[#e9edf5] text-gray-800 rounded-tr-sm'
                              : 'bg-white text-gray-800 border border-gray-100/90 rounded-tl-sm'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <div
                            className={`flex items-center gap-1 mt-1 text-[10px] ${
                              isUser ? 'justify-end text-gray-400' : 'justify-end text-gray-400'
                            }`}
                          >
                            <span>{msg.time}</span>
                            {isUser && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isReplying && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 italic pl-9">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1b59f8]" />
                      <span>Agent is typing...</span>
                    </div>
                  )}
                </div>

                {/* Live Message Input Box */}
                <form onSubmit={handleSendStep5Message} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={step5Input}
                    onChange={(e) => setStep5Input(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 bg-[#1b59f8] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-xs flex-shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : currentStep === 4 ? (
              /* ── STEP 4 RIGHT PANEL: Test Your Agent ───────────────────────── */
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1b59f8] flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        Test Your Agent
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Try a sample message to see how it responds.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-4 sm:p-5 space-y-3.5 min-h-[220px]">
                  {chatMessagesStep4.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isUser ? 'justify-end' : 'items-start gap-2.5'}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-[#1b59f8] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line shadow-sm ${
                            isUser
                              ? 'bg-[#e9edf5] text-gray-800 rounded-tr-sm'
                              : 'bg-white text-gray-800 border border-gray-100/90 rounded-tl-sm'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <div
                            className={`flex items-center gap-1 mt-1 text-[10px] ${
                              isUser ? 'justify-end text-gray-400' : 'justify-end text-gray-400'
                            }`}
                          >
                            <span>{msg.time}</span>
                            {isUser && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isReplying && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 italic pl-9">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1b59f8]" />
                      <span>Agent is typing...</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendStep4Message} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={step4Input}
                    onChange={(e) => setStep4Input(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 bg-[#1b59f8] hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-xs flex-shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="bg-[#f0f6ff] border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900/80 leading-relaxed">
                  <Info className="w-4 h-4 text-[#1b59f8] flex-shrink-0 mt-0.5" />
                  <span>
                    This is just a preview. The actual response may vary based on your instructions,
                    knowledge base, and settings.
                  </span>
                </div>
              </div>
            ) : currentStep === 3 ? (
              /* ── STEP 3 RIGHT PANEL: Tips + Knowledge Preview ─────────────── */
              <>
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#1b59f8]" />
                    <h3 className="text-sm font-bold text-gray-900">Tips for better results</h3>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      'Add your website to keep information up to date.',
                      'Upload course brochures, fee structure, and policies.',
                      'Include common FAQs.',
                      'Keep your content relevant and well organized.',
                    ].map((tip, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <p className="text-xs text-gray-600 leading-snug">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1b59f8] flex items-center justify-center flex-shrink-0">
                      <Search className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        Knowledge Preview
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        See a preview of how your knowledge will be used.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-4 space-y-3 min-h-[190px]">
                    {chatMessagesStep3.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? 'justify-end' : 'items-start gap-2.5'}`}
                        >
                          {!isUser && (
                            <div className="w-7 h-7 rounded-full bg-[#1b59f8] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}

                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line shadow-sm ${
                              isUser
                                ? 'bg-[#e9edf5] text-gray-800 rounded-tr-sm'
                                : 'bg-white text-gray-800 border border-gray-100/90 rounded-tl-sm'
                            }`}
                          >
                            <p>{msg.text}</p>
                            <div
                              className={`flex items-center gap-1 mt-1 text-[10px] ${
                                isUser ? 'justify-end text-gray-400' : 'justify-end text-gray-400'
                              }`}
                            >
                              <span>{msg.time}</span>
                              {isUser && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-[#f0f6ff] border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900/80 leading-relaxed">
                    <Info className="w-4 h-4 text-[#1b59f8] flex-shrink-0 mt-0.5" />
                    <span>
                      This is just a preview. The actual response may vary based on your knowledge base
                      and settings.
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* ── STEP 2 / GENERAL RIGHT PANEL: Live AI Agent Preview ───────── */
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1b59f8] flex items-center justify-center flex-shrink-0">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        AI Agent Preview
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        See how your agent might respond.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-4 sm:p-5 space-y-3.5 min-h-[200px]">
                  {chatMessagesStep2.map((msg) => {
                    const isUser = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isUser ? 'justify-end' : 'items-start gap-2.5'}`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-[#1b59f8] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                            <Bot className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line shadow-sm ${
                            isUser
                              ? 'bg-[#e9edf5] text-gray-800 rounded-tr-sm'
                              : 'bg-white text-gray-800 border border-gray-100/90 rounded-tl-sm'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <div
                            className={`flex items-center gap-1 mt-1 text-[10px] ${
                              isUser ? 'justify-end text-gray-400' : 'justify-end text-gray-400'
                            }`}
                          >
                            <span>{msg.time}</span>
                            {isUser && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isReplying && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 italic pl-9">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1b59f8]" />
                      <span>Agent is typing...</span>
                    </div>
                  )}
                </div>

                <div className="bg-[#f0f6ff] border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900/80 leading-relaxed">
                  <Info className="w-4 h-4 text-[#1b59f8] flex-shrink-0 mt-0.5" />
                  <span>
                    This is just a preview. The actual response may vary based on your knowledge base
                    and settings.
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-bold text-gray-900">Example Questions</h4>
                  </div>

                  <div className="space-y-2">
                    {[
                      'What are the course fees?',
                      'How can I get admission?',
                      'Do you offer online classes?',
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleAskQuestion(q)}
                        className="w-full bg-white border border-gray-200/80 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl px-4 py-3 flex items-center justify-between text-xs sm:text-[13px] font-medium text-gray-800 transition-all cursor-pointer shadow-xs text-left group"
                      >
                        <span className="group-hover:text-[#1b59f8] transition-colors">{q}</span>
                        <ChevronRight className="w-4 h-4 text-blue-500 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Data Source Modal ────────────────────────────────────────────── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 capitalize">
                Add {activeModal === 'drive' ? 'Google Drive' : activeModal} Source
              </h3>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setTempInput('');
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                {activeModal === 'website'
                  ? 'Website URL'
                  : activeModal === 'youtube'
                  ? 'YouTube Link'
                  : activeModal === 'documents'
                  ? 'Document Name / File'
                  : activeModal === 'drive'
                  ? 'Google Drive Folder Name'
                  : 'Title / Content'}
              </label>
              <input
                type="text"
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                placeholder={
                  activeModal === 'website'
                    ? 'https://abcacademy.com/courses'
                    : activeModal === 'youtube'
                    ? 'https://youtube.com/watch?v=...'
                    : activeModal === 'drive'
                    ? 'Admissions & Syllabus 2026'
                    : 'Enter title or text...'
                }
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setTempInput('');
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const type = activeModal as ConnectedSource['type'];
                  const defaultName =
                    type === 'website'
                      ? 'https://abcacademy.com'
                      : type === 'documents'
                      ? 'Course_Catalog_2026.pdf'
                      : type === 'faqs'
                      ? 'Admissions FAQs'
                      : type === 'youtube'
                      ? 'ABC Academy Intro Video'
                      : type === 'drive'
                      ? 'Google Drive / Academic Docs'
                      : 'Custom Policies';
                  handleAddSource(type, defaultName);
                }}
                className="px-4 py-2 text-xs font-semibold bg-[#1b59f8] hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Add Source
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Publish Success Modal ───────────────────────────────────────────── */}
      {publishSuccess && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 text-center shadow-2xl space-y-5 border border-gray-100">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#10b981] flex items-center justify-center mx-auto shadow-sm">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900">Agent Published! 🎉</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1.5 leading-relaxed">
                <strong>{agentName}</strong> is now live and actively responding to student inquiries on WhatsApp.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2 text-xs border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Connected Phone:</span>
                <span className="font-semibold text-gray-800">+91 98765 43210</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Response Delay:</span>
                <span className="font-semibold text-gray-800">{responseDelay}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/ai-agents')}
                className="flex-1 py-2.5 bg-[#1b59f8] hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm shadow-blue-500/25 cursor-pointer"
              >
                Go to AI Agents
              </button>
              <button
                type="button"
                onClick={() => setPublishSuccess(false)}
                className="py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
