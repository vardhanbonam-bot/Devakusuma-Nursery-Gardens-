import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch, onSnapshot } from "firebase/firestore";
import config from "../../firebase-applet-config.json";

// Initialize Firebase
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to the specific custom database ID provided in config
export const db = getFirestore(app, config.firestoreDatabaseId || "(default)");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {}, // No standard Auth used in this app, as it uses organic PIN authentication
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generic sync helper to fetch collection data
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as T);
    });
    return items;
  } catch (error) {
    console.error(`Error loading collection ${collectionName} from Firestore:`, error);
    handleFirestoreError(error, OperationType.GET, collectionName);
  }
}

// Generic sync helper to save/update an item in a collection
export async function saveItem(collectionName: string, id: string, data: any): Promise<void> {
  const path = `${collectionName}/${id}`;
  try {
    // Avoid writing undefined values
    const cleanData = JSON.parse(JSON.stringify(data));
    // Remove id from payload as it's the document key
    if (cleanData.id) delete cleanData.id;
    await setDoc(doc(db, collectionName, id), cleanData);
  } catch (error) {
    console.error(`Error saving item ${id} to collection ${collectionName}:`, error);
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Generic sync helper to delete an item
export async function removeItem(collectionName: string, id: string): Promise<void> {
  const path = `${collectionName}/${id}`;
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error(`Error removing item ${id} from collection ${collectionName}:`, error);
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Clear whole collection (for reset)
export async function clearCollection(collectionName: string, ids: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      batch.delete(doc(db, collectionName, id));
    });
    await batch.commit();
  } catch (error) {
    console.error(`Error clearing collection ${collectionName}:`, error);
    handleFirestoreError(error, OperationType.DELETE, collectionName);
  }
}

// Generic real-time subscription helper to stream snapshot updates
export function subscribeCollection<T>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  onError?: (error: any) => void
): () => void {
  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as T);
      });
      onUpdate(items);
    },
    (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
      if (onError) onError(error);
    }
  );
}
