
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getElements,
  getFlows,
  addElement,
  updateElement,
  addFlow,
  updateFlow,
  signIn,
  addSampleData,
  exportData as exportDataFromLocalStorage,
  importData as importDataFromLocalStorage,
  deleteFlow,
  deleteElement,
} from '@/lib/localStorage';
import type { UIElement, UIFlow } from '@/lib/types';
import D3Graph from '@/components/d3-graph';
import { Header } from '@/components/header';
import { Dashboard } from '@/components/dashboard';
import ElementModal from '@/components/modals/element-modal';
import FlowModal from '@/components/modals/flow-modal';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableView } from '@/components/table-view';

type ModalState<T> = { open: boolean; data?: T | null; mode?: 'add' | 'edit' | 'view' };

export default function Home() {
  const [elements, setElements] = useState<UIElement[]>([]);
  const [flows, setFlows] = useState<UIFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const dataInitialized = useRef(false);

  const { toast } = useToast();

  const [elementModal, setElementModal] = useState<ModalState<UIElement>>({ open: false, mode: 'add' });
  const [flowModal, setFlowModal] = useState<ModalState<UIFlow>>({ open: false, mode: 'add' });

  useEffect(() => {
    // No-op, but keeps structure, ensure it doesn't try to connect if no config
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      signIn();
    }

    const unsubscribeElements = getElements((data) => {
      setElements(data);
      if (!dataInitialized.current) {
        checkAndInitData(data, getFlowsFromStorage());
      }
      setLoading(false);
    });

    const unsubscribeFlows = getFlows((data) => {
      setFlows(data);
       if (!dataInitialized.current) {
        checkAndInitData(getElementsFromStorage(), data);
      }
    });

    return () => {
      unsubscribeElements();
      unsubscribeFlows();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Helper to get flows synchronously for the initial check
  const getFlowsFromStorage = (): UIFlow[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('flowverse-flows');
    return data ? JSON.parse(data) : [];
  };
  
  // Helper to get elements synchronously for the initial check
  const getElementsFromStorage = (): UIElement[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('flowverse-elements');
    return data ? JSON.parse(data) : [];
  };


  const checkAndInitData = (currentElements: UIElement[], currentFlows: UIFlow[]) => {
    if (!dataInitialized.current && currentElements.length === 0 && currentFlows.length > 0) {
        // This case can happen if flows exist but elements don't, which is unlikely but possible.
        // We still want to initialize sample data to have a consistent state.
    }
    if (!dataInitialized.current && currentElements.length === 0 && (!currentFlows || currentFlows.length === 0)) {
        addSampleData();
        toast({ title: "Welcome!", description: "We've added some sample data to get you started." });
        dataInitialized.current = true;
    }
  };

  const handleNodeClick = useCallback((element: UIElement) => {
    setElementModal({ open: true, data: element, mode: 'view' });
  }, []);

  const handleExportData = () => {
    exportDataFromLocalStorage(elements, flows);
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

  const handleEditFlow = (flow: UIFlow) => {
    setFlowModal({ open: true, data: flow, mode: 'edit' });
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (window.confirm("Are you sure you want to delete this flow?")) {
      try {
        await deleteFlow(flowId);
        toast({ title: "Success", description: "Flow deleted." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  };

  const handleDeleteElement = async (elementId: string) => {
    if (window.confirm("Are you sure you want to delete this element? This will also remove it from any flows it's a part of.")) {
      try {
        await deleteElement(elementId);
        toast({ title: "Success", description: "Element deleted." });
        setElementModal({ open: false });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  };

  const handleAddNewElementFromFlow = () => {
    setFlowModal({ ...flowModal, open: false });
    setElementModal({ open: true, data: null, mode: 'add' });
  };

  const handleBulkUpdate = async (type: 'elements' | 'flows', data: any[]) => {
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
    } else if (type === 'flows') {
        const updates = data.map(item => {
            const existing = flows.find(f => f.id === item.id);

             const paths = item.paths.map((path: string[]) => {
                return path.map((nameOrId: string) => {
                    const el = elements.find(e => e.name.toLowerCase() === nameOrId.toLowerCase().trim() || e.id === nameOrId);
                    return el ? el.id : null;
                }).filter((id): id is string => id !== null);
            }).filter((path: string[]) => path.length > 0);

            if (paths.length === 0 && item.paths.length > 0) {
                 toast({ variant: 'destructive', title: 'Flow Error', description: `Could not find elements for flow "${item.name}". Please check element names.` });
                 return Promise.resolve(); // Skip this one
            }
            
            const payload = {
                name: item.name,
                group: item.group || '',
                paths: paths,
            };

            if (existing) {
                return updateFlow(existing.id, payload);
            } else {
                return addFlow(payload);
            }
        });
        await Promise.all(updates);
        toast({ title: 'Success', description: 'Flows updated.' });
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
                 <D3Graph elements={elements} flows={flows} onNodeClick={handleNodeClick} />
            </TabsContent>
            <TabsContent value="table" className="flex-1 overflow-auto p-4">
                <TableView 
                    elements={elements} 
                    flows={flows} 
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
          flows={flows}
          onAddFlow={() => setFlowModal({ open: true, data: null, mode: 'add' })}
          onEditFlow={handleEditFlow}
          onDeleteFlow={handleDeleteFlow}
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

      {flowModal.open && (
        <FlowModal
          isOpen={flowModal.open}
          setIsOpen={(open) => setFlowModal({ ...flowModal, open })}
          flow={flowModal.data}
          elements={elements}
          flows={flows}
          onSave={async (data, id) => {
            const isNameTaken = flows.some(
                (flow) => flow.name.toLowerCase() === data.name.toLowerCase() && flow.id !== id
            );

            if (isNameTaken) {
              toast({
                variant: "destructive",
                title: "Duplicate Name",
                description: `A flow with the name "${data.name}" already exists.`,
              });
              return;
            }
            try {
              if (id) {
                await updateFlow(id, data);
                toast({ title: "Success", description: "Flow updated." });
              } else {
                await addFlow(data);
                toast({ title: "Success", description: "Flow added." });
              }
              setFlowModal({ open: false });
            } catch (error: any) {
              toast({ variant: "destructive", title: "Error", description: error.message });
            }
          }}
          onAddNewElement={handleAddNewElementFromFlow}
        />
      )}
    </div>
  );
}
