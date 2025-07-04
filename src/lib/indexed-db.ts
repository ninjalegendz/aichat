
'use client';

const DB_NAME = 'ShopAssistDB';
const STORE_NAME = 'files';
const DB_VERSION = 1;

interface FileRecord {
  id: string;
  data: string; // base64 data url
}

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    
    // IndexedDB may not be available in SSR or service workers
    if (typeof window === 'undefined' || !window.indexedDB) {
        return reject('IndexedDB not supported');
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject('IndexedDB error');
    };
  });
};

export const saveFile = async (file: File): Promise<string> => {
  const db = await initDB();
  const reader = new FileReader();
  const fileId = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const fileRecord: FileRecord = { id: fileId, data: dataUrl };
      const request = store.put(fileRecord);

      request.onsuccess = () => resolve(fileId);
      request.onerror = () => reject(request.error);
    };

    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const getFile = async (id: string): Promise<string | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};
