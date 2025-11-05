
"use client";

import type { UIElement, UIFlow } from './types';
import { Timestamp } from "firebase/firestore"; // Still needed for type consistency until fully removed.

// --- Helper Functions ---

const getElementsFromStorage = (): UIElement[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('flowverse-elements');
  return data ? JSON.parse(data) : [];
};

const saveElementsToStorage = (elements: UIElement[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('flowverse-elements', JSON.stringify(elements));
  window.dispatchEvent(new Event('storage'));
};

const getFlowsFromStorage = (): UIFlow[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('flowverse-flows');
  // Backwards compatibility for old data structure
  const flows = data ? JSON.parse(data) : [];
  return flows.map((flow: any) => {
    if (flow.elementIds && !flow.paths) {
      return { ...flow, paths: [flow.elementIds], elementIds: undefined };
    }
    return flow;
  });
};

const saveFlowsToStorage = (flows: UIFlow[]) => {
    if (typeof window === 'undefined') return;
  localStorage.setItem('flowverse-flows', JSON.stringify(flows));
  window.dispatchEvent(new Event('storage'));
};

// --- Mock Firestore-like API ---

// We don't need sign-in for local storage
export const signIn = async () => {
  return Promise.resolve();
};

export const getElements = (callback: (elements: UIElement[]) => void) => {
    if (typeof window === 'undefined') {
        callback([]);
        return () => {};
    }

    const handleStorageChange = () => {
        callback(getElementsFromStorage());
    };

    window.addEventListener('storage', handleStorageChange);
    callback(getElementsFromStorage()); // Initial call

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
};

export const getFlows = (callback: (flows: UIFlow[]) => void) => {
    if (typeof window === 'undefined') {
        callback([]);
        return () => {};
    }
    const handleStorageChange = () => {
        callback(getFlowsFromStorage());
    };

    window.addEventListener('storage', handleStorageChange);
    callback(getFlowsFromStorage()); // Initial call

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
};

export const addElement = (elementData: Omit<UIElement, 'id' | 'createdAt'>) => {
  const elements = getElementsFromStorage();
  const newElement: UIElement = {
    ...elementData,
    id: new Date().getTime().toString(), // Simple unique ID
    // @ts-ignore
    createdAt: { toDate: () => new Date() } // Mock Timestamp for type consistency
  };
  saveElementsToStorage([...elements, newElement]);
  return Promise.resolve();
};

export const updateElement = (id: string, elementData: Partial<Omit<UIElement, 'id'>>) => {
  const elements = getElementsFromStorage();
  const updatedElements = elements.map(el => el.id === id ? { ...el, ...elementData } : el);
  saveElementsToStorage(updatedElements);
  return Promise.resolve();
};

export const deleteElement = (id: string) => {
  const elements = getElementsFromStorage();
  const updatedElements = elements.filter(el => el.id !== id);
  saveElementsToStorage(updatedElements);

  // Also remove this element from any flows that use it
  const flows = getFlowsFromStorage();
  const updatedFlows = flows.map(flow => ({
    ...flow,
    paths: flow.paths.map(path => path.filter(elId => elId !== id)).filter(path => path.length > 0)
  })).filter(flow => flow.paths.length > 0); // Optional: remove flows that become empty
  saveFlowsToStorage(updatedFlows);
  
  return Promise.resolve();
};

export const addFlow = (flowData: Omit<UIFlow, 'id'>) => {
  const flows = getFlowsFromStorage();
  const newFlow: UIFlow = {
    ...flowData,
    id: new Date().getTime().toString(),
  };
  saveFlowsToStorage([...flows, newFlow]);
  return Promise.resolve();
};

export const updateFlow = (id: string, flowData: Partial<Omit<UIFlow, 'id'>>) => {
  const flows = getFlowsFromStorage();
  const updatedFlows = flows.map(f => f.id === id ? { ...f, ...flowData } : f);
  saveFlowsToStorage(updatedFlows);
  return Promise.resolve();
};

export const deleteFlow = (id: string) => {
  const flows = getFlowsFromStorage();
  const updatedFlows = flows.filter(f => f.id !== id);
  saveFlowsToStorage(updatedFlows);
  return Promise.resolve();
};

export const exportData = (elements: UIElement[], flows: UIFlow[]) => {
    const serializableElements = elements.map(({ x, y, fx, fy, ...el }) => {
        const { createdAt, ...rest } = el;
        // @ts-ignore
        const serializableCreatedAt = createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString();
        return { ...rest, createdAt: serializableCreatedAt };
    });

    const data = {
        elements: serializableElements,
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

    const idMap: { [key: string]: string } = {};
    const newElements: UIElement[] = elements.map((el: any) => {
        const oldId = el.id;
        const newId = new Date().getTime().toString() + Math.random();
        idMap[oldId] = newId;
        return { 
            ...el, 
            id: newId,
            // @ts-ignore
            createdAt: { toDate: () => new Date(el.createdAt) }
        };
    });

    const newFlows: UIFlow[] = flows.map((flow: any) => {
        let paths: string[][];
        if (flow.elementIds) { // Handle old format
            paths = [flow.elementIds.map((oldId: string) => idMap[oldId]).filter(Boolean)];
        } else {
            paths = flow.paths.map((path: string[]) => path.map((oldId: string) => idMap[oldId]).filter(Boolean));
        }

        return {
            ...flow,
            id: new Date().getTime().toString() + Math.random(),
            paths: paths.filter(path => path.length > 0),
        }
    }).filter((flow: UIFlow) => flow.paths.length > 0);

    saveElementsToStorage(newElements);
    saveFlowsToStorage(newFlows);

    return Promise.resolve();
};


export const addSampleData = () => {
    const elements = getElementsFromStorage();
    const flows = getFlowsFromStorage();

    if (elements.length > 0 || flows.length > 0) return;

    const loginEl: UIElement = {
        id: '1',
        name: 'Login Dialog',
        isBuggy: false,
        bugDetails: '',
        mediaLink: '',
        // @ts-ignore
        createdAt: { toDate: () => new Date() }
    };
    const dashboardEl: UIElement = {
        id: '2',
        name: 'Dashboard',
        isBuggy: true,
        bugDetails: 'Metrics not loading correctly.',
        mediaLink: 'bug-placeholder',
        // @ts-ignore
        createdAt: { toDate: () => new Date() }
    };
    const settingsEl: UIElement = {
        id: '3',
        name: 'Settings Page',
        isBuggy: false,
        bugDetails: '',
        mediaLink: '',
        // @ts-ignore
        createdAt: { toDate: () => new Date() }
    };
    const profileEl: UIElement = {
        id: '4',
        name: 'User Profile',
        isBuggy: false,
        bugDetails: '',
        mediaLink: '',
        // @ts-ignore
        createdAt: { toDate: () => new Date() }
    };
     const forgotPasswordEl: UIElement = {
        id: '5',
        name: 'Forgot Password',
        isBuggy: false,
        bugDetails: '',
        mediaLink: '',
        // @ts-ignore
        createdAt: { toDate: () => new Date() }
    };


    const sampleElements = [loginEl, dashboardEl, settingsEl, profileEl, forgotPasswordEl];

    const sampleFlows: UIFlow[] = [
        { id: '101', name: 'User Login', paths: [[loginEl.id, dashboardEl.id], [forgotPasswordEl.id, loginEl.id]], group: "Onboarding" },
        { id: '102', name: 'Profile Update', paths: [[dashboardEl.id, settingsEl.id, profileEl.id]], group: "User Management" },
        { id: '103', name: 'View Settings', paths: [[dashboardEl.id, settingsEl.id]], group: "User Management" },
    ];
    
    saveElementsToStorage(sampleElements);
    saveFlowsToStorage(sampleFlows);
};
