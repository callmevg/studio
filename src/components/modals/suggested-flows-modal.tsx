"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addFlow } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import type { UIElement } from "@/lib/types";
import { Plus } from "lucide-react";

interface SuggestedFlowsModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  suggestions: string[][];
  elements: UIElement[];
}

export default function SuggestedFlowsModal({ isOpen, setIsOpen, suggestions, elements }: SuggestedFlowsModalProps) {
  const { toast } = useToast();

  const handleAddFlow = async (suggestedFlow: string[]) => {
    try {
      const elementIds = suggestedFlow
        .map(name => elements.find(el => el.name === name)?.id)
        .filter((id): id is string => !!id);

      if (elementIds.length !== suggestedFlow.length) {
        toast({ variant: "destructive", title: "Error", description: "Some elements in the suggestion were not found." });
        return;
      }

      const flowName = `AI: ${suggestedFlow.join(' → ')}`;
      await addFlow({ name: flowName, elementIds });
      toast({ title: "Flow Added!", description: `Successfully added "${flowName}".` });
      setIsOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Flow Suggestions</DialogTitle>
          <DialogDescription>
            Here are some potential user flows based on your existing elements.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {suggestions.map((flow, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-card border rounded-lg">
              <p className="text-sm font-medium">
                {flow.join(' → ')}
              </p>
              <Button size="sm" onClick={() => handleAddFlow(flow)}>
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
