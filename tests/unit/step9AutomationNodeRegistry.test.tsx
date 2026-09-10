import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import {
  getAllNodeDefinitions,
  getNodeDefinition,
  getNodeDefinitionsByCategory,
  searchNodeDefinitions,
  createDefaultNodeData,
  validateNodeConfig,
  NodeDefinition,
} from '@/lib/automations/registry';
import { NodeLibrary } from '@/components/automations/nodes/NodeLibrary';
import { NodeIcon } from '@/components/automations/nodes/NodeIcon';

describe('Phase 7: Node Registry + Node Library', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. REGISTRY LOOKUP & CORE DEFINITION CHECKS
  // ==========================================================================
  describe('Central Node Registry Lookups', () => {
    it('should register all 35 required automation node definitions', () => {
      const allDefinitions = getAllNodeDefinitions();
      expect(allDefinitions.length).toBe(35);
    });

    it('should retrieve a node definition by exact or case-insensitive type', () => {
      const defUpper = getNodeDefinition('NEW_WHATSAPP_MESSAGE');
      expect(defUpper).toBeDefined();
      expect(defUpper?.label).toBe('New WhatsApp Message');
      expect(defUpper?.category).toBe('triggers');

      const defLower = getNodeDefinition('new_whatsapp_message');
      expect(defLower).toBeDefined();
      expect(defLower?.type).toBe('NEW_WHATSAPP_MESSAGE');

      const defCondition = getNodeDefinition('MESSAGE_CONTAINS');
      expect(defCondition).toBeDefined();
      expect(defCondition?.category).toBe('conditions');

      const nonExistent = getNodeDefinition('UNKNOWN_RANDOM_TYPE');
      expect(nonExistent).toBeUndefined();
    });

    it('should filter definitions by category correctly', () => {
      const triggers = getNodeDefinitionsByCategory('triggers');
      expect(triggers.length).toBe(9);

      const conditions = getNodeDefinitionsByCategory('conditions');
      expect(conditions.length).toBe(8);

      const actions = getNodeDefinitionsByCategory('actions');
      expect(actions.length).toBe(11);

      const aiNodes = getNodeDefinitionsByCategory('ai');
      expect(aiNodes.length).toBe(4);

      const utilities = getNodeDefinitionsByCategory('utilities');
      expect(utilities.length).toBe(3);

      const all = getNodeDefinitionsByCategory('all');
      expect(all.length).toBe(35);
    });

    it('should search node definitions by query across label and description', () => {
      const whatsappResults = searchNodeDefinitions('WhatsApp');
      expect(whatsappResults.length).toBeGreaterThanOrEqual(3);
      expect(whatsappResults.some((d) => d.type === 'NEW_WHATSAPP_MESSAGE')).toBe(true);
      expect(whatsappResults.some((d) => d.type === 'SEND_WHATSAPP_MESSAGE')).toBe(true);

      const actionTags = searchNodeDefinitions('tag', 'actions');
      expect(actionTags.some((d) => d.type === 'ADD_TAG')).toBe(true);
      expect(actionTags.some((d) => d.type === 'REMOVE_TAG')).toBe(true);

      const emptyResults = searchNodeDefinitions('totally_non_existent_query_xyz');
      expect(emptyResults.length).toBe(0);
    });
  });

  // ==========================================================================
  // 2. SUPPORTED VS COMING SOON STATUS
  // ==========================================================================
  describe('Realistic SaaS Implementation Status', () => {
    it('should mark existing backend-integrated nodes as implemented', () => {
      const whatsappMsgTrigger = getNodeDefinition('NEW_WHATSAPP_MESSAGE');
      expect(whatsappMsgTrigger?.isImplemented).toBe(true);

      const keywordTrigger = getNodeDefinition('KEYWORD_MATCH');
      expect(keywordTrigger?.isImplemented).toBe(true);

      const containsCondition = getNodeDefinition('MESSAGE_CONTAINS');
      expect(containsCondition?.isImplemented).toBe(true);

      const sendMsgAction = getNodeDefinition('SEND_WHATSAPP_MESSAGE');
      expect(sendMsgAction?.isImplemented).toBe(true);

      const aiAgentNode = getNodeDefinition('AI_AGENT');
      expect(aiAgentNode?.isImplemented).toBe(true);

      const scheduled = getNodeDefinition('SCHEDULED_TRIGGER');
      expect(scheduled?.isImplemented).toBe(true);

      const leadScore = getNodeDefinition('LEAD_SCORE');
      expect(leadScore?.isImplemented).toBe(true);

      const waitUtility = getNodeDefinition('WAIT');
      expect(waitUtility?.isImplemented).toBe(true);
    });

    it('should mark unintegrated nodes with isImplemented: false and a descriptive notice', () => {
      const incomingCall = getNodeDefinition('INCOMING_CALL');
      expect(incomingCall?.isImplemented).toBe(false);
      expect(incomingCall?.comingSoonNotice).toBeTruthy();

      const webhook = getNodeDefinition('WEBHOOK');
      expect(webhook?.isImplemented).toBe(false);

      const sendEmail = getNodeDefinition('SEND_EMAIL');
      expect(sendEmail?.isImplemented).toBe(false);

      const checkReply = getNodeDefinition('CHECK_REPLY');
      expect(checkReply?.isImplemented).toBe(false);
    });
  });

  // ==========================================================================
  // 3. INPUT & OUTPUT CONTRACTS
  // ==========================================================================
  describe('Input and Output Branch Contracts', () => {
    it('should provide dual branch outputs for Condition and Branch nodes', () => {
      const msgContains = getNodeDefinition('MESSAGE_CONTAINS');
      expect(msgContains?.outputs.map((o) => o.id)).toEqual(['yes', 'no']);
      expect(msgContains?.outputs.map((o) => o.label)).toEqual(['YES', 'NO']);

      const contactTag = getNodeDefinition('CONTACT_TAG');
      expect(contactTag?.outputs.map((o) => o.id)).toEqual(['match', 'no_match']);
      expect(contactTag?.outputs.map((o) => o.label)).toEqual(['MATCH', 'NO MATCH']);

      const branch = getNodeDefinition('BRANCH');
      expect(branch?.outputs.map((o) => o.id)).toEqual(['true', 'false']);
      expect(branch?.outputs.map((o) => o.label)).toEqual(['TRUE', 'FALSE']);
    });

    it('should provide multi-branch outputs for AI and Check Reply nodes', () => {
      const aiAgent = getNodeDefinition('AI_AGENT');
      expect(aiAgent?.outputs.map((o) => o.id)).toEqual(['completed', 'escalate']);

      const sentiment = getNodeDefinition('ANALYZE_SENTIMENT');
      expect(sentiment?.outputs.map((o) => o.id)).toEqual(['positive', 'neutral', 'negative']);

      const checkReply = getNodeDefinition('CHECK_REPLY');
      expect(checkReply?.outputs.map((o) => o.id)).toEqual(['replied', 'timeout']);
    });

    it('should declare required input context relationships', () => {
      const sendWhatsApp = getNodeDefinition('SEND_WHATSAPP_MESSAGE');
      const contexts = sendWhatsApp?.inputs.map((i) => i.context);
      expect(contexts).toContain('contact');
      expect(contexts).toContain('conversation');

      const addTag = getNodeDefinition('ADD_TAG');
      expect(addTag?.inputs.some((i) => i.context === 'contact')).toBe(true);

      const waitNode = getNodeDefinition('WAIT');
      expect(waitNode?.inputs.length).toBe(0);
    });
  });

  // ==========================================================================
  // 4. DEFAULT CONFIGURATION & PURE VALIDATORS
  // ==========================================================================
  describe('Default Configurations and Validation', () => {
    it('should produce clean default node data without fake project IDs or customer data', () => {
      const def = getNodeDefinition('NEW_WHATSAPP_MESSAGE')!;
      const data = createDefaultNodeData(def, 'custom_node_key_1');

      expect(data.nodeKey).toBe('custom_node_key_1');
      expect(data.definitionType).toBe('NEW_WHATSAPP_MESSAGE');
      expect(data.category).toBe('triggers');
      expect(data.nodeType).toBe('trigger');
      expect(data.config).toEqual({
        whatsappNumber: 'ALL',
        messageType: 'ALL',
        onlyNewContacts: false,
      });
      expect(data.isImplemented).toBe(true);
      expect(data.executorRef).toBe('executor:trigger:new_whatsapp_message');
    });

    it('should validate configurations correctly', () => {
      // Valid WhatsApp message
      const validMsg = validateNodeConfig('SEND_WHATSAPP_MESSAGE', {
        messageText: 'Hello there!',
      });
      expect(validMsg.valid).toBe(true);
      expect(validMsg.errors.length).toBe(0);

      // Invalid WhatsApp message (empty text)
      const invalidMsg = validateNodeConfig('SEND_WHATSAPP_MESSAGE', {
        messageText: '',
      });
      expect(invalidMsg.valid).toBe(false);
      expect(invalidMsg.errors.length).toBeGreaterThan(0);

      // Keyword match with empty array
      const invalidKeywords = validateNodeConfig('KEYWORD_MATCH', {
        keywords: [],
      });
      expect(invalidKeywords.valid).toBe(false);

      // Wait with negative duration
      const invalidWait = validateNodeConfig('WAIT', {
        durationValue: -10,
      });
      expect(invalidWait.valid).toBe(false);

      // Unknown node type
      const unknownType = validateNodeConfig('NON_EXISTENT', {});
      expect(unknownType.valid).toBe(false);
    });
  });

  // ==========================================================================
  // 5. NODE ICON COMPONENT
  // ==========================================================================
  describe('NodeIcon Component', () => {
    it('should render mapped Lucide icons without throwing', () => {
      const { container } = render(<NodeIcon name="MessageSquare" className="w-5 h-5 text-emerald-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
      expect(svg?.classList.contains('w-5')).toBe(true);
    });

    it('should fallback gracefully to DefaultIcon for unknown icon name', () => {
      const { container } = render(<NodeIcon name="NonExistentIconNameXYZ" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
    });
  });

  // ==========================================================================
  // 6. NODE LIBRARY UI COMPONENT
  // ==========================================================================
  describe('NodeLibrary Left Panel Component', () => {
    it('should render search input, category filters, and node count', () => {
      render(<NodeLibrary />);

      expect(screen.getByPlaceholderText('Search triggers, actions, AI...')).toBeDefined();
      expect(screen.getByText('35 / 35 nodes')).toBeDefined();

      // Check category pills
      expect(screen.getByRole('button', { name: 'All' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Triggers' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Conditions' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Actions' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'AI' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Utilities' })).toBeDefined();
    });

    it('should filter items when category pill is clicked', () => {
      render(<NodeLibrary />);

      const triggersPill = screen.getByRole('button', { name: 'Triggers' });
      fireEvent.click(triggersPill);

      expect(screen.getByText('9 / 35 nodes')).toBeDefined();
      expect(screen.getByText('New WhatsApp Message')).toBeDefined();
      expect(screen.queryByText('Send WhatsApp Message')).toBeNull();
    });

    it('should filter items when search query is typed', () => {
      render(<NodeLibrary />);

      const searchInput = screen.getByPlaceholderText('Search triggers, actions, AI...');
      fireEvent.change(searchInput, { target: { value: 'keyword' } });

      expect(screen.getByText('Keyword Match')).toBeDefined();
      expect(screen.queryByText('Send WhatsApp Message')).toBeNull();
    });

    it('should fire onAddNode when an implemented node is clicked', () => {
      const handleAddNode = vi.fn();
      render(<NodeLibrary onAddNode={handleAddNode} />);

      const nodeCard = screen.getByTestId('node-card-NEW_WHATSAPP_MESSAGE');
      fireEvent.click(nodeCard);

      expect(handleAddNode).toHaveBeenCalledTimes(1);
      expect(handleAddNode).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NEW_WHATSAPP_MESSAGE',
          label: 'New WhatsApp Message',
        })
      );
    });

    it('should NOT fire onAddNode when an unimplemented node is clicked', () => {
      const handleAddNode = vi.fn();
      render(<NodeLibrary onAddNode={handleAddNode} />);

      const callCard = screen.getByTestId('node-card-INCOMING_CALL');
      expect(callCard.textContent).toContain('Soon');

      fireEvent.click(callCard);
      expect(handleAddNode).not.toHaveBeenCalled();
    });

    it('should set drag payload with application/reactflow on drag start for implemented node', () => {
      render(<NodeLibrary />);

      const nodeCard = screen.getByTestId('node-card-SEND_WHATSAPP_MESSAGE');
      const mockSetData = vi.fn();

      fireEvent.dragStart(nodeCard, {
        dataTransfer: {
          setData: mockSetData,
          effectAllowed: 'move',
        },
      });

      expect(mockSetData).toHaveBeenCalledWith(
        'application/reactflow',
        expect.stringContaining('SEND_WHATSAPP_MESSAGE')
      );
    });
  });
});
