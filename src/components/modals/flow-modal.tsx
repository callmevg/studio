
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
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronsDown, ChevronsUp, Plus, Trash2 } from "lucide-react";
import { deleteFlow } from "@/lib/localStorage";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "../ui/badge";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  group: z.string().optional(),
  paths: z.array(z.array(z.string())).min(1, { message: "Flow must have at least one path." })
    .refine(paths => paths.every(p => p.length > 0), { message: "All paths must have at least one element." }),
});

interface FlowModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  flow?: UIFlow | null;
  elements: UIElement[];
  flows: UIFlow[];
  onSave: (data: z.infer<typeof formSchema>, id?: string) => Promise<void>;
  onAddNewElement: () => void;
}

export default function FlowModal({ isOpen, setIsOpen, flow, elements, flows, onSave, onAddNewElement }: FlowModalProps) {
  const { toast } = useToast();
  
  const [paths, setPaths] = useState<UIElement[][]>([]);
  const [availableElements, setAvailableElements] = useState<UIElement[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: flow?.name || "",
      group: flow?.group || "",
      paths: flow?.paths || [[]],
    },
  });

  const existingGroups = useMemo(() => {
    const groups = new Set(flows.map(f => f.group).filter(Boolean));
    return Array.from(groups) as string[];
  }, [flows]);


  useEffect(() => {
    const initialPaths: UIElement[][] = flow?.paths ? 
        flow.paths.map(path => path.map(id => elements.find(el => el.id === id)).filter(Boolean) as UIElement[]) 
        : [[]];
    
    setPaths(initialPaths);
    
    const initialAvailable = [...elements].sort((a, b) => a.name.localeCompare(b.name));

    setAvailableElements(initialAvailable);
    
    form.setValue('paths', initialPaths.map(p => p.map(el => el.id)));
    form.setValue('name', flow?.name || "");
    form.setValue('group', flow?.group || "");
  }, [flow, elements, form]);

  useEffect(() => {
    const newAvailable = [...elements].sort((a, b) => a.name.localeCompare(b.name));
    setAvailableElements(newAvailable);
    form.setValue('paths', paths.map(p => p.map(el => el.id)));
  }, [paths, elements, form]);

  const handleSelect = (element: UIElement, pathIndex: number) => {
    const newPaths = [...paths];
    newPaths[pathIndex] = [...newPaths[pathIndex], element];
    setPaths(newPaths);
  };
  
  const handleDeselect = (element: UIElement, pathIndex: number, elementIndex: number) => {
    const newPaths = [...paths];
    newPaths[pathIndex] = newPaths[pathIndex].filter((_, i) => i !== elementIndex);
    setPaths(newPaths);
  };

  const moveElement = (pathIndex: number, elementIndex: number, direction: 'up' | 'down') => {
    const newPaths = [...paths];
    const path = newPaths[pathIndex];
    const targetIndex = direction === 'up' ? elementIndex - 1 : elementIndex + 1;
    if (targetIndex >= 0 && targetIndex < path.length) {
      [path[elementIndex], path[targetIndex]] = [path[targetIndex], path[elementIndex]];
      setPaths(newPaths);
    }
  };
  
  const addNewPath = () => {
    setPaths([...paths, []]);
  };
  
  const deletePath = (pathIndex: number) => {
    if (paths.length > 1) {
        const newPaths = paths.filter((_, i) => i !== pathIndex);
        setPaths(newPaths);
    } else {
        toast({
            variant: "destructive",
            title: "Cannot Delete",
            description: "A flow must have at least one path.",
        });
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
            setPaths([[]]);
            setAvailableElements([]);
        }
        setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{flow ? 'Edit Flow' : 'Add New Flow'}</DialogTitle>
          <DialogDescription>Define a sequence of UI elements to create a user flow. A flow can have multiple paths or tributaries.</DialogDescription>
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
              <FormLabel>Flow Paths</FormLabel>
              <div className="grid grid-cols-2 gap-4">
                 <div className="border rounded-md p-2 space-y-1">
                  <div className="flex justify-between items-center px-2">
                    <h4 className="font-semibold text-sm">Available Elements</h4>
                    <Button type="button" variant="outline" size="sm" onClick={onAddNewElement}>
                      <Plus className="mr-2 h-4 w-4" /> Add New
                    </Button>
                  </div>
                  <ScrollArea className="h-96">
                    {availableElements.length > 0 ? (
                        availableElements.map(el => (
                          <div key={el.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50">
                            <span className="text-sm">{el.name}</span>
                            <div className="flex items-center space-x-1">
                                {paths.map((_, pathIndex) => (
                                  <Button key={pathIndex} variant="ghost" size="icon" className="h-6 w-6" title={`Add to Path ${pathIndex + 1}`} onClick={() => handleSelect(el, pathIndex)}>
                                    <Badge variant="secondary">{pathIndex + 1}</Badge>
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
                     <h4 className="font-semibold text-sm">Selected Paths</h4>
                     <Button type="button" variant="outline" size="sm" onClick={addNewPath}>
                        <Plus className="mr-2 h-4 w-4" /> Add Path
                    </Button>
                   </div>
                  <ScrollArea className="h-96 pr-4">
                    {paths.map((path, pathIndex) => (
                        <div key={pathIndex} className="mb-4 p-2 border rounded-md">
                           <div className="flex justify-between items-center mb-2">
                             <h5 className="font-semibold text-xs">Path {pathIndex + 1}</h5>
                             <Button type="button" variant="destructive" size="icon" className="h-6 w-6" onClick={() => deletePath(pathIndex)} disabled={paths.length <= 1}>
                                <Trash2 className="h-3 w-3" />
                             </Button>
                           </div>
                            {path.length > 0 ? (
                                path.map((el, i) => (
                                    <ElementItem 
                                        key={el.id} 
                                        element={el} 
                                        onAction={() => handleDeselect(el, pathIndex, i)} 
                                        actionIcon={<ArrowLeft className="h-4 w-4 text-red-500" />} 
                                        onMove={(dir: 'up' | 'down') => moveElement(pathIndex, i, dir)} 
                                        canMoveUp={i > 0} 
                                        canMoveDown={i < path.length - 1} 
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
               <FormMessage className="pl-1">{form.formState.errors.paths?.message || form.formState.errors.paths?.root?.message}</FormMessage>
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
