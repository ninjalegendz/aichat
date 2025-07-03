
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  FirestoreDataConverter,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Ticket, Message, Settings } from './types';

// Firestore data converter to handle Timestamp conversions
const ticketConverter: FirestoreDataConverter<Ticket> = {
  toFirestore: (ticket: Ticket) => {
    // The serverTimestamp will be handled in the specific functions
    return ticket;
  },
  fromFirestore: (snapshot, options): Ticket => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      messages: [], // Messages are handled in a subcollection
      status: data.status,
      summary: data.summary,
      customer: data.customer,
      lastUpdate: (data.lastUpdate as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
      notes: data.notes,
      orderNumber: data.orderNumber,
    };
  },
};

export async function getOrCreateTicket(ticketId: string): Promise<Ticket> {
  const ticketRef = doc(db, 'tickets', ticketId);
  const ticketSnap = await getDoc(ticketRef);

  if (ticketSnap.exists()) {
    const data = ticketSnap.data();
     return {
      id: ticketSnap.id,
      ...data,
      lastUpdate: (data.lastUpdate as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    } as Ticket;
  } else {
    const newTicketData = {
      status: 'ai',
      lastUpdate: serverTimestamp(),
      customer: {
        name: `Customer ${ticketId.substring(0, 4)}`,
        avatar: `https://placehold.co/40x40/64B5F6/FFFFFF/png?text=C`,
      },
      summary: 'New conversation',
      notes: '',
      orderNumber: '',
    };
    await setDoc(ticketRef, newTicketData);
    return {
        id: ticketId,
        messages: [],
        ...newTicketData,
        lastUpdate: new Date().toISOString(), // initial client-side value
    } as Ticket
  }
}

export async function addMessage(ticketId: string, message: Omit<Message, 'id' | 'createdAt'>): Promise<void> {
    const messagesCol = collection(db, `tickets/${ticketId}/messages`);
    await addDoc(messagesCol, {
        ...message,
        createdAt: serverTimestamp(),
    });
    const ticketRef = doc(db, 'tickets', ticketId);
    await updateDoc(ticketRef, {
        lastUpdate: serverTimestamp(),
    });
}

export async function updateTicket(ticketId: string, data: Partial<Omit<Ticket, 'id' | 'messages'>>): Promise<void> {
    const ticketRef = doc(db, 'tickets', ticketId);
    const updateData: any = {...data};
    // Don't update lastUpdate automatically on every change, 
    // let specific actions decide if they should.
    // e.g. adding a message should, but editing notes might not.
    await updateDoc(ticketRef, updateData);
}


export async function getMessages(ticketId: string): Promise<Message[]> {
  const messagesCol = collection(db, `tickets/${ticketId}/messages`);
  const q = query(messagesCol, orderBy('createdAt', 'asc'));
  const messagesSnapshot = await getDocs(q);
  return messagesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
      } as Message
  });
}

const DEFAULT_SETTINGS: Settings = {
    agentName: 'Support Agent',
    agentAvatar: `https://placehold.co/40x40/1E88E5/FFFFFF/png?text=S`,
    systemPrompt: `You are ShopAssist AI, a friendly and empathetic customer support agent. Your primary goal is to understand the customer's problem and gather all necessary details for a human agent to resolve the issue efficiently. Be polite and patient. If the user is reporting a problem, express empathy. Ask for their order number if relevant. If they are describing a visual issue, ask them to upload a screenshot or photo. If they are talking about payments, ask for a proof of payment PDF. Collect all information before concluding the conversation. Do not answer questions that are not related to customer support.`,
    knowledgeBase: `
ShopAssist AI FAQ:
Q: How do I track my order?
A: You can track your order by visiting the 'Track Order' page on our website and entering your order number and email address.
Q: What is your return policy?
A: We accept returns within 30 days of purchase. The item must be unused and in its original packaging. Please visit our 'Returns' page to initiate a return.
Q: How can I contact customer support?
A: You can contact us via this chat, or email us at support@example.com. Our support hours are 9 AM to 5 PM, Monday to Friday.
`
};

export async function getSettings(): Promise<Settings> {
    const settingsRef = doc(db, 'settings', 'global');
    const settingsSnap = await getDoc(settingsRef);

    if (settingsSnap.exists()) {
        return settingsSnap.data() as Settings;
    } else {
        await setDoc(settingsRef, DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
    }
}

export async function updateSettings(data: Partial<Settings>): Promise<void> {
    const settingsRef = doc(db, 'settings', 'global');
    await updateDoc(settingsRef, data);
}
