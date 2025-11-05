
"use client";

import type { UIElement, UIScenario } from './types';
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

const getScenariosFromStorage = (): UIScenario[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('flowverse-flows'); // Reverted from 'scenarios' to 'flows'
  // Backwards compatibility for old data structure
  const scenarios = data ? JSON.parse(data) : [];
  return scenarios.map((scenario: any) => {
    if (scenario.elementIds && !scenario.methods) {
      return { ...scenario, methods: [scenario.elementIds], elementIds: undefined };
    }
    if (scenario.paths && !scenario.methods) { // Still handle 'paths' for migration
      return { ...scenario, methods: scenario.paths, paths: undefined };
    }
    return scenario;
  });
};

const saveScenariosToStorage = (scenarios: UIScenario[]) => {
    if (typeof window === 'undefined') return;
  localStorage.setItem('flowverse-flows', JSON.stringify(scenarios)); // Reverted from 'scenarios' to 'flows'
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

export const getScenarios = (callback: (scenarios: UIScenario[]) => void) => {
    if (typeof window === 'undefined') {
        callback([]);
        return () => {};
    }
    const handleStorageChange = () => {
        callback(getScenariosFromStorage());
    };

    window.addEventListener('storage', handleStorageChange);
    callback(getScenariosFromStorage()); // Initial call

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

  // Also remove this element from any scenarios that use it
  const scenarios = getScenariosFromStorage();
  const updatedScenarios = scenarios.map(scenario => ({
    ...scenario,
    methods: scenario.methods.map(method => method.filter(elId => elId !== id)).filter(method => method.length > 0)
  })).filter(scenario => scenario.methods.length > 0); // Optional: remove scenarios that become empty
  saveScenariosToStorage(updatedScenarios);
  
  return Promise.resolve();
};

export const addScenario = (scenarioData: Omit<UIScenario, 'id'>) => {
  const scenarios = getScenariosFromStorage();
  const newScenario: UIScenario = {
    ...scenarioData,
    id: new Date().getTime().toString(),
  };
  saveScenariosToStorage([...scenarios, newScenario]);
  return Promise.resolve();
};

export const updateScenario = (id: string, scenarioData: Partial<Omit<UIScenario, 'id'>>) => {
  const scenarios = getScenariosFromStorage();
  const updatedScenarios = scenarios.map(f => f.id === id ? { ...f, ...scenarioData } : f);
  saveScenariosToStorage(updatedScenarios);
  return Promise.resolve();
};

export const deleteScenario = (id: string) => {
  const scenarios = getScenariosFromStorage();
  const updatedScenarios = scenarios.filter(f => f.id !== id);
  saveScenariosToStorage(updatedScenarios);
  return Promise.resolve();
};

export const exportData = (elements: UIElement[], scenarios: UIScenario[]) => {
    const serializableElements = elements.map(({ x, y, fx, fy, ...el }) => {
        const { createdAt, ...rest } = el;
        // @ts-ignore
        const serializableCreatedAt = createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString();
        return { ...rest, createdAt: serializableCreatedAt };
    });

    const data = {
        elements: serializableElements,
        flows: scenarios, // Use 'flows' on export for backward compatibility
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scenarioverse-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const importData = async (jsonData: string) => {
    const { elements, scenarios, flows } = JSON.parse(jsonData);

    const importedElements = elements || [];
    const importedScenarios = scenarios || flows || [];


    if (!Array.isArray(importedElements) || !Array.isArray(importedScenarios)) {
        throw new Error("Invalid JSON format");
    }

    const idMap: { [key: string]: string } = {};
    const newElements: UIElement[] = importedElements.map((el: any) => {
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

    const newScenarios: UIScenario[] = importedScenarios.map((scenario: any) => {
        let methods: string[][];
        if (scenario.elementIds) { // Handle old format 'elementIds'
            methods = [scenario.elementIds.map((oldId: string) => idMap[oldId]).filter(Boolean)];
        } else if (scenario.paths) { // Handle intermediate format 'paths'
            methods = scenario.paths.map((path: string[]) => path.map((oldId: string) => idMap[oldId]).filter(Boolean));
        } else { // Handle new format 'methods'
            methods = (scenario.methods || []).map((method: string[]) => method.map((oldId: string) => idMap[oldId]).filter(Boolean));
        }


        return {
            ...scenario,
            id: new Date().getTime().toString() + Math.random(),
            methods: methods.filter(method => method.length > 0),
        }
    }).filter((scenario: UIScenario) => scenario.methods.length > 0);

    saveElementsToStorage(newElements);
    saveScenariosToStorage(newScenarios);

    // Clean up old storage items if they exist
    localStorage.removeItem('flowverse-flows');
    localStorage.removeItem('flowverse-scenarios');
    localStorage.removeItem('flowverse-elements');
    
    // Save with the correct keys
    saveElementsToStorage(newElements);
    saveScenariosToStorage(newScenarios);


    return Promise.resolve();
};


export const addSampleData = () => {
    const elements = getElementsFromStorage();
    const scenarios = getScenariosFromStorage();

    if (elements.length > 0 || scenarios.length > 0) return;

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

    const sampleScenarios: UIScenario[] = [
        { id: '101', name: 'User Login', methods: [[loginEl.id, dashboardEl.id], [forgotPasswordEl.id, loginEl.id]], group: "Onboarding" },
        { id: '102', name: 'Profile Update', methods: [[dashboardEl.id, settingsEl.id, profileEl.id]], group: "User Management" },
        { id: '103', name: 'View Settings', methods: [[dashboardEl.id, settingsEl.id]], group: "User Management" },
    ];
    
    saveElementsToStorage(sampleElements);
    saveScenariosToStorage(sampleScenarios);
};

    