
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getElements,
  getScenarios,
  addElement,
  updateElement,
  addScenario,
  updateScenario,
  signIn,
  addSampleData,
  exportData as exportDataFromLocalStorage,
  importData as importDataFromLocalStorage,
  deleteScenario,
  deleteElement,
} from '@/lib/localStorage';
import type { UIElement, UIScenario } from '@/lib/types';
import D3Graph from '@/components/d3-graph';
import { Header } from '@/components/header';
import { Dashboard } from '@/components/dashboard';
import ElementModal from '@/components/modals/element-modal';
import ScenarioModal from '@/components/modals/scenario-modal';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableView } from '@/components/table-view';

type ModalState<T> = { open: boolean; data?: T | null; mode?: 'add' | 'edit' | 'view' };

export default function Home() {
  const [elements, setElements] = useState<UIElement[]>([]);
  const [scenarios, setScenarios] = useState<UIScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const dataInitialized = useRef(false);

  const { toast } = useToast();

  const [elementModal, setElementModal] = useState<ModalState<UIElement>>({ open: false, mode: 'add' });
  const [scenarioModal, setScenarioModal] = useState<ModalState<UIScenario>>({ open: false, mode: 'add' });

  useEffect(() => {
    // No-op, but keeps structure, ensure it doesn't try to connect if no config
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      signIn();
    }

    const unsubscribeElements = getElements((data) => {
      setElements(data);
      if (!dataInitialized.current) {
        checkAndInitData(data, getScenariosFromStorage());
      }
      setLoading(false);
    });

    const unsubscribeScenarios = getScenarios((data) => {
      setScenarios(data);
       if (!dataInitialized.current) {
        checkAndInitData(getElementsFromStorage(), data);
      }
    });

    return () => {
      unsubscribeElements();
      unsubscribeScenarios();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Helper to get scenarios synchronously for the initial check
  const getScenariosFromStorage = (): UIScenario[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('flowverse-flows');
    return data ? JSON.parse(data).map((scenario: any) => {
      if (scenario.elementIds && !scenario.methods) {
        return { ...scenario, methods: [scenario.elementIds], elementIds: undefined };
      }
      if (scenario.paths && !scenario.methods) {
        return { ...scenario, methods: scenario.paths, paths: undefined };
      }
      return scenario;
    }) : [];
  };
  
  // Helper to get elements synchronously for the initial check
  const getElementsFromStorage = (): UIElement[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('flowverse-elements');
    return data ? JSON.parse(data) : [];
  };


  const checkAndInitData = (currentElements: UIElement[], currentScenarios: UIScenario[]) => {
    if (!dataInitialized.current && currentElements.length === 0 && currentScenarios.length > 0) {
        // This case can happen if scenarios exist but elements don't, which is unlikely but possible.
        // We still want to initialize sample data to have a consistent state.
    }
    if (!dataInitialized.current && currentElements.length === 0 && (!currentScenarios || currentScenarios.length === 0)) {
        addSampleData();
        toast({ title: "Welcome!", description: "We've added some sample data to get you started." });
        dataInitialized.current = true;
    }
  };

  const handleNodeClick = useCallback((element: UIElement) => {
    setElementModal({ open: true, data: element, mode: 'view' });
  }, []);

  const handleExportData = () => {
    exportDataFromLocalStorage(elements, scenarios);
    toast({ title: "Success", description: "Data exported successfully." });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string;
          await importDataFromLocalStorage(json);
          toast({ title: "Success", description: "Data imported successfully. The graph will update." });

        } catch (error: any) {
          toast({ variant: "destructive", title: "Import Error", description: error.message });
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset file input
    }
  };

  const handleEditScenario = (scenario: UIScenario) => {
    setScenarioModal({ open: true, data: scenario, mode: 'edit' });
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    if (window.confirm("Are you sure you want to delete this scenario?")) {
      try {
        await deleteScenario(scenarioId);
        toast({ title: "Success", description: "Scenario deleted." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  };

  const handleDeleteElement = async (elementId: string) => {
    if (window.confirm("Are you sure you want to delete this element? This will also remove it from any scenarios it's a part of.")) {
      try {
        await deleteElement(elementId);
        toast({ title: "Success", description: "Element deleted." });
        setElementModal({ open: false });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  };

  const handleAddNewElementFromScenario = () => {
    setScenarioModal({ ...scenarioModal, open: false });
    setElementModal({ open: true, data: null, mode: 'add' });
  };

  const handleBulkUpdate = async (type: 'elements' | 'scenarios', data: any[]) => {
     if (type === 'elements') {
        const updates = data.map(item => {
            const existing = elements.find(e => e.id === item.id);
            const payload = {
                name: item.name,
                isBuggy: item.isBuggy || false,
                bugDetails: item.bugDetails || '',
                mediaLink: item.mediaLink || ''
            };
            if (existing) {
                return updateElement(existing.id, payload);
            } else {
                return addElement(payload);
            }
        });
        await Promise.all(updates);
        toast({ title: 'Success', description: 'Elements updated.' });
    } else if (type === 'scenarios') {
        const updates = data.map(item => {
            const existing = scenarios.find(f => f.id === item.id);

             const methods = item.methods.map((method: string[]) => {
                return method.map((nameOrId: string) => {
                    const el = elements.find(e => e.name.toLowerCase() === nameOrId.toLowerCase().trim() || e.id === nameOrId);
                    return el ? el.id : null;
                }).filter((id): id is string => id !== null);
            }).filter((method: string[]) => method.length > 0);

            if (methods.length === 0 && item.methods.length > 0) {
                 toast({ variant: 'destructive', title: 'Scenario Error', description: `Could not find elements for scenario "${item.name}". Please check element names.` });
                 return Promise.resolve(); // Skip this one
            }
            
            const payload = {
                name: item.name,
                group: item.group || '',
                methods: methods,
            };

            if (existing) {
                return updateScenario(existing.id, payload);
            } else {
                return addScenario(payload);
            }
        });
        await Promise.all(updates);
        toast({ title: 'Success', description: 'Scenarios updated.' });
    }
  };
  
  const renderContent = () => {
    if (loading && elements.length === 0) {
        return (
          <div className="flex items-center justify-center h-full">
             <Skeleton className="w-[80%] h-[80%] rounded-lg" />
          </div>
        );
    }

    return (
        <Tabs defaultValue="graph" className="w-full h-full flex flex-col">
            <div className="flex justify-center border-b">
                <TabsList>
                    <TabsTrigger value="graph">Graph</TabsTrigger>
                    <TabsTrigger value="table">Table</TabsTrigger>
                </TabsList>
            </div>
            <TabsContent value="graph" className="flex-1 overflow-hidden relative">
                 <D3Graph elements={elements} scenarios={scenarios} onNodeClick={handleNodeClick} />
            </TabsContent>
            <TabsContent value="table" className="flex-1 overflow-auto p-4">
                <TableView 
                    elements={elements} 
                    scenarios={scenarios} 
                    onBulkUpdate={handleBulkUpdate} 
                />
            </TabsContent>
        </Tabs>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header onExport={handleExportData} onImport={handleImportData} />
      <main className="flex flex-1 overflow-hidden">
        <Dashboard
          scenarios={scenarios}
          onAddScenario={() => setScenarioModal({ open: true, data: null, mode: 'add' })}
          onEditScenario={handleEditScenario}
          onDeleteScenario={handleDeleteScenario}
          onAddElement={() => setElementModal({ open: true, data: null, mode: 'add' })}
        />
        <div className="flex-1 relative bg-background/50">
          {renderContent()}
        </div>
      </main>

      {elementModal.open && (
        <ElementModal
          isOpen={elementModal.open}
          setIsOpen={(open) => setElementModal({ ...elementModal, open })}
          element={elementModal.data}
          elements={elements}
          mode={elementModal.mode}
          onSave={async (data, id) => {
            const isNameTaken = elements.some(
              (element) => element.name.toLowerCase() === data.name.toLowerCase() && element.id !== id
            );
    
            if (isNameTaken) {
              toast({
                variant: "destructive",
                title: "Duplicate Name",
                description: `An element with the name "${data.name}" already exists.`,
              });
              return;
            }

            try {
              if (id) {
                await updateElement(id, data);
                toast({ title: "Success", description: "Element updated." });
              } else {
                await addElement(data as Omit<UIElement, 'id' | 'createdAt'>);
                toast({ title: "Success", description: "Element added." });
              }
              setElementModal({ open: false });
            } catch (error: any) {
              toast({ variant: "destructive", title: "Error", description: error.message });
            }
          }}
          onDelete={handleDeleteElement}
        />
      )}

      {scenarioModal.open && (
        <ScenarioModal
          isOpen={scenarioModal.open}
          setIsOpen={(open) => setScenarioModal({ ...scenarioModal, open })}
          scenario={scenarioModal.data}
          elements={elements}
          scenarios={scenarios}
          onSave={async (data, id) => {
            const isNameTaken = scenarios.some(
                (scenario) => scenario.name.toLowerCase() === data.name.toLowerCase() && scenario.id !== id
            );

            if (isNameTaken) {
              toast({
                variant: "destructive",
                title: "Duplicate Name",
                description: `A scenario with the name "${data.name}" already exists.`,
              });
              return;
            }
            try {
              if (id) {
                await updateScenario(id, data);
                toast({ title: "Success", description: "Scenario updated." });
              } else {
                await addScenario(data);
                toast({ title: "Success", description: "Scenario added." });
              }
              setScenarioModal({ open: false });
            } catch (error: any) {
              toast({ variant: "destructive", title: "Error", description: error.message });
            }
          }}
          onAddNewElement={handleAddNewElementFromScenario}
        />
      )}
    </div>
  );
}
