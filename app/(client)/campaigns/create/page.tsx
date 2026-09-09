'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Send,
  Receipt,
  Bell,
  RotateCcw,
  ChevronDown,
  Bot,
  Lightbulb,
  Target,
  Clock,
  BarChart2,
  CheckCircle2,
  MessageSquare,
  Users,
  Calendar,
  Sparkles,
  Check,
  BookOpen,
  Eye,
  Video,
  Phone,
  MoreVertical,
  Smile,
  Bold,
  Italic,
  Link2,
  Image as ImageIcon,
  Code,
  RefreshCw,
  FlaskConical,
  X,
  Copy,
  Search,
  Filter,
  ArrowUpDown,
  GraduationCap,
  UserCheck,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Settings2,
  Info,
  Pencil,
  Rocket,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type CampaignType = 'Promotional' | 'Transactional' | 'Reminder' | 'Follow Up';
type Step = 1 | 2 | 3 | 4 | 5;
type TemplateTab = 'choose' | 'create' | 'ai';
type AudienceTab = 'contacts' | 'segments' | 'import' | 'manual';

interface FormState {
  name: string;
  type: CampaignType;
  description: string;
  aiAgent: string;
  // Step 2
  templateCategory: string;
  templateName: string;
  messageContent: string;
  selectedSampleContact: string;
  // Step 3
  audience: string;
  // Step 4
  scheduledDate: string;
  scheduledTime: string;
}

interface AudienceContact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
  phone: string;
  segment: 'Student' | 'Enquiry' | 'Parent';
  tag: string;
  status: 'Active' | 'Inactive';
  lastActivity: string;
  interest: 'Data Science' | 'Python' | 'Webinar' | 'Machine Learning';
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Basic Details', sublabel: 'Name, type, audience' },
  { id: 2, label: 'Message', sublabel: 'Create your message' },
  { id: 3, label: 'Audience', sublabel: 'Select contacts' },
  { id: 4, label: 'Schedule', sublabel: 'Set timing' },
  { id: 5, label: 'Review & Launch', sublabel: 'Confirm and send' },
] as const;

const CAMPAIGN_TYPES: {
  id: CampaignType;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}[] = [
  {
    id: 'Promotional',
    label: 'Promotional',
    description: 'Promote courses, offers, etc.',
    icon: Send,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    id: 'Transactional',
    label: 'Transactional',
    description: 'Send important updates',
    icon: Receipt,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    id: 'Reminder',
    label: 'Reminder',
    description: 'Remind about pending actions',
    icon: Bell,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
  {
    id: 'Follow Up',
    label: 'Follow Up',
    description: 'Nurture leads and re-engage',
    icon: RotateCcw,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
];

const AI_AGENTS = [
  'Sales Assistant',
  'Customer Support Agent',
  'Lead Qualification Agent',
  'Admissions Agent',
];

const TEMPLATE_CATEGORIES = ['Education', 'Marketing', 'Utility', 'Sales & Promotions'];

const TEMPLATES: Record<string, { name: string; category: string; status: string; content: string; variables: string[] }[]> = {
  Education: [
    {
      name: 'course_promotion',
      category: 'Education',
      status: 'Approved',
      content: `Hi {{name}}! 👋

Kickstart your career with our {{course_name}} course at {{institute_name}}.

✅ Live online classes
✅ Hands-on projects
✅ Certification
✅ Placement support

Special offer: {{offer}}

Reply YES to know more or book a free demo!`,
      variables: ['name', 'course_name', 'institute_name', 'offer'],
    },
    {
      name: 'webinar_invitation',
      category: 'Education',
      status: 'Approved',
      content: `Hi {{name}}! 🎓

You're invited to our exclusive masterclass on {{course_name}} hosted by {{institute_name}}.

📅 Date: This Saturday, 6 PM IST
🎟️ Limited seats available!

Special offer: {{offer}}

Reply YES to reserve your free VIP pass now!`,
      variables: ['name', 'course_name', 'institute_name', 'offer'],
    },
    {
      name: 'fee_reminder',
      category: 'Education',
      status: 'Approved',
      content: `Hi {{name}},

This is a gentle reminder that the installment for {{course_name}} at {{institute_name}} is due soon.

Special offer: {{offer}}

Reply to this message if you have any questions.`,
      variables: ['name', 'course_name', 'institute_name', 'offer'],
    },
  ],
  Marketing: [
    {
      name: 'flash_sale_announcement',
      category: 'Marketing',
      status: 'Approved',
      content: `Hey {{name}}! 🔥

Big news! Our {{course_name}} enrollment just opened at {{institute_name}}.

Special offer: {{offer}}

Reply YES to claim your instant discount code!`,
      variables: ['name', 'course_name', 'institute_name', 'offer'],
    },
  ],
  Utility: [
    {
      name: 'account_verification',
      category: 'Utility',
      status: 'Approved',
      content: `Hello {{name}},

Your verification code for {{institute_name}} is 894-201. Please enter this code to confirm your {{course_name}} enrollment.`,
      variables: ['name', 'course_name', 'institute_name'],
    },
  ],
  'Sales & Promotions': [
    {
      name: 'lead_reengagement',
      category: 'Sales & Promotions',
      status: 'Approved',
      content: `Hi {{name}},

We noticed you were interested in {{course_name}} at {{institute_name}}!

Good news — we have an exclusive deal for you today:
Special offer: {{offer}}

Reply YES to speak with our admissions advisor.`,
      variables: ['name', 'course_name', 'institute_name', 'offer'],
    },
  ],
};

const SAMPLE_CONTACTS: Record<string, { name: string; course_name: string; institute_name: string; offer: string }> = {
  'Rahul Sharma': {
    name: 'Rahul',
    course_name: 'Data Science',
    institute_name: 'ABC Academy',
    offer: '30% off for early enrollments!',
  },
  'Priya Patel': {
    name: 'Priya',
    course_name: 'Full Stack Web Development',
    institute_name: 'ABC Academy',
    offer: 'Flat ₹5,000 scholarship today!',
  },
  'Amit Verma': {
    name: 'Amit',
    course_name: 'AI & Machine Learning Bootcamp',
    institute_name: 'ABC Academy',
    offer: 'Free Python certification included!',
  },
  'Sneha Roy': {
    name: 'Sneha',
    course_name: 'Digital Marketing & Growth',
    institute_name: 'ABC Academy',
    offer: 'Buy 1 course get 1 masterclass free!',
  },
};

const AVAILABLE_VARIABLES = [
  { tag: '{{name}}', label: 'First Name', example: 'Rahul' },
  { tag: '{{course_name}}', label: 'Course Name', example: 'Data Science' },
  { tag: '{{institute_name}}', label: 'Academy Name', example: 'ABC Academy' },
  { tag: '{{offer}}', label: 'Offer Text', example: '30% off for early enrollments!' },
  { tag: '{{phone}}', label: 'Phone Number', example: '+91 98765 43210' },
  { tag: '{{date}}', label: 'Event Date', example: 'Sept 15, 2026' },
];

const AUDIENCE_CONTACTS: AudienceContact[] = [
  {
    id: 'c1',
    name: 'Rahul Sharma',
    initials: 'RS',
    avatarBg: 'bg-blue-100',
    avatarText: 'text-blue-700',
    phone: '+91 98765 43210',
    segment: 'Student',
    tag: 'Data Science',
    status: 'Active',
    lastActivity: '2 days ago',
    interest: 'Data Science',
  },
  {
    id: 'c2',
    name: 'Anjali Patel',
    initials: 'AP',
    avatarBg: 'bg-blue-100',
    avatarText: 'text-blue-700',
    phone: '+91 91234 56789',
    segment: 'Student',
    tag: 'Webinar',
    status: 'Active',
    lastActivity: '1 day ago',
    interest: 'Data Science',
  },
  {
    id: 'c3',
    name: 'Vikram Khan',
    initials: 'VK',
    avatarBg: 'bg-purple-100',
    avatarText: 'text-purple-700',
    phone: '+91 99887 77665',
    segment: 'Student',
    tag: 'Python',
    status: 'Active',
    lastActivity: '3 days ago',
    interest: 'Python',
  },
  {
    id: 'c4',
    name: 'Sneha Poojari',
    initials: 'SP',
    avatarBg: 'bg-purple-100',
    avatarText: 'text-purple-700',
    phone: '+91 98712 34567',
    segment: 'Enquiry',
    tag: 'ML',
    status: 'Active',
    lastActivity: '5 hours ago',
    interest: 'Machine Learning',
  },
  {
    id: 'c5',
    name: 'Arjun Reddy',
    initials: 'AR',
    avatarBg: 'bg-blue-100',
    avatarText: 'text-blue-700',
    phone: '+91 90011 22334',
    segment: 'Student',
    tag: 'AI',
    status: 'Active',
    lastActivity: '1 day ago',
    interest: 'Python',
  },
  {
    id: 'c6',
    name: 'Priya Kulkarni',
    initials: 'PK',
    avatarBg: 'bg-amber-100',
    avatarText: 'text-amber-700',
    phone: '+91 95123 44556',
    segment: 'Parent',
    tag: 'Placement',
    status: 'Active',
    lastActivity: '4 days ago',
    interest: 'Webinar',
  },
  {
    id: 'c7',
    name: 'Neha Mehta',
    initials: 'NM',
    avatarBg: 'bg-pink-100',
    avatarText: 'text-pink-700',
    phone: '+91 87876 65543',
    segment: 'Enquiry',
    tag: 'Counselling',
    status: 'Active',
    lastActivity: '3 days ago',
    interest: 'Data Science',
  },
  {
    id: 'c8',
    name: 'Deepak Kumar',
    initials: 'DK',
    avatarBg: 'bg-blue-100',
    avatarText: 'text-blue-700',
    phone: '+91 90987 65432',
    segment: 'Student',
    tag: 'Full Stack',
    status: 'Inactive',
    lastActivity: '10 days ago',
    interest: 'Python',
  },
  {
    id: 'c9',
    name: 'Suman Mishra',
    initials: 'SM',
    avatarBg: 'bg-blue-100',
    avatarText: 'text-blue-700',
    phone: '+91 99876 54321',
    segment: 'Enquiry',
    tag: 'Webinar',
    status: 'Active',
    lastActivity: '6 hours ago',
    interest: 'Webinar',
  },
  {
    id: 'c10',
    name: 'Karan Tiwari',
    initials: 'KT',
    avatarBg: 'bg-blue-100',
    avatarText: 'text-blue-700',
    phone: '+91 97766 55443',
    segment: 'Student',
    tag: 'Data Science',
    status: 'Active',
    lastActivity: '2 days ago',
    interest: 'Data Science',
  },
];

function CreateCampaignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStepParam = searchParams.get('step');

  const [step, setStep] = useState<Step>(
    initialStepParam === '4'
      ? 4
      : initialStepParam === '3'
      ? 3
      : initialStepParam === '2'
      ? 2
      : initialStepParam === '1'
      ? 1
      : 5
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [templateTab, setTemplateTab] = useState<TemplateTab>('choose');
  const [audienceTab, setAudienceTab] = useState<AudienceTab>('contacts');
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);

  // Step 4 Schedule & Sending Settings State
  const [scheduleOption, setScheduleOption] = useState<'now' | 'later' | 'recurring'>('later');
  const [scheduleDate, setScheduleDate] = useState('15 Jan 2025');
  const [scheduleTime, setScheduleTime] = useState('10:00 AM');
  const [smartSending, setSmartSending] = useState(true);
  const [respectQuietHours, setRespectQuietHours] = useState(true);
  const [batchSending, setBatchSending] = useState(true);
  const [batchSize, setBatchSize] = useState('100 messages');
  const [batchDelay, setBatchDelay] = useState('30 seconds');
  const [stopOnError, setStopOnError] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  // Audience selection state
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(
    new Set(AUDIENCE_CONTACTS.map((c) => c.id))
  );
  const [audienceSearch, setAudienceSearch] = useState('');
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState('All Segments');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All Tags');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All Status');

  const [form, setForm] = useState<FormState>({
    name: 'Data Science Course Launch',
    type: 'Promotional',
    description: 'Send course details and special launch offer for Data Science program to interested leads.',
    aiAgent: 'Sales Assistant',
    templateCategory: 'Education',
    templateName: 'course_promotion',
    messageContent: `Hi {{name}}! 👋

Kickstart your career with our {{course_name}} course at {{institute_name}}.

✅ Live online classes
✅ Hands-on projects
✅ Certification
✅ Placement support

Special offer: {{offer}}

Reply YES to know more or book a free demo!`,
    selectedSampleContact: 'Rahul Sharma',
    audience: '10 Selected Contacts (Students, Enquiries, Parents)',
    scheduledDate: '',
    scheduledTime: '',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNext = () => {
    if (step < 5) {
      setStep((s) => (s + 1) as Step);
    } else {
      showToast('Campaign launched successfully!');
      setTimeout(() => router.push('/campaigns'), 1200);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    } else {
      router.push('/campaigns');
    }
  };

  // Step 2 handlers
  const handleCategoryChange = (category: string) => {
    update('templateCategory', category);
    const categoryTemplates = TEMPLATES[category] || [];
    if (categoryTemplates.length > 0) {
      const first = categoryTemplates[0];
      update('templateName', first.name);
      update('messageContent', first.content);
    }
  };

  const handleTemplateChange = (tmplName: string) => {
    update('templateName', tmplName);
    const categoryTemplates = TEMPLATES[form.templateCategory] || [];
    const found = categoryTemplates.find((t) => t.name === tmplName);
    if (found) {
      update('messageContent', found.content);
    }
  };

  const renderedPreviewText = useMemo(() => {
    const contact = SAMPLE_CONTACTS[form.selectedSampleContact] || SAMPLE_CONTACTS['Rahul Sharma'];
    let text = form.messageContent;
    text = text.replace(/\{\{name\}\}/g, contact.name);
    text = text.replace(/\{\{course_name\}\}/g, contact.course_name);
    text = text.replace(/\{\{institute_name\}\}/g, contact.institute_name);
    text = text.replace(/\{\{offer\}\}/g, contact.offer);
    text = text.replace(/\{\{phone\}\}/g, '+91 98765 43210');
    text = text.replace(/\{\{date\}\}/g, 'Sept 15, 2026');
    return text;
  }, [form.messageContent, form.selectedSampleContact]);

  const insertVariable = (variableTag: string) => {
    update('messageContent', form.messageContent + ` ${variableTag}`);
    showToast(`Added ${variableTag} to message`);
  };

  const triggerRefreshPreview = () => {
    setIsRefreshingPreview(true);
    setTimeout(() => {
      setIsRefreshingPreview(false);
      showToast('Preview refreshed with sample data');
    }, 400);
  };

  // Step 3 Audience selection logic
  const filteredContacts = useMemo(() => {
    return AUDIENCE_CONTACTS.filter((c) => {
      const matchesSearch =
        audienceSearch.trim() === '' ||
        c.name.toLowerCase().includes(audienceSearch.toLowerCase()) ||
        c.phone.includes(audienceSearch) ||
        c.tag.toLowerCase().includes(audienceSearch.toLowerCase());

      const matchesSegment =
        selectedSegmentFilter === 'All Segments' || c.segment === selectedSegmentFilter;

      const matchesTag =
        selectedTagFilter === 'All Tags' || c.tag === selectedTagFilter;

      const matchesStatus =
        selectedStatusFilter === 'All Status' || c.status === selectedStatusFilter;

      return matchesSearch && matchesSegment && matchesTag && matchesStatus;
    });
  }, [audienceSearch, selectedSegmentFilter, selectedTagFilter, selectedStatusFilter]);

  const toggleSelectAllContacts = () => {
    if (selectedContactIds.size === filteredContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const toggleContact = (id: string) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedContactIds(next);
  };

  // Audience metrics
  const selectedContactsList = useMemo(() => {
    return AUDIENCE_CONTACTS.filter((c) => selectedContactIds.has(c.id));
  }, [selectedContactIds]);

  const selectedCount = selectedContactIds.size;
  const studentCount = selectedContactsList.filter((c) => c.segment === 'Student').length;
  const studentPct = selectedCount > 0 ? Math.round((studentCount / selectedCount) * 100) : 0;
  const enquiryCount = selectedContactsList.filter((c) => c.segment === 'Enquiry').length;
  const enquiryPct = selectedCount > 0 ? Math.round((enquiryCount / selectedCount) * 100) : 0;
  const parentCount = selectedContactsList.filter((c) => c.segment === 'Parent').length;
  const parentPct = selectedCount > 0 ? Math.round((parentCount / selectedCount) * 100) : 0;

  // Interest breakdown
  const dataSciencePct = selectedCount > 0 ? Math.round((selectedContactsList.filter((c) => c.interest === 'Data Science').length / selectedCount) * 100) : 0;
  const pythonPct = selectedCount > 0 ? Math.round((selectedContactsList.filter((c) => c.interest === 'Python').length / selectedCount) * 100) : 0;
  const webinarPct = selectedCount > 0 ? Math.round((selectedContactsList.filter((c) => c.interest === 'Webinar').length / selectedCount) * 100) : 0;
  const mlPct = selectedCount > 0 ? Math.round((selectedContactsList.filter((c) => c.interest === 'Machine Learning').length / selectedCount) * 100) : 0;

  const nextButtonLabel =
    step === 1 ? 'Next: Create Message' :
    step === 2 ? 'Next: Select Audience' :
    step === 3 ? 'Next: Schedule Campaign' :
    step === 4 ? 'Next: Review & Launch' :
    'Launch Campaign';

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] min-h-screen">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold shadow-2xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      {/* Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900">Available Variables</h3>
              </div>
              <button
                onClick={() => setShowVariablesModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 my-3">
              Click any variable to insert it into your WhatsApp message template:
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  onClick={() => {
                    insertVariable(v.tag);
                    setShowVariablesModal(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 text-left transition-all group"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-blue-600 group-hover:text-blue-700">
                      {v.tag}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{v.label}</p>
                  </div>
                  <span className="text-[11px] text-gray-500 italic bg-gray-50 px-2 py-0.5 rounded-md">
                    {v.example}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Template Library Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-gray-900">Meta Approved Template Library</h3>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 my-3">
              Select any pre-approved Meta WhatsApp template to instantly populate your campaign:
            </p>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {Object.entries(TEMPLATES).flatMap(([cat, list]) =>
                list.map((tmpl) => (
                  <div
                    key={tmpl.name}
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-gray-900 font-mono">{tmpl.name}</span>
                        <span className="ml-2 text-[10px] text-gray-400">{cat}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {tmpl.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed bg-gray-50/70 p-2 rounded-lg font-mono">
                      {tmpl.content}
                    </p>
                    <button
                      onClick={() => {
                        update('templateCategory', cat);
                        update('templateName', tmpl.name);
                        update('messageContent', tmpl.content);
                        setShowLibraryModal(false);
                        showToast(`Loaded template: ${tmpl.name}`);
                      }}
                      className="self-end text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Use This Template →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="max-w-7xl mx-auto">
          {/* Back button */}
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {step >= 2 ? 'Back to Create Campaign' : 'Back to Campaigns'}
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title & Subtitle */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                {step === 1 ? 'Create Campaign' :
                 step === 2 ? 'Create Campaign Message' :
                 step === 3 ? 'Select Audience' :
                 step === 4 ? 'Schedule Campaign' :
                 'Review & Launch'}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                {step === 1
                  ? 'Send targeted WhatsApp messages to your contacts at scale.'
                  : step === 2
                  ? 'Design your WhatsApp message using a template or create a custom message.'
                  : step === 3
                  ? 'Choose the contacts who should receive this WhatsApp campaign.'
                  : step === 4
                  ? 'Set the date and time to send your WhatsApp campaign.'
                  : 'Review your campaign details and confirm to send WhatsApp messages.'}
              </p>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-0 overflow-x-auto pb-1 flex-shrink-0 max-w-full">
              {STEPS.map((s, idx) => {
                const isActive = s.id === step;
                const isCompleted = s.id < step;

                return (
                  <div key={s.id} className="flex items-center flex-shrink-0">
                    <button
                      onClick={() => setStep(s.id as Step)}
                      className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none flex-shrink-0"
                    >
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                          isActive
                            ? 'bg-[#1b59f8] text-white shadow-sm shadow-blue-500/25'
                            : isCompleted
                            ? 'bg-blue-50 border border-blue-200 text-[#1b59f8]'
                            : 'bg-white border border-gray-300 text-gray-700 group-hover:border-gray-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5 text-[#1b59f8] stroke-[2.5]" /> : s.id}
                      </div>
                      <div className="hidden md:block flex-shrink-0">
                        <p
                          className={`text-xs font-bold leading-tight whitespace-nowrap flex items-center gap-1 ${
                            isActive
                              ? 'text-[#1b59f8]'
                              : isCompleted
                              ? 'text-gray-900'
                              : 'text-gray-700'
                          }`}
                        >
                          {s.label}
                          {isCompleted && step < 5 && <span className="text-emerald-500 font-bold">✓</span>}
                        </p>
                        {(!isCompleted || isActive) && (
                          <p
                            className={`text-[10.5px] leading-tight mt-0.5 whitespace-nowrap ${
                              isActive ? 'text-[#1b59f8] font-medium' : 'text-gray-400'
                            }`}
                          >
                            {s.sublabel}
                          </p>
                        )}
                      </div>
                    </button>

                    {idx < STEPS.length - 1 && (
                      <div className="w-4 sm:w-6 lg:w-8 h-[1px] bg-gray-200 mx-2 lg:mx-3 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Body ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {step === 1 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Form Card (8 cols) */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                <div className="space-y-6">
                  {/* Header inside card */}
                  <div className="flex items-center gap-3 pb-2">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Campaign Details</h2>
                      <p className="text-xs text-gray-500">Set up the basic information for your campaign.</p>
                    </div>
                  </div>

                  {/* Campaign Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-2">
                      Campaign Name <span className="text-blue-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Give a clear name to identify this campaign."
                      className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-gray-400 transition-all"
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Give a clear name to identify this campaign.
                    </p>
                  </div>

                  {/* Campaign Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-2">
                      Campaign Type <span className="text-blue-600">*</span>
                    </label>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
                      {CAMPAIGN_TYPES.map((ct) => {
                        const Icon = ct.icon;
                        const isSelected = form.type === ct.id;

                        return (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => update('type', ct.id)}
                            className={`relative flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-[#f4f7ff] ring-1 ring-blue-500/20'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-600" />
                            )}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ct.iconBg}`}>
                              <Icon className={`w-4 h-4 ${ct.iconColor}`} />
                            </div>
                            <div className="min-w-0 flex-1 pr-1">
                              <p className="text-xs font-bold text-gray-900 leading-tight truncate">
                                {ct.label}
                              </p>
                              <p className="text-[10px] text-gray-500 leading-snug mt-0.5 truncate">
                                {ct.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campaign Description */}
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-2">
                      Campaign Description
                    </label>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => update('description', e.target.value)}
                      placeholder="A short description for your reference."
                      className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-gray-400 resize-none transition-all"
                    />
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      A short description for your reference.
                    </p>
                  </div>

                  {/* Select AI Agent */}
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-2">
                      Select AI Agent <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center pointer-events-none">
                        <Bot className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <select
                        value={form.aiAgent}
                        onChange={(e) => update('aiAgent', e.target.value)}
                        className="w-full pl-12 pr-10 py-2.5 text-xs font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                      >
                        <option value="">Select an AI agent...</option>
                        {AI_AGENTS.map((agent) => (
                          <option key={agent} value={agent}>
                            {agent}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      Use an AI agent to personalize messages (e.g., add recipient name, course suggestions, etc.).
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 flex items-center justify-between border-t border-gray-100 mt-6">
                    <button
                      type="button"
                      onClick={() => showToast('Campaign saved as draft')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      Save as Draft
                    </button>

                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25"
                    >
                      {nextButtonLabel}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Campaign Summary (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Campaign Summary</h3>
                      <p className="text-[11px] text-gray-400">Review your campaign configuration.</p>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="py-4 space-y-4 text-xs">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-gray-400 font-medium flex-shrink-0">Name</span>
                      <span className="font-semibold text-gray-900 text-right">{form.name || '—'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-400 font-medium flex-shrink-0">Type</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-100 text-blue-600">
                        {form.type}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <span className="text-gray-400 font-medium flex-shrink-0">Description</span>
                      <span className="text-gray-700 text-right text-xs leading-relaxed max-w-[200px]">
                        {form.description || '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-400 font-medium flex-shrink-0">AI Agent</span>
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center">
                          <Bot className="w-2.5 h-2.5 text-blue-600" />
                        </div>
                        <span className="text-xs font-semibold text-gray-800">
                          {form.aiAgent || 'None'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-400 font-medium flex-shrink-0">Audience</span>
                      <span className="text-gray-400 italic">{form.audience || 'Not selected yet'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-400 font-medium flex-shrink-0">Schedule</span>
                      <span className="text-gray-400 italic">
                        {form.scheduledDate ? `${form.scheduledDate} ${form.scheduledTime}` : 'Not scheduled'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-400 font-medium flex-shrink-0">Status</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Draft
                      </span>
                    </div>
                  </div>
                </div>

                {/* Next Step Banner */}
                <div className="bg-[#f2f6ff] border border-blue-100/80 rounded-2xl p-5 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Next Step</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      Create your message template and personalize it using variables.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Feature Highlights (Step 1 only) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Higher Engagement</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Personalized messages get 3x better response rates.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Save Time</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Send messages to thousands of contacts automatically.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Track Results</h4>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Monitor delivery, read, and response rates in real-time.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 2: CREATE CAMPAIGN MESSAGE ───────────────────────────────── */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── Left Column: Message Template Card (8 cols) ───────────────── */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              {/* Header with icon & Template Library button */}
              <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Message Template</h2>
                    <p className="text-xs text-gray-500">Create or choose a message template for your campaign.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLibraryModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-xs cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-gray-600" />
                  Template Library
                </button>
              </div>

              {/* Tabs: Choose Template / Create New / Use AI (Generate) */}
              <div className="flex items-center gap-6 text-xs font-semibold border-b border-gray-100 pt-4 pb-0">
                {[
                  { key: 'choose', label: 'Choose Template' },
                  { key: 'create', label: 'Create New' },
                  { key: 'ai', label: 'Use AI (Generate)' },
                ].map((tab) => {
                  const isTabActive = templateTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setTemplateTab(tab.key as TemplateTab)}
                      className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                        isTabActive
                          ? 'text-blue-600 border-b-2 border-blue-600 -mb-[1px]'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Form Body based on tab */}
              {templateTab === 'choose' && (
                <div className="pt-5 space-y-5">
                  {/* Category & Name Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Template Category */}
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-2">
                        Template Category
                      </label>
                      <div className="relative">
                        <select
                          value={form.templateCategory}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                        >
                          {TEMPLATE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Template Name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-2">
                        Template Name
                      </label>
                      <div className="relative">
                        <select
                          value={form.templateName}
                          onChange={(e) => handleTemplateChange(e.target.value)}
                          className="w-full pl-4 pr-24 py-2.5 text-xs font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer font-mono"
                        >
                          {(TEMPLATES[form.templateCategory] || []).map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-9 top-1/2 -translate-y-1/2 pointer-events-none">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Approved
                          </span>
                        </div>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <label className="block text-xs font-bold text-gray-900">
                          Message Content
                        </label>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          You can use variables to personalize your message.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowVariablesModal(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                      >
                        <span className="font-mono">{`{ }`}</span>
                        View Variables
                      </button>
                    </div>

                    {/* Editor box */}
                    <div className="relative border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all bg-white">
                      <textarea
                        rows={10}
                        value={form.messageContent}
                        onChange={(e) => update('messageContent', e.target.value)}
                        placeholder="Type your WhatsApp message..."
                        className="w-full px-4 pt-3.5 pb-7 text-xs text-gray-800 bg-transparent outline-none resize-none leading-relaxed font-sans"
                      />

                      {/* Character counter */}
                      <span className="absolute bottom-2.5 right-3.5 text-[10px] text-gray-400 font-mono pointer-events-none">
                        {form.messageContent.length}/1024
                      </span>
                    </div>

                    {/* Editor Toolbar */}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => update('messageContent', form.messageContent + ' 😊')}
                          title="Emoji"
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => update('messageContent', form.messageContent + ' *bold text*')}
                          title="Bold"
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => update('messageContent', form.messageContent + ' _italic text_')}
                          title="Italic"
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => update('messageContent', form.messageContent + ' https://')}
                          title="Insert Link"
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => showToast('Image attachment header added')}
                          title="Attach Media"
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => showToast('Document attachment header added')}
                          title="Attach Document"
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowVariablesModal(true)}
                          title="Insert Variable"
                          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all font-mono text-xs font-bold cursor-pointer"
                        >
                          {`{ }`}
                        </button>
                      </div>

                      {/* Personalize with AI */}
                      <button
                        type="button"
                        onClick={() => {
                          showToast('AI improved readability and urgency!');
                          update(
                            'messageContent',
                            `Hi {{name}}! 🚀\n\nExciting news — enrollments for {{course_name}} are now LIVE at {{institute_name}}!\n\n✅ Industry expert mentors\n✅ Real-world Capstone projects\n✅ Global certification\n✅ Guaranteed career support\n\n🎁 Exclusive Deal: {{offer}}\n\nReply YES to speak with our admissions lead today!`
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-50 transition-all shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        Personalize with AI
                      </button>
                    </div>
                  </div>

                  {/* Variables in this template box */}
                  <div className="bg-[#f4f8ff] border border-blue-100 rounded-2xl p-4">
                    <div className="flex items-start gap-2.5 mb-3">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lightbulb className="w-3 h-3 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Variables in this template</h4>
                        <p className="text-[10.5px] text-gray-500 mt-0.5">
                          These will be automatically replaced with contact data.
                        </p>
                      </div>
                    </div>

                    {/* Variable Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                      {['{{name}}', '{{course_name}}', '{{institute_name}}', '{{offer}}'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertVariable(tag)}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-blue-100/70 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {templateTab === 'create' && (
                <div className="pt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1.5">
                      New Template Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. course_early_bird_offer"
                      className="w-full px-4 py-2.5 text-xs text-gray-900 border border-gray-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1.5">
                      Category
                    </label>
                    <select className="w-full px-4 py-2.5 text-xs text-gray-900 border border-gray-200 rounded-xl">
                      <option>Marketing</option>
                      <option>Education</option>
                      <option>Utility</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      showToast('Custom template submitted to Meta for approval');
                      setTemplateTab('choose');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Submit for Meta Approval
                  </button>
                </div>
              )}

              {templateTab === 'ai' && (
                <div className="pt-5 space-y-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-indigo-900">Generate WhatsApp Template with AI</p>
                    <p className="text-[11px] text-indigo-600 mt-1">
                      Describe your objective and AI will format it with variables and emojis.
                    </p>
                    <textarea
                      rows={3}
                      placeholder="e.g. Write a friendly reminder for leads who attended our Data Science webinar offering 25% discount."
                      className="w-full mt-3 p-3 bg-white text-xs border border-indigo-200 rounded-xl outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        showToast('AI generated template successfully!');
                        setTemplateTab('choose');
                      }}
                      className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Template
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-6 flex items-center justify-between border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
                >
                  Next: Select Audience
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Right Column: Message Preview & Testing (4 cols) ──────────── */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* WhatsApp Phone Mockup Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                {/* Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Message Preview</h3>
                    <p className="text-[11px] text-gray-400">See how your message will look to recipients.</p>
                  </div>
                </div>

                {/* WhatsApp Phone Container */}
                <div className="mt-4 rounded-2xl overflow-hidden border border-gray-200 shadow-md">
                  {/* WhatsApp Top Bar */}
                  <div className="bg-[#008069] px-3.5 py-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowLeft className="w-4 h-4 cursor-pointer" />
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/30">
                        A
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold truncate leading-tight">ABC Academy</p>
                          <span className="w-3 h-3 rounded-full bg-emerald-400 text-white flex items-center justify-center text-[8px] font-bold">
                            ✓
                          </span>
                        </div>
                        <p className="text-[9.5px] text-emerald-100/90 leading-tight">Business Account</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-white/90">
                      <Video className="w-3.5 h-3.5 cursor-pointer" />
                      <Phone className="w-3.5 h-3.5 cursor-pointer" />
                      <MoreVertical className="w-3.5 h-3.5 cursor-pointer" />
                    </div>
                  </div>

                  {/* Chat Conversation Canvas */}
                  <div className="bg-[#efeae2] p-3.5 min-h-[340px] flex flex-col justify-start relative">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

                    {/* WhatsApp Message Bubble */}
                    <div
                      className={`relative bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-sm max-w-[95%] transition-opacity duration-200 ${
                        isRefreshingPreview ? 'opacity-50' : 'opacity-100'
                      }`}
                    >
                      <div className="text-[11.5px] text-gray-800 whitespace-pre-line leading-relaxed">
                        {renderedPreviewText}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] text-gray-400">
                        <span>10:24 AM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test with Sample Data Card */}
              <div className="bg-[#f8faff] border border-blue-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FlaskConical className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">Test with Sample Data</h4>
                </div>
                <p className="text-[11px] text-gray-500 mb-3.5">
                  Preview your message with sample contact data.
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                    Sample Contact
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={form.selectedSampleContact}
                        onChange={(e) => update('selectedSampleContact', e.target.value)}
                        className="w-full px-3 py-2 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                      >
                        {Object.keys(SAMPLE_CONTACTS).map((contact) => (
                          <option key={contact} value={contact}>
                            {contact}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>

                    <button
                      type="button"
                      onClick={triggerRefreshPreview}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-50 transition-all shadow-2xs flex-shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingPreview ? 'animate-spin' : ''}`} />
                      Refresh Preview
                    </button>
                  </div>
                </div>
              </div>

              {/* Meta Approved Badge Banner */}
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-emerald-900">
                    This template is approved by Meta and ready to use.
                  </h5>
                  <p className="text-[11px] text-emerald-700/80 mt-0.5 leading-relaxed">
                    You can send this message to your selected audience once you schedule the campaign.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── STEP 3: SELECT AUDIENCE (EXACT TO SCREENSHOT) ───────────────────── */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── Left Column: Contact Lists & Table (8 cols) ───────────────── */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              
              {/* Top Tabs */}
              <div className="flex items-center gap-6 text-xs font-semibold border-b border-gray-100 pb-0">
                {[
                  { key: 'contacts', label: 'Contact Lists' },
                  { key: 'segments', label: 'Segments' },
                  { key: 'import', label: 'Import' },
                  { key: 'manual', label: 'Manual Entry' },
                ].map((tab) => {
                  const isTabActive = audienceTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setAudienceTab(tab.key as AudienceTab)}
                      className={`pb-3 text-xs font-bold transition-all relative cursor-pointer ${
                        isTabActive
                          ? 'text-blue-600 border-b-2 border-blue-600 -mb-[1px]'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Stat Metric Cards (4 in a row) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {/* Total Contacts */}
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-none">12,486</h3>
                    <p className="text-[11px] text-gray-400 mt-1">Total Contacts</p>
                  </div>
                </div>

                {/* Students */}
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-none">8,920</h3>
                    <p className="text-[11px] text-gray-400 mt-1">Students</p>
                  </div>
                </div>

                {/* Enquiries */}
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-none">2,340</h3>
                    <p className="text-[11px] text-gray-400 mt-1">Enquiries</p>
                  </div>
                </div>

                {/* Parents */}
                <div className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-none">1,226</h3>
                    <p className="text-[11px] text-gray-400 mt-1">Parents</p>
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={audienceSearch}
                    onChange={(e) => setAudienceSearch(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full pl-9 pr-3 py-2 text-xs text-gray-900 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-gray-400"
                  />
                </div>

                {/* All Segments dropdown */}
                <div className="relative">
                  <select
                    value={selectedSegmentFilter}
                    onChange={(e) => setSelectedSegmentFilter(e.target.value)}
                    className="pl-3 pr-7 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option>All Segments</option>
                    <option>Student</option>
                    <option>Enquiry</option>
                    <option>Parent</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* All Tags dropdown */}
                <div className="relative">
                  <select
                    value={selectedTagFilter}
                    onChange={(e) => setSelectedTagFilter(e.target.value)}
                    className="pl-3 pr-7 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option>All Tags</option>
                    <option>Data Science</option>
                    <option>Webinar</option>
                    <option>Python</option>
                    <option>ML</option>
                    <option>AI</option>
                    <option>Placement</option>
                    <option>Counselling</option>
                    <option>Full Stack</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* All Status dropdown */}
                <div className="relative">
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="pl-3 pr-7 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option>All Status</option>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* More Filters button */}
                <button
                  type="button"
                  onClick={() => showToast('Advanced filtering criteria')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5 text-gray-500" />
                  More Filters
                </button>
              </div>

              {/* Contacts Table */}
              <div className="border border-gray-100 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-semibold text-gray-500">
                      <th className="py-3 px-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.size === filteredContacts.length && filteredContacts.length > 0}
                          onChange={toggleSelectAllContacts}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3">
                        <div className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700">
                          Name
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3">Phone Number</th>
                      <th className="py-3 px-3">Tags</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">
                        <div className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700">
                          Last Activity
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {filteredContacts.map((contact) => {
                      const isSelected = selectedContactIds.has(contact.id);

                      return (
                        <tr
                          key={contact.id}
                          onClick={() => toggleContact(contact.id)}
                          className={`hover:bg-blue-50/20 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-50/10' : ''
                          }`}
                        >
                          <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleContact(contact.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                            />
                          </td>

                          {/* Name with initials avatar */}
                          <td className="py-3 px-3 font-semibold text-gray-900">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-full ${contact.avatarBg} ${contact.avatarText} flex items-center justify-center text-[10.5px] font-bold flex-shrink-0`}
                              >
                                {contact.initials}
                              </div>
                              <span className="truncate max-w-[140px]">{contact.name}</span>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3 px-3 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                            {contact.phone}
                          </td>

                          {/* Tags */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {/* Segment Pill */}
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                  contact.segment === 'Student'
                                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                    : contact.segment === 'Enquiry'
                                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                    : 'bg-orange-50 text-orange-600 border border-orange-100'
                                }`}
                              >
                                {contact.segment}
                              </span>

                              {/* Course/Topic Tag Pill */}
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                {contact.tag}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  contact.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                              />
                              <span
                                className={`text-[11px] font-semibold ${
                                  contact.status === 'Active' ? 'text-gray-700' : 'text-gray-500'
                                }`}
                              >
                                {contact.status}
                              </span>
                            </div>
                          </td>

                          {/* Last Activity */}
                          <td className="py-3 px-3 text-gray-500 text-[11px] whitespace-nowrap">
                            {contact.lastActivity}
                          </td>

                          {/* More Options */}
                          <td className="py-3 px-3 text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => showToast(`Actions for ${contact.name}`)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer / Pagination */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-900">{selectedCount}</span> of{' '}
                  <span className="font-semibold text-gray-900">12,486</span> contacts selected
                </p>

                {/* Pagination */}
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 cursor-pointer"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 cursor-pointer"
                  >
                    3
                  </button>
                  <span className="px-1 text-gray-400">...</span>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600 cursor-pointer"
                  >
                    1,249
                  </button>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* ── Right Column: Audience Summary & Insights (4 cols) ────────── */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Audience Summary Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Audience Summary</h3>
                    <p className="text-[11px] text-gray-400">Review your selected audience.</p>
                  </div>
                </div>

                <div className="py-3.5 space-y-3.5 text-xs">
                  {/* Selected Contacts */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-gray-700">Selected Contacts</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">{selectedCount}</p>
                      <p className="text-[10px] text-gray-400">of 12,486</p>
                    </div>
                  </div>

                  {/* Students */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-gray-700">Students</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">{studentCount}</p>
                      <p className="text-[10px] text-gray-400">{studentPct}%</p>
                    </div>
                  </div>

                  {/* Enquiries */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-gray-700">Enquiries</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">{enquiryCount}</p>
                      <p className="text-[10px] text-gray-400">{enquiryPct}%</p>
                    </div>
                  </div>

                  {/* Parents */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-gray-700">Parents</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-900">{parentCount}</p>
                      <p className="text-[10px] text-gray-400">{parentPct}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audience Insights Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2.5 mb-3.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-900">Audience Insights</h4>
                </div>

                <p className="text-[11px] font-bold text-gray-700 mb-2.5">Top Interests</p>

                {/* Progress bars */}
                <div className="space-y-2.5 text-xs">
                  {/* Data Science */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-gray-600">Data Science</span>
                      <span className="font-bold text-gray-800">{dataSciencePct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${dataSciencePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Python */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-gray-600">Python</span>
                      <span className="font-bold text-gray-800">{pythonPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${pythonPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Webinar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-gray-600">Webinar</span>
                      <span className="font-bold text-gray-800">{webinarPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${webinarPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Machine Learning */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-gray-600">Machine Learning</span>
                      <span className="font-bold text-gray-800">{mlPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all duration-300"
                        style={{ width: `${mlPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tip Box */}
                <div className="bg-[#f4f8ff] border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5 mt-4">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Tip</p>
                    <p className="text-[10.5px] text-gray-500 leading-relaxed mt-0.5">
                      Use segments and tags to send more relevant messages and get higher engagement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
                >
                  Next: Schedule Campaign
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── STEP 4: SCHEDULE CAMPAIGN (EXACT TO MOCKUP) ────────────────────── */}
        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── Left Column: Schedule Options & Sending Settings (8 cols) ─── */}
            <div className="lg:col-span-8 space-y-6">

              {/* ── Card 1: Schedule Options ───────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-3.5 pb-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100">
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      Schedule Options
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Choose when to send your campaign.
                    </p>
                  </div>
                </div>

                {/* 3 Option Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Option 1: Send Now */}
                  <button
                    type="button"
                    onClick={() => setScheduleOption('now')}
                    className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      scheduleOption === 'now'
                        ? 'border-2 border-[#1b59f8] bg-[#f8faff] shadow-2xs'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <Send className="w-4 h-4 text-blue-600" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center mt-1 ${
                          scheduleOption === 'now'
                            ? 'border-[#1b59f8]'
                            : 'border-gray-300'
                        }`}
                      >
                        {scheduleOption === 'now' && (
                          <div className="w-2 h-2 rounded-full bg-[#1b59f8]" />
                        )}
                      </div>
                    </div>
                    <h4
                      className={`text-sm font-bold leading-tight ${
                        scheduleOption === 'now' ? 'text-[#1b59f8]' : 'text-gray-900'
                      }`}
                    >
                      Send Now
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 leading-snug">
                      Send immediately after confirmation
                    </p>
                  </button>

                  {/* Option 2: Schedule for Later (Default selected in mockup) */}
                  <button
                    type="button"
                    onClick={() => setScheduleOption('later')}
                    className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      scheduleOption === 'later'
                        ? 'border-2 border-[#1b59f8] bg-[#f8faff] shadow-2xs'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#1b59f8] flex items-center justify-center mb-3">
                        <Calendar className="w-4 h-4 text-[#1b59f8]" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center mt-1 ${
                          scheduleOption === 'later'
                            ? 'border-[#1b59f8]'
                            : 'border-gray-300'
                        }`}
                      >
                        {scheduleOption === 'later' && (
                          <div className="w-2 h-2 rounded-full bg-[#1b59f8]" />
                        )}
                      </div>
                    </div>
                    <h4
                      className={`text-sm font-bold leading-tight ${
                        scheduleOption === 'later' ? 'text-[#1b59f8]' : 'text-gray-900'
                      }`}
                    >
                      Schedule for Later
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                      Choose a specific date and time
                    </p>
                  </button>

                  {/* Option 3: Recurring Campaign */}
                  <button
                    type="button"
                    onClick={() => setScheduleOption('recurring')}
                    className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      scheduleOption === 'recurring'
                        ? 'border-2 border-[#1b59f8] bg-[#f8faff] shadow-2xs'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                        <RotateCcw className="w-4 h-4 text-blue-600" />
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center mt-1 ${
                          scheduleOption === 'recurring'
                            ? 'border-[#1b59f8]'
                            : 'border-gray-300'
                        }`}
                      >
                        {scheduleOption === 'recurring' && (
                          <div className="w-2 h-2 rounded-full bg-[#1b59f8]" />
                        )}
                      </div>
                    </div>
                    <h4
                      className={`text-sm font-bold leading-tight ${
                        scheduleOption === 'recurring' ? 'text-[#1b59f8]' : 'text-gray-900'
                      }`}
                    >
                      Recurring Campaign
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 leading-snug">
                      Send repeatedly (e.g., daily, weekly)
                    </p>
                  </button>
                </div>

                {/* Date & Time Inputs (when Schedule for Later is active) */}
                {scheduleOption === 'later' && (
                  <div className="space-y-3 pt-1">
                    <label className="block text-xs sm:text-sm font-bold text-gray-900">
                      Date & Time
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Date */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Date *
                        </label>
                        <div className="relative">
                          <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-900 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium"
                            placeholder="15 Jan 2025"
                          />
                        </div>
                      </div>

                      {/* Time */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Time *
                        </label>
                        <div className="relative">
                          <Clock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm text-gray-900 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white font-medium"
                            placeholder="10:00 AM"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Timezone Note */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
                      <span>Timezone: Asia/Kolkata (GMT+5:30)</span>
                      <Info className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Card 2: Sending Settings ───────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-3.5 pb-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1b59f8] flex items-center justify-center flex-shrink-0 border border-blue-100">
                    <Settings2 className="w-5 h-5 text-[#1b59f8]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">
                      Sending Settings
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Configure additional settings for your campaign.
                    </p>
                  </div>
                </div>

                {/* Settings Toggle Rows */}
                <div className="space-y-4 pt-1">
                  {/* Row 1: Smart Sending */}
                  <div className="flex items-start gap-3.5 py-1">
                    <button
                      type="button"
                      onClick={() => setSmartSending(!smartSending)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out mt-0.5 ${
                        smartSending ? 'bg-[#1b59f8]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                          smartSending ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">Smart Sending</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically optimize send time for better engagement.
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Respect Quiet Hours */}
                  <div className="flex items-start gap-3.5 py-1">
                    <button
                      type="button"
                      onClick={() => setRespectQuietHours(!respectQuietHours)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out mt-0.5 ${
                        respectQuietHours ? 'bg-[#1b59f8]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                          respectQuietHours ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">Respect Quiet Hours</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Do not send messages between 10:00 PM and 8:00 AM.
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Batch Sending */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-1">
                    <div className="flex items-start gap-3.5">
                      <button
                        type="button"
                        onClick={() => setBatchSending(!batchSending)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out mt-0.5 ${
                          batchSending ? 'bg-[#1b59f8]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                            batchSending ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900">Batch Sending</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Send messages in batches to avoid rate limits.
                        </p>
                      </div>
                    </div>

                    {/* Dropdowns */}
                    <div className="flex items-center gap-3 pl-14 lg:pl-0">
                      <div>
                        <label className="block text-[10.5px] font-semibold text-gray-500 mb-1">
                          Batch Size
                        </label>
                        <select
                          value={batchSize}
                          onChange={(e) => setBatchSize(e.target.value)}
                          className="px-3 py-1.5 text-xs text-gray-800 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium"
                        >
                          <option value="50 messages">50 messages</option>
                          <option value="100 messages">100 messages</option>
                          <option value="250 messages">250 messages</option>
                          <option value="500 messages">500 messages</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-semibold text-gray-500 mb-1">
                          Delay Between Batches
                        </label>
                        <select
                          value={batchDelay}
                          onChange={(e) => setBatchDelay(e.target.value)}
                          className="px-3 py-1.5 text-xs text-gray-800 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 bg-white font-medium"
                        >
                          <option value="15 seconds">15 seconds</option>
                          <option value="30 seconds">30 seconds</option>
                          <option value="45 seconds">45 seconds</option>
                          <option value="60 seconds">60 seconds</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Stop on High Error Rate */}
                  <div className="flex items-start gap-3.5 py-1">
                    <button
                      type="button"
                      onClick={() => setStopOnError(!stopOnError)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out mt-0.5 ${
                        stopOnError ? 'bg-[#1b59f8]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5 ${
                          stopOnError ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">Stop on High Error Rate</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically pause if error rate exceeds 5%.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-5 flex items-center justify-between gap-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
                  >
                    Next: Review & Launch
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* ── Right Column: Campaign Summary & Launch Guidance (4 cols) ─── */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Campaign Summary Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3 pb-3 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Campaign Summary</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Review your campaign details before launching.</p>
                  </div>
                </div>

                {/* Key Value Rows */}
                <div className="space-y-3.5 text-xs">
                  {/* Name */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Name</span>
                    <span className="font-semibold text-gray-900 text-right">{form.name}</span>
                  </div>

                  {/* Type */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Type</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#1b59f8] border border-blue-100/60">
                      {form.type}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Description</span>
                    <span className="text-gray-600 text-right leading-relaxed text-[11.5px]">
                      {form.description}
                    </span>
                  </div>

                  {/* AI Agent */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">AI Agent</span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-800">
                      <div className="w-4 h-4 rounded-xs bg-blue-600 text-white flex items-center justify-center">
                        <Bot className="w-2.5 h-2.5" />
                      </div>
                      <span>{form.aiAgent}</span>
                    </div>
                  </div>

                  {/* Audience */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Audience</span>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{selectedContactIds.size || 10} contacts</p>
                      <p className="text-[10.5px] text-gray-400 mt-0.5">(Students: 6, Enquiries: 3, Parents: 1)</p>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Schedule</span>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 font-semibold text-gray-900">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>
                          {scheduleOption === 'now'
                            ? 'Send immediately'
                            : `${scheduleDate}, ${scheduleTime}`}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-gray-400 mt-0.5">(Asia/Kolkata)</p>
                    </div>
                  </div>

                  {/* Estimated Messages */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Estimated Messages</span>
                    <span className="font-semibold text-gray-900">{selectedContactIds.size || 10}</span>
                  </div>

                  {/* Smart Sending */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Smart Sending</span>
                    <span className="font-medium text-gray-700">{smartSending ? 'Enabled' : 'Disabled'}</span>
                  </div>

                  {/* Quiet Hours */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Quiet Hours</span>
                    <span className="font-medium text-gray-700">
                      {respectQuietHours ? 'Enabled (10 PM - 8 AM)' : 'Disabled'}
                    </span>
                  </div>

                  {/* Batch Sending */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500 font-medium w-28 flex-shrink-0">Batch Sending</span>
                    <span className="font-medium text-gray-700">
                      {batchSending
                        ? `${batchSize} (${batchDelay.replace(' seconds', 's delay')})`
                        : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ready to Launch Banner */}
              <div className="bg-[#f0fdf4] border border-green-200/80 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950 leading-tight">
                    Ready to Launch
                  </h4>
                  <p className="text-[11px] sm:text-xs text-emerald-800/80 mt-1 leading-relaxed">
                    Your campaign is scheduled and ready to be launched. You can review all details in the next step.
                  </p>
                </div>
              </div>

              {/* Tips Banner */}
              <div className="bg-[#f4f7ff] border border-blue-100/90 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100/60 text-[#1b59f8] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb className="w-4 h-4 text-[#1b59f8]" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">Tips</h4>
                  <ul className="space-y-1.5 text-[11px] sm:text-xs text-gray-600 leading-relaxed list-disc list-inside">
                    <li>Schedule messages during active hours (9 AM - 9 PM).</li>
                    <li>Use smart sending for better engagement.</li>
                    <li>Start with a small batch to test delivery.</li>
                    <li>Monitor results in real-time after launch.</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW & LAUNCH (EXACT TO MOCKUP) ────────────────────── */}
        {step === 5 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── Left Column: Campaign Overview & Message Preview (8 cols) ─── */}
            <div className="lg:col-span-8 space-y-6">

              {/* ── Card 1: Campaign Overview ───────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        Campaign Overview
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        Review all details before launching your campaign.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-[#1b59f8] text-xs font-semibold rounded-xl transition-all cursor-pointer bg-white"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#1b59f8]" />
                    Edit Details
                  </button>
                </div>

                {/* Key-Value Details Rows */}
                <div className="border-t border-b border-gray-100 divide-y divide-gray-100 py-1 text-xs sm:text-sm">
                  {/* Campaign Name */}
                  <div className="flex items-center py-3">
                    <span className="w-36 sm:w-44 text-gray-500 font-medium flex-shrink-0">
                      Campaign Name
                    </span>
                    <span className="font-semibold text-gray-900">{form.name}</span>
                  </div>

                  {/* Campaign Type */}
                  <div className="flex items-center py-3">
                    <span className="w-36 sm:w-44 text-gray-500 font-medium flex-shrink-0">
                      Campaign Type
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#1b59f8] border border-blue-100/60 inline-block">
                      {form.type}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="flex items-start py-3">
                    <span className="w-36 sm:w-44 text-gray-500 font-medium flex-shrink-0 mt-0.5">
                      Description
                    </span>
                    <span className="text-gray-600 leading-relaxed text-xs sm:text-[13px]">
                      {form.description}
                    </span>
                  </div>

                  {/* AI Agent */}
                  <div className="flex items-center py-3">
                    <span className="w-36 sm:w-44 text-gray-500 font-medium flex-shrink-0">
                      AI Agent
                    </span>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-semibold text-gray-800">
                      <div className="w-4 h-4 rounded-xs bg-blue-600 text-white flex items-center justify-center">
                        <Bot className="w-2.5 h-2.5" />
                      </div>
                      <span>{form.aiAgent}</span>
                    </div>
                  </div>
                </div>

                {/* 3 Metrics Cards inside Campaign Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Metric 1: Audience */}
                  <div className="border border-gray-100 rounded-xl p-3.5 flex items-start gap-3 bg-white">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">Audience</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {selectedContactIds.size || 10} contacts
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        (Students: 6, Enquiries: 3, Parents: 1)
                      </p>
                    </div>
                  </div>

                  {/* Metric 2: Schedule */}
                  <div className="border border-gray-100 rounded-xl p-3.5 flex items-start gap-3 bg-white">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">Schedule</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {scheduleOption === 'now' ? 'Immediate' : `${scheduleDate}, ${scheduleTime}`}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">(Asia/Kolkata)</p>
                    </div>
                  </div>

                  {/* Metric 3: Estimated Messages */}
                  <div className="border border-gray-100 rounded-xl p-3.5 flex items-start gap-3 bg-white">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1b59f8] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4 text-[#1b59f8]" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">Estimated Messages</p>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">
                        {selectedContactIds.size || 10}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Within template limits</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Card 2: Message Preview ─────────────────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900">
                        Message Preview
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        This is how your message will look to recipients.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-[#1b59f8] text-xs font-semibold rounded-xl transition-all cursor-pointer bg-white"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#1b59f8]" />
                    Edit Message
                  </button>
                </div>

                {/* Message Content Box */}
                <div className="bg-[#f0f5ff]/70 border border-blue-100/90 rounded-2xl p-5 text-xs sm:text-[13px] text-gray-800 leading-relaxed font-sans whitespace-pre-line shadow-2xs">
                  {`Hi {{name}}! 👋

Kickstart your career with our Data Science course at {{institute_name}}.

✅ Live online classes
✅ Hands-on projects
✅ Certification
✅ Placement support

Special offer: {{offer}}

Reply YES to know more or book a free demo!`}
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                  Back
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      showToast('Draft saved successfully!');
                      setTimeout(() => router.push('/campaigns'), 800);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-gray-500" />
                    Save as Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsLaunching(true);
                      setTimeout(() => {
                        setIsLaunching(false);
                        setShowLaunchModal(true);
                      }, 600);
                    }}
                    disabled={isLaunching}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/25 cursor-pointer disabled:opacity-70"
                  >
                    {isLaunching ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Launch Campaign
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* ── Right Column: WhatsApp Preview & Ready Banner (4 cols) ─────── */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* WhatsApp Preview Card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-3 pb-1">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 border border-purple-100">
                    <Eye className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">WhatsApp Preview</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Live preview on WhatsApp (sample contact).</p>
                  </div>
                </div>

                {/* WhatsApp Phone Mockup Frame */}
                <div className="rounded-2xl overflow-hidden border border-gray-200/90 shadow-sm bg-[#efeae2]">
                  {/* WhatsApp App Bar */}
                  <div className="bg-[#075e54] px-3.5 py-3 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronLeft className="w-4 h-4 text-white/90 cursor-pointer" />
                      <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold leading-tight truncate">ABC Academy</p>
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold">
                            ✓
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-100/90 leading-none mt-0.5">
                          Business Account
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-white/90">
                      <Video className="w-4 h-4 cursor-pointer hover:text-white" />
                      <Phone className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
                      <MoreVertical className="w-3.5 h-3.5 cursor-pointer hover:text-white" />
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="p-3 sm:p-4 min-h-[350px] flex flex-col justify-start">
                    {/* Received WhatsApp Bubble */}
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs text-gray-800 leading-relaxed shadow-xs max-w-[95%] whitespace-pre-line space-y-1.5">
                      <p className="font-medium text-gray-900">Hi Rahul! 👋</p>
                      <p>
                        Kickstart your career with our Data Science course at{' '}
                        <strong>ABC Academy</strong>.
                      </p>
                      <div className="space-y-0.5 text-gray-700 py-1">
                        <p>✅ Live online classes</p>
                        <p>✅ Hands-on projects</p>
                        <p>✅ Certification</p>
                        <p>✅ Placement support</p>
                      </div>
                      <p className="text-gray-700">
                        Special offer: <strong>30% off for early enrollments!</strong>
                      </p>
                      <p className="text-gray-700">
                        Reply YES to know more or book a free demo!
                      </p>
                      <div className="text-right text-[10px] text-gray-400 pt-0.5">
                        10:00 AM
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ready to Launch Banner */}
              <div className="bg-[#f0fdf4] border border-green-200/80 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950 leading-tight">
                    Ready to Launch
                  </h4>
                  <p className="text-[11px] sm:text-xs text-emerald-800/80 mt-1 leading-relaxed">
                    Your campaign is valid and ready to be sent. By clicking &quot;Launch Campaign&quot;, messages will be scheduled and sent automatically.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Celebration Modal */}
        {showLaunchModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-7 text-center shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Campaign Scheduled!</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                <strong>{form.name}</strong> is successfully scheduled for{' '}
                <strong>{scheduleDate} at {scheduleTime}</strong> to {selectedContactIds.size || 10} contacts.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/campaigns')}
                  className="flex-1 py-2.5 bg-[#1b59f8] text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                >
                  Go to Campaigns
                </button>
                <button
                  type="button"
                  onClick={() => setShowLaunchModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function CreateCampaignPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading campaign wizard...</div>}>
      <CreateCampaignPageContent />
    </Suspense>
  );
}
