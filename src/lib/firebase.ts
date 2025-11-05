import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import type { UIElement, UIFlow } from './types';

// IMPORTANT: Add your Firebase project configuration to a .env.local file in the root of your project.
// e.g. NEXT_PUBLIC_FIREBASE_API_KEY=AI...
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// For the purpose of this application, we'll use a static user ID.
// In a real-world scenario, you would get this from the authenticated user.
let currentUserId = 'static-user'; 

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
  }
});

export const signIn = async () => {
    if (auth.currentUser) return;
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Anonymous sign-in failed", error);
    }
};

const getElementsCollection = () => {
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    if (!appId) throw new Error("Missing NEXT_PUBLIC_FIREBASE_APP_ID in .env.local");
    return collection(db, 'artifacts', appId, 'users', currentUserId, 'elements');
}

const getFlowsCollection = () => {
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    if (!appId) throw new Error("Missing NEXT_PUBLIC_FIREBASE_APP_ID in .env.local");
    return collection(db, 'artifacts', appId, 'users', currentUserId, 'flows');
}

export const getElements = (callback: (elements: UIElement[]) => void) => {
  try {
    return onSnapshot(getElementsCollection(), (snapshot) => {
      const elements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UIElement));
      callback(elements);
    }, () => callback([]));
  } catch(e) { callback([]); return () => {}; }
};

export const getFlows = (callback: (flows: UIFlow[]) => void) => {
    try {
        return onSnapshot(getFlowsCollection(), (snapshot) => {
            const flows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UIFlow));
            callback(flows);
        }, () => callback([]));
    } catch(e) { callback([]); return () => {}; }
};

export const addElement = (elementData: Omit<UIElement, 'id' | 'createdAt'>) => {
  return addDoc(getElementsCollection(), { ...elementData, createdAt: serverTimestamp() });
};

export const updateElement = (id: string, elementData: Partial<Omit<UIElement, 'id'>>) => {
  const elementDoc = doc(db, getElementsCollection().path, id);
  return updateDoc(elementDoc, elementData);
};

export const deleteElement = (id: string) => {
  const elementDoc = doc(db, getElementsCollection().path, id);
  return deleteDoc(elementDoc);
};

export const addFlow = (flowData: Omit<UIFlow, 'id'>) => {
  return addDoc(getFlowsCollection(), flowData);
};

export const updateFlow = (id: string, flowData: Partial<Omit<UIFlow, 'id'>>) => {
  const flowDoc = doc(db, getFlowsCollection().path, id);
  return updateDoc(flowDoc, flowData);
};

export const deleteFlow = (id: string) => {
  const flowDoc = doc(db, getFlowsCollection().path, id);
  return deleteDoc(flowDoc);
};

export const exportData = (elements: UIElement[], flows: UIFlow[]) => {
  const data = {
    elements: elements.map(({ x, y, fx, fy, ...el }) => {
        const { createdAt, ...rest } = el;
        const serializableCreatedAt = createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : createdAt;
        return { ...rest, createdAt: serializableCreatedAt };
    }),
    flows: flows,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flowverse-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const importData = async (jsonData: string) => {
    const { elements, flows } = JSON.parse(jsonData);

    if (!Array.isArray(elements) || !Array.isArray(flows)) {
        throw new Error("Invalid JSON format");
    }

    const batch = writeBatch(db);

    const existingElementsSnap = await getDocs(getElementsCollection());
    existingElementsSnap.forEach(doc => batch.delete(doc.ref));
    const existingFlowsSnap = await getDocs(getFlowsCollection());
    existingFlowsSnap.forEach(doc => batch.delete(doc.ref));

    const idMap: { [key: string]: string } = {};
    for (const el of elements) {
      const oldId = el.id;
      const newDocRef = doc(getElementsCollection());
      const { id, ...data } = el; 
      batch.set(newDocRef, { ...data, createdAt: Timestamp.fromDate(new Date(data.createdAt)) });
      idMap[oldId] = newDocRef.id;
    }

    for (const flow of flows) {
        const newDocRef = doc(getFlowsCollection());
        const newElementIds = flow.elementIds.map((oldId: string) => idMap[oldId]).filter(Boolean);
        batch.set(newDocRef, { name: flow.name, elementIds: newElementIds });
    }

    await batch.commit();
};

export const addSampleData = async () => {
    const elementsSnap = await getDocs(getElementsCollection());
    if (!elementsSnap.empty) return;

    const batch = writeBatch(db);

    const loginElRef = doc(getElementsCollection());
    batch.set(loginElRef, { name: 'Login Dialog', isBuggy: false, bugDetails: '', mediaLink: '', createdAt: serverTimestamp() });

    const dashboardElRef = doc(getElementsCollection());
    batch.set(dashboardElRef, { name: 'Dashboard', isBuggy: true, bugDetails: 'Metrics not loading correctly.', mediaLink: '', createdAt: serverTimestamp() });

    const settingsElRef = doc(getElementsCollection());
    batch.set(settingsElRef, { name: 'Settings Page', isBuggy: false, bugDetails: '', mediaLink: '', createdAt: serverTimestamp() });
    
    const profileElRef = doc(getElementsCollection());
    batch.set(profileElRef, { name: 'User Profile', isBuggy: false, bugDetails: '', mediaLink: '', createdAt: serverTimestamp() });

    const flow1Ref = doc(getFlowsCollection());
    batch.set(flow1Ref, { name: 'User Login', elementIds: [loginElRef.id, dashboardElRef.id] });
    
    const flow2Ref = doc(getFlowsCollection());
    batch.set(flow2Ref, { name: 'Profile Update', elementIds: [dashboardElRef.id, settingsElRef.id, profileElRef.id] });

    await batch.commit();
};

export { db, auth };
