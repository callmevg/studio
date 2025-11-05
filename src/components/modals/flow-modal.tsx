
"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { UIElement, UIFlow } from "@/lib/types";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronsDown, ChevronsUp, Plus, Trash2 } from "lucide-react";
import { deleteFlow } from "@/lib/localStorage";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  group: z.string().optional(),
  elementIds: z.array(z.string()).min(1, { message: "Flow must have at least one element." }),
});

interface FlowModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  flow?: UIFlow | null;
  elements: UIElement[];
  onSave: (data: z.infer<typeof formSchema>, id?: string) => Promise<void>;
  onAddNewElement: () => void;
}

export default function FlowModal({ isOpen, setIsOpen, flow, elements, onSave, onAddNewElement }: FlowModalProps) {
  const { toast } = useToast();
  
  const [selectedElements, setSelectedElements] = useState<UIElement[]>([]);
  const [availableElements, setAvailableElements] = useState<UIElement[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: flow?.name || "",
      group: flow?.group || "",
      elementIds: flow?.elementIds || [],
    },
  });

  useEffect(() => {
    const initialSelected = flow ? flow.elementIds.map(id => elements.find(el => el.id === id)).filter(Boolean) as UIElement[] : [];
    const initialAvailable = elements.filter(el => !initialSelected.some(sel => sel.id === el.id));
    setSelectedElements(initialSelected);
    setAvailableElements(initialAvailable);
    form.setValue('elementIds', initialSelected.map(el => el.id));
    form.setValue('name', flow?.name || "");
    form.setValue('group', flow?.group || "");
  }, [flow, elements, form]);

  const handleSelect = (element: UIElement) => {
    const newAvailable = availableElements.filter(el => el.id !== element.id);
    const newSelected = [...selectedElements, element];
    setAvailableElements(newAvailable);
    setSelectedElements(newSelected);
    form.setValue('elementIds', newSelected.map(el => el.id));
  };

  const handleDeselect = (element: UIElement) => {
    const newSelected = selectedElements.filter(el => el.id !== element.id);
    const newAvailable = [...availableElements, element];
    setAvailableElements(newAvailable);
    setSelectedElements(newSelected);
    form.setValue('elementIds', newSelected.map(el => el.id));
  };

  const moveElement = (index: number, direction: 'up' | 'down') => {
    const newSelected = [...selectedElements];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSelected.length) {
      [newSelected[index], newSelected[targetIndex]] = [newSelected[targetIndex], newSelected[index]];
      setSelectedElements(newSelected);
      form.setValue('elementIds', newSelected.map(el => el.id));
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values, flow?.id);
  };

  const handleDelete = async () => {
    if (flow?.id && window.confirm("Are you sure you want to delete this flow?")) {
      try {
        await deleteFlow(flow.id);
        toast({ title: "Success", description: "Flow deleted." });
        setIsOpen(false);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  };
  
  const ElementItem = ({ element, onAction, actionIcon, onMove, canMoveUp, canMoveDown }: any) => (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
      <span className="text-sm">{element.name}</span>
      <div className="flex items-center space-x-1">
        {onMove && (
          <>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('up')} disabled={!canMoveUp}><ChevronsUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('down')} disabled={!canMoveDown}><ChevronsDown className="h-4 w-4" /></Button>
          </>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAction}>{actionIcon}</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            form.reset();
            setSelectedElements([]);
            setAvailableElements([]);
        }
        setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{flow ? 'Edit Flow' : 'Add New Flow'}</DialogTitle>
          <DialogDescription>Define a sequence of UI elements to create a user flow.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Flow Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., New User Registration" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="group"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Group (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Onboarding" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <FormItem>
              <FormLabel>Flow Sequence</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-md p-2 space-y-1">
                  <div className="flex justify-between items-center px-2">
                    <h4 className="font-semibold text-sm">Available Elements</h4>
                    <Button type="button" variant="outline" size="sm" onClick={onAddNewElement}>
                      <Plus className="mr-2 h-4 w-4" /> Add New
                    </Button>
                  </div>
                  <ScrollArea className="h-64">
                    {availableElements.length > 0 ? (
                        availableElements.map(el => <ElementItem key={el.id} element={el} onAction={() => handleSelect(el)} actionIcon={<ArrowRight className="h-4 w-4 text-green-500" />} />)
                    ) : (
                        <p className="text-xs text-muted-foreground text-center p-4">No available elements.</p>
                    )}
                  </ScrollArea>
                </div>
                <div className="border rounded-md p-2 space-y-1">
                   <h4 className="font-semibold text-center text-sm px-2">Selected Elements</h4>
                  <ScrollArea className="h-64">
                     {selectedElements.length > 0 ? (
                        selectedElements.map((el, i) => <ElementItem key={el.id} element={el} onAction={() => handleDeselect(el)} actionIcon={<ArrowLeft className="h-4 w-4 text-red-500" />} onMove={(dir: 'up' | 'down') => moveElement(i, dir)} canMoveUp={i > 0} canMoveDown={i < selectedElements.length - 1} />)
                     ) : (
                        <p className="text-xs text-muted-foreground text-center p-4">Select elements from the left panel.</p>
                     )}
                  </ScrollArea>
                </div>
              </div>
               <FormMessage className="pl-1">{form.formState.errors.elementIds?.message}</FormMessage>
            </FormItem>

            <DialogFooter className={cn("pt-4", flow ? "sm:justify-between" : "sm:justify-end")}>
              {flow && <Button type="button" variant="destructive" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4" />Delete Flow</Button>}
              <Button type="submit">Save Flow</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
