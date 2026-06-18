import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
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
    throw error;
  }
}

// Generic sync helper to save/update an item in a collection
export async function saveItem(collectionName: string, id: string, data: any): Promise<void> {
  try {
    // Avoid writing undefined values
    const cleanData = JSON.parse(JSON.stringify(data));
    // Remove id from payload as it's the document key
    if (cleanData.id) delete cleanData.id;
    await setDoc(doc(db, collectionName, id), cleanData);
  } catch (error) {
    console.error(`Error saving item ${id} to collection ${collectionName}:`, error);
    throw error;
  }
}

// Generic sync helper to delete an item
export async function removeItem(collectionName: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error(`Error removing item ${id} from collection ${collectionName}:`, error);
    throw error;
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
    throw error;
  }
}
