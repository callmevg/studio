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
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportAnalysisModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  analysis: string;
}

export default function ImportAnalysisModal({ isOpen, setIsOpen, analysis }: ImportAnalysisModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Analysis</DialogTitle>
          <DialogDescription>
            AI-powered analysis of your imported data.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border p-4">
          <pre className="text-sm whitespace-pre-wrap font-code">{analysis}</pre>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
