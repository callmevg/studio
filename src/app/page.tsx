
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
} from '@/lib/firebase';
import type { UIElement, UIFlow } from '@/lib/types';
import D3Graph from '@/components/d3-graph';
import { Header } from '@/components/header';
import { Dashboard } from '@/components/dashboard';
import ElementModal from '@/components/modals/element-modal';
import FlowModal from '@/components/modals/flow-modal';
import SuggestedFlowsModal from '@/components/modals/suggested-flows-modal';
import ImportAnalysisModal from '@/components/modals/import-analysis-modal';
import { useToast } from "@/hooks/use-toast";
import { suggestFlowsFromElementNames } from '@/ai/flows/suggest-flows-from-element-names';
import { importGraphDefinition } from '@/ai/flows/import-graph-definition';
import { Skeleton } from '@/components/ui/skeleton';

type ModalState<T> = { open: boolean; data?: T | null; mode?: 'add' | 'edit' | 'view' };

export default function Home() {
  const [elements, setElements] = useState<UIElement[]>([]);
  const [flows, setFlows] = useState<UIFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const dataInitialized = useRef(false);

  const { toast } = useToast();

  const [elementModal, setElementModal] = useState<ModalState<UIElement>>({ open: false, mode: 'add' });
  const [flowModal, setFlowModal] = useState<ModalState<UIFlow>>({ open: false, mode: 'add' });
  const [suggestedFlowsModal, setSuggestedFlowsModal] = useState<ModalState<{ suggestions: string[][] }>>({ open: false });
  const [importAnalysisModal, setImportAnalysisModal] = useState<ModalState<{ analysis: string }>>({ open: false });

  useEffect(() => {
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

          const analysisResult = await importGraphDefinition({ graphDefinition: json });
          setImportAnalysisModal({ open: true, data: { analysis: analysisResult.analysisResults } });

        } catch (error: any) {
          toast({ variant: "destructive", title: "Import Error", description: error.message });
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset file input
    }
  };

  const handleSuggestFlows = async () => {
    if (elements.length < 2) {
      toast({ variant: "destructive", title: "Not enough elements", description: "Need at least 2 elements to suggest flows." });
      return;
    }
    try {
      const elementNames = elements.map(el => el.name);
      const result = await suggestFlowsFromElementNames({ elementNames });
      if (result.flowSuggestions.length > 0) {
        setSuggestedFlowsModal({ open: true, data: { suggestions: result.flowSuggestions } });
      } else {
        toast({ title: "No suggestions", description: "The AI couldn't find any new flow suggestions." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "AI Error", description: "Could not generate flow suggestions." });
    }
  };


  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex flex-1 overflow-hidden">
        <Dashboard
          elements={elements}
          flows={flows}
          onAddElement={() => setElementModal({ open: true, data: null, mode: 'add' })}
          onAddFlow={() => setFlowModal({ open: true, data: null, mode: 'add' })}
          onExport={handleExportData}
          onImport={handleImportData}
          onSuggestFlows={handleSuggestFlows}
        />
        <div className="flex-1 relative bg-background/50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
               <Skeleton className="w-[80%] h-[80%] rounded-lg" />
            </div>
          ) : (
            <D3Graph elements={elements} flows={flows} onNodeClick={handleNodeClick} />
          )}
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
      
      {suggestedFlowsModal.open && suggestedFlowsModal.data && (
        <SuggestedFlowsModal
          isOpen={suggestedFlowsModal.open}
          setIsOpen={(open) => setSuggestedFlowsModal({ ...suggestedFlowsModal, open })}
          suggestions={suggestedFlowsModal.data.suggestions}
          elements={elements}
        />
      )}

      {importAnalysisModal.open && importAnalysisModal.data && (
        <ImportAnalysisModal
          isOpen={importAnalysisModal.open}
          setIsOpen={(open) => setImportAnalysisModal({ ...importAnalysisModal, open })}
          analysis={importAnalysisModal.data.analysis}
        />
      )}
    </div>
  );
}
