
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
  exportData as exportDataFromFirebase,
  importData as importDataFromFirebase,
  deleteFlow,
} from '@/lib/firebase';
import type { UIElement, UIFlow } from '@/lib/types';
import D3Graph from '@/components/d3-graph';
import { Header } from '@/components/header';
import { Dashboard } from '@/components/dashboard';
import ElementModal from '@/components/modals/element-modal';
import FlowModal from '@/components/modals/flow-modal';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type ModalState<T> = { open: boolean; data?: T | null; mode?: 'add' | 'edit' | 'view' };

export default function Home() {
  const [elements, setElements] = useState<UIElement[]>([]);
  const [flows, setFlows] = useState<UIFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const dataInitialized = useRef(false);
  const [firebaseConfigured, setFirebaseConfigured] = useState(true);

  const { toast } = useToast();

  const [elementModal, setElementModal] = useState<ModalState<UIElement>>({ open: false, mode: 'add' });
  const [flowModal, setFlowModal] = useState<ModalState<UIFlow>>({ open: false, mode: 'add' });

  useEffect(() => {
    const isConfigured = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    setFirebaseConfigured(!!isConfigured);

    if (!isConfigured) {
      setLoading(false);
      return;
    }

    signIn();

    const unsubscribeElements = getElements((data) => {
      setElements(data);
      checkAndInitData(data, flows);
    });

    const unsubscribeFlows = getFlows((data) => {
      setFlows(data);
      checkAndInitData(elements, data);
    });

    return () => {
      unsubscribeElements();
      unsubscribeFlows();
    };
  }, []);

  const checkAndInitData = (currentElements: UIElement[], currentFlows: UIFlow[]) => {
    if (!dataInitialized.current && currentElements !== null && currentFlows !== null) {
      if (currentElements.length === 0 && currentFlows.length === 0) {
        addSampleData();
        toast({ title: "Welcome!", description: "We've added some sample data to get you started." });
      }
      dataInitialized.current = true;
      setLoading(false);
    }
  };

  const handleNodeClick = useCallback((element: UIElement) => {
    setElementModal({ open: true, data: element, mode: 'view' });
  }, []);

  const handleExportData = () => {
    exportDataFromFirebase(elements, flows);
    toast({ title: "Success", description: "Data exported successfully." });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string;
          await importDataFromFirebase(json);
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
  
  const renderContent = () => {
    if (!firebaseConfigured) {
      return (
        <div className="flex items-center justify-center h-full p-8">
            <Alert variant="destructive" className="max-w-2xl">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Firebase Not Configured</AlertTitle>
              <AlertDescription>
                Your Firebase project credentials are not set up. Please add your project's configuration to a 
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold mx-1">.env.local</code> 
                file in the root of your project to continue.
              </AlertDescription>
            </Alert>
        </div>
      );
    }
    
    if (loading) {
        return (
          <div className="flex items-center justify-center h-full">
             <Skeleton className="w-[80%] h-[80%] rounded-lg" />
          </div>
        );
    }

    return (
        <div className="w-full h-full relative">
            <D3Graph elements={elements} flows={flows} onNodeClick={handleNodeClick} />
            <div className="absolute bottom-4 right-4">
                 <Button onClick={() => setElementModal({ open: true, data: null, mode: 'add' })} disabled={!firebaseConfigured}>
                    <Plus className="mr-2 h-4 w-4" /> Add Element
                </Button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header onExport={handleExportData} onImport={handleImportData} disabled={!firebaseConfigured} />
      <main className="flex flex-1 overflow-hidden">
        <Dashboard
          flows={flows}
          onAddFlow={() => setFlowModal({ open: true, data: null, mode: 'add' })}
          onEditFlow={handleEditFlow}
          onDeleteFlow={handleDeleteFlow}
          disabled={!firebaseConfigured}
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
        />
      )}

      {flowModal.open && (
        <FlowModal
          isOpen={flowModal.open}
          setIsOpen={(open) => setFlowModal({ ...flowModal, open })}
          flow={flowModal.data}
          elements={elements}
          onSave={async (data, id) => {
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
        />
      )}
    </div>
  );
}
