
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  createdAt: string;
  replyTo?: {
    messageId: string;
    content: string;
    role: 'user' | 'assistant' | 'agent';
  }
};

export type Ticket = {
  id:string;
  messages: Message[];
  status: 'ai' | 'agent' | 'closed' | 'needs-attention';
  lastUpdate: string;
  summary?: string;
  customer: {
    name: string;
    avatar: string;
  };
  notes?: string;
  orderNumber?: string;
};

export type Settings = {
    agentName: string;
    agentAvatar: string;
    systemPrompt: string;
    knowledgeBase: string;
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    brandLogoUrl?: string;
    // Bubble Colors
    userBubbleColor?: string;
    userBubbleTextColor?: string;
    agentBubbleColor?: string;
    agentBubbleTextColor?: string;
    assistantBubbleColor?: string;
    assistantBubbleTextColor?: string;
    quickReplies?: {
        id: string;
        text: string;
    }[];
};
