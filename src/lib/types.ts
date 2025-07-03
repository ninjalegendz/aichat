
export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  createdAt: string;
};

export type Ticket = {
  id:string;
  messages: Message[];
  status: 'ai' | 'agent' | 'closed';
  lastUpdate: string;
  summary?: string;
  customer: {
    name: string;
    avatar: string;
  };
  notes?: string;
  orderNumber?: string;
};
