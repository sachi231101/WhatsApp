'use client';

import React from 'react';
import {
  MessageSquare,
  Zap,
  PhoneCall,
  Webhook,
  Calendar,
  MessageSquarePlus,
  UserPlus,
  CornerDownLeft,
  Tag,
  Filter,
  Award,
  Sliders,
  Clock,
  CheckCircle2,
  UserCheck,
  Sparkles,
  Send,
  FileText,
  Image,
  UserCog,
  CheckSquare,
  Mail,
  MessageSquareQuote,
  Bot,
  Smile,
  FileSearch,
  Hourglass,
  HelpCircle,
  Split,
  Workflow,
  HelpCircle as DefaultIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  MessageSquare,
  Zap,
  PhoneCall,
  Webhook,
  Calendar,
  MessageSquarePlus,
  UserPlus,
  CornerDownLeft,
  Tag,
  Filter,
  Award,
  Sliders,
  Clock,
  CheckCircle2,
  UserCheck,
  Sparkles,
  Send,
  FileText,
  Image,
  UserCog,
  CheckSquare,
  Mail,
  MessageSquareQuote,
  Bot,
  Smile,
  FileSearch,
  Hourglass,
  HelpCircle,
  Split,
  Workflow,
};

interface NodeIconProps {
  name: string;
  className?: string;
}

export const NodeIcon: React.FC<NodeIconProps> = ({ name, className = 'w-4 h-4' }) => {
  const IconComponent = ICON_MAP[name] || DefaultIcon;
  return <IconComponent className={className} />;
};
