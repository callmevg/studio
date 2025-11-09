
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
import type { UIElement, UIScenario } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronsDown, ChevronsUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "../ui/badge";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  group: z.string().optional(),
  methods: z.array(z.array(z.string())).min(1, { message: "Scenario must have at least one method." })
    .refine(methods => methods.every(p => p.length > 0), { message: "All methods must have at least one element." }),
});

interface ScenarioModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  scenario?: UIScenario | null;
  elements: UIElement[];
  scenarios: UIScenario[];
  onSave: (data: z.infer<typeof formSchema>, id?: string) => Promise<void>;
  onQuickAddElement: (name: string) => Promise<void>;
  onDelete?: (id: string) => void;
}

export default function ScenarioModal({ isOpen, setIsOpen, scenario, elements, scenarios, onSave, onQuickAddElement, onDelete }: ScenarioModalProps) {
  
  const [methods, setMethods] = useState<UIElement[][]>([]);
  const [availableElements, setAvailableElements] = useState<UIElement[]>([]);
  const [newElementName, setNewElementName] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: scenario?.name || "",
      group: scenario?.group || "",
      methods: scenario?.methods || [[]],
    },
  });

  const existingGroups = useMemo(() => {
    const groups = new Set(scenarios.map(f => f.group).filter(Boolean));
    return Array.from(groups) as string[];
  }, [scenarios]);


  useEffect(() => {
    // Only reset form fields when the modal opens for a specific scenario (or a new one)
    if (isOpen) {
        const initialMethods: UIElement[][] = scenario?.methods 
            ? scenario.methods.map(method => method.map(id => elements.find(el => el.id === id)).filter(Boolean) as UIElement[]) 
            : [[]];
        setMethods(initialMethods);
        form.setValue('methods', initialMethods.map(p => p.map(el => el.id)));
        form.setValue('name', scenario?.name || "");
        form.setValue('group', scenario?.group || "");
    }
  }, [scenario, isOpen, elements, form]);

  useEffect(() => {
    // Update available elements whenever the main elements list changes
    const newAvailable = [...elements].sort((a, b) => a.name.localeCompare(b.name));
    setAvailableElements(newAvailable);
    
    // Keep form 'methods' value in sync with the 'methods' state
    form.setValue('methods', methods.map(p => p.map(el => el.id)));

  }, [methods, elements, form]);


  const handleSelect = (element: UIElement, methodIndex: number) => {
    const newMethods = [...methods];
    newMethods[methodIndex] = [...newMethods[methodIndex], element];
    setMethods(newMethods);
  };
  
  const handleDeselect = (element: UIElement, methodIndex: number, elementIndex: number) => {
    const newMethods = [...methods];
    newMethods[methodIndex] = newMethods[methodIndex].filter((_, i) => i !== elementIndex);
    setMethods(newMethods);
  };

  const moveElement = (methodIndex: number, elementIndex: number, direction: 'up' | 'down') => {
    const newMethods = [...methods];
    const method = newMethods[methodIndex];
    const targetIndex = direction === 'up' ? elementIndex - 1 : elementIndex + 1;
    if (targetIndex >= 0 && targetIndex < method.length) {
      [method[elementIndex], method[targetIndex]] = [method[targetIndex], method[elementIndex]];
      setMethods(newMethods);
    }
  };
  
  const addNewMethod = () => {
    setMethods([...methods, []]);
  };
  
  const deleteMethod = (methodIndex: number) => {
    if (methods.length > 1) {
        const newMethods = methods.filter((_, i) => i !== methodIndex);
        setMethods(newMethods);
    } else {
        form.setError("methods", { type: "manual", message: "A scenario must have at least one method." });
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values, scenario?.id);
  };

  const handleQuickAddClick = async () => {
    if (!newElementName.trim()) return;
    await onQuickAddElement(newElementName.trim());
    setNewElementName("");
  };

  
  const ElementItem = ({ element, onAction, actionIcon, onMove, canMoveUp, canMoveDown }: any) => (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
      <span className="text-sm">{element.name}</span>
      <div className="flex items-center space-x-1">
        {onMove && (
          <>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('up')} disabled={!canMoveUp}><ChevronsUp className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove('down')} disabled={!canMoveDown}><ChevronsDown className="h-4 w-4" /></Button>
          </>
        )}
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onAction}>{actionIcon}</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            form.reset();
            setMethods([[]]);
            setNewElementName("");
        }
        setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{scenario ? 'Edit Scenario' : 'Add New Scenario'}</DialogTitle>
          <DialogDescription>Define a sequence of UI elements to create a user scenario. A scenario can have multiple methods.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Scenario Name</FormLabel>
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
                        <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select or type a group" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <Input
                                    className="mb-2"
                                    placeholder="Type to add new group"
                                    onChange={(e) => field.onChange(e.target.value)}
                                    value={field.value || ''}
                                />
                                {existingGroups.map((groupName) => (
                                <SelectItem key={groupName} value={groupName}>
                                    {groupName}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
            <FormItem>
              <FormLabel>Scenario Methods</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                 <div className="border rounded-md p-2 space-y-1">
                  <div className="flex justify-between items-center px-2 mb-2">
                    <h4 className="font-semibold text-sm">Available Elements</h4>
                  </div>
                  <div className="flex gap-2 px-2">
                    <Input
                        placeholder="New element name..."
                        value={newElementName}
                        onChange={(e) => setNewElementName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickAddClick();
                            }
                        }}
                    />
                    <Button type="button" variant="outline" onClick={handleQuickAddClick}>
                        <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-80">
                    {availableElements.length > 0 ? (
                        availableElements.map(el => (
                          <div key={el.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
                            <span className="text-sm">{el.name}</span>
                            <div className="flex items-center space-x-1">
                                {methods.map((_, methodIndex) => (
                                  <Button key={methodIndex} type="button" variant="ghost" size="icon" className="h-6 w-6" title={`Add to Method ${methodIndex + 1}`} onClick={() => handleSelect(el, methodIndex)}>
                                    <Badge variant="secondary">{methodIndex + 1}</Badge>
                                    <ArrowRight className="h-4 w-4 text-green-500 ml-1" />
                                  </Button>
                                ))}
                            </div>
                          </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground text-center p-4">No available elements. Try adding one first.</p>
                    )}
                  </ScrollArea>
                </div>

                <div className="border rounded-md p-2 space-y-2">
                   <div className="flex justify-between items-center px-2">
                     <h4 className="font-semibold text-sm">Selected Methods</h4>
                     <Button type="button" variant="outline" size="sm" onClick={addNewMethod}>
                        <Plus className="mr-2 h-4 w-4" /> Add Method
                    </Button>
                   </div>
                  <ScrollArea className="h-96 pr-4">
                    {methods.map((method, methodIndex) => (
                        <div key={methodIndex} className="mb-4 p-2 border rounded-md">
                           <div className="flex justify-between items-center mb-2">
                             <h5 className="font-semibold text-xs">Method {methodIndex + 1}</h5>
                             <Button type="button" variant="destructive" size="icon" className="h-6 w-6" onClick={() => deleteMethod(methodIndex)} disabled={methods.length <= 1}>
                                <Trash2 className="h-3 w-3" />
                             </Button>
                           </div>
                            {method.length > 0 ? (
                                method.map((el, i) => (
                                    <ElementItem 
                                        key={el.id} 
                                        element={el} 
                                        onAction={() => handleDeselect(el, methodIndex, i)} 
                                        actionIcon={<ArrowLeft className="h-4 w-4 text-red-500" />} 
                                        onMove={(dir: 'up' | 'down') => moveElement(methodIndex, i, dir)} 
                                        canMoveUp={i > 0} 
                                        canMoveDown={i < method.length - 1} 
                                    />
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground text-center p-2">Select elements from the left panel.</p>
                            )}
                        </div>
                    ))}
                  </ScrollArea>
                </div>
              </div>
               <FormMessage className="pl-1">{form.formState.errors.methods?.message || form.formState.errors.methods?.root?.message}</FormMessage>
            </FormItem>

            <DialogFooter className={cn("pt-4", scenario && onDelete ? "sm:justify-between" : "sm:justify-end")}>
              {scenario && onDelete && (
                <Button type="button" variant="destructive" onClick={() => onDelete(scenario.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />Delete Scenario
                </Button>
              )}
              <Button type="submit">Save Scenario</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
