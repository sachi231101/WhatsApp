'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is Wazzi App?',
    answer:
      'Wazzi App is an AI-powered WhatsApp business platform that combines an omnichannel shared team inbox, autonomous AI agents, grounded knowledge base RAG, visual workflow automation, high-converting broadcast campaigns, and real-time conversation analytics into a single unified business engine.',
  },
  {
    question: 'Can I connect WhatsApp Business?',
    answer:
      'Yes. Wazzi App utilizes the official Meta WhatsApp Business Cloud API. You can connect your existing phone numbers or register new numbers in minutes using our certified Meta Embedded Signup flow with zero downtime and official green tick verification support.',
  },
  {
    question: 'Can AI respond automatically?',
    answer:
      'Yes. You can configure AI agents to autonomously handle incoming customer conversations 24/7. Responses are strictly grounded in your uploaded documents, product catalogs, and URLs using Retrieval-Augmented Generation (RAG) to ensure accuracy and prevent hallucinations.',
  },
  {
    question: 'Can humans take over?',
    answer:
      'Yes, instantly and seamlessly. Human team members can view live AI conversations, pause the AI with a single click, or receive automated escalations based on customer sentiment, keyword triggers, VIP status, or complex inquiries. The human agent receives an instant AI summary of the conversation.',
  },
  {
    question: 'Can I create multiple AI agents?',
    answer:
      'Yes. You can deploy specialized AI agents for distinct business functions — such as an Admissions Agent, Sales Closer, 24/7 Technical Support Agent, or Lead Qualification Agent. Each agent has its own custom instructions, knowledge sources, voice tone, and escalation rules.',
  },
  {
    question: 'Can I automate WhatsApp workflows?',
    answer:
      'Yes. Wazzi App includes a drag-and-drop visual workflow builder. You can trigger actions from new inbound messages, detect customer intent, evaluate multi-branch conditions, enrich external CRMs (like HubSpot and Salesforce), book calendar meetings, and dispatch automated follow-up messages.',
  },
  {
    question: 'Can I track performance?',
    answer:
      'Yes. Our real-time analytics dashboard tracks total message volume, AI resolution rates, first-response time, agent velocity, customer satisfaction (CSAT) scores, and pipeline revenue generated across all your connected WhatsApp accounts.',
  },
  {
    question: 'Can Wazzi support multiple projects/teams?',
    answer:
      'Yes. Wazzi App is built with multi-tenant architecture and granular Role-Based Access Control (RBAC). You can organize operations into distinct projects, workspaces, and departments, each with isolated phone numbers, knowledge bases, agent permissions, and audit logs.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-[#FAFAFC] border-b border-slate-200/70">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything you need to know about Wazzi App.
          </h2>
          <p className="text-base text-slate-600">
            Clear answers about WhatsApp connectivity, autonomous AI agents, security, and team collaboration.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleIndex(index)}
                  className="w-full text-left px-6 py-4.5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900">{faq.question}</span>
                  <div
                    className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-blue-50 text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
