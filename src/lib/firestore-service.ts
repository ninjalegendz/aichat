
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
import type { Ticket, Message } from './types';

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
    if (!data.hasOwnProperty('summary')) { // Only update timestamp if not updating summary to avoid race conditions
        updateData.lastUpdate = serverTimestamp();
    }
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
