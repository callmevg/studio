
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { UIElement } from "@/lib/types";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useMemo, useState } from "react";
import { Combobox } from "../ui/combobox";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  isBuggy: z.boolean().default(false),
  bugDetails: z.string().optional(),
  mediaLink: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

interface ElementModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  element?: UIElement | null;
  elements: UIElement[];
  mode?: 'add' | 'edit' | 'view';
  onSave: (data: z.infer<typeof formSchema>, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ElementModal({ isOpen, setIsOpen, element, elements, mode: initialMode = 'add', onSave, onDelete }: ElementModalProps) {
  const [mode, setMode] = useState(initialMode);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: element?.name || "",
      isBuggy: element?.isBuggy || false,
      bugDetails: element?.bugDetails || "",
      mediaLink: element?.mediaLink || "",
    },
  });

  const elementOptions = useMemo(() => {
    return elements.map(el => ({ value: el.name, label: el.name }));
  }, [elements]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    onSave(values, element?.id);
  };

  const handleDelete = async () => {
    if (element?.id) {
        onDelete(element.id);
    }
  };

  const isViewMode = mode === 'view';
  const placeholderImage = PlaceHolderImages.find(img => img.id === 'bug-placeholder');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' && 'Add New Element'}
            {mode === 'edit' && 'Edit Element'}
            {mode === 'view' && 'Element Details'}
          </DialogTitle>
          <DialogDescription>
            {isViewMode ? `Details for "${element?.name}".` : 'Fill in the details for the UI element.'}
          </DialogDescription>
        </DialogHeader>

        {isViewMode ? (
          <div className="space-y-4 py-4">
            <p><strong>Name:</strong> {element?.name}</p>
            <p><strong>Bug Status:</strong> {element?.isBuggy ? <span className="text-destructive font-semibold">Buggy</span> : 'OK'}</p>
            {element?.isBuggy && <p><strong>Bug Details:</strong> {element?.bugDetails || 'N/A'}</p>}
            {element?.mediaLink && placeholderImage && (
                 <div className="space-y-2">
                    <strong>Media:</strong>
                    <Image
                        src={placeholderImage.imageUrl}
                        alt={placeholderImage.description}
                        data-ai-hint={placeholderImage.imageHint}
                        width={600}
                        height={400}
                        className="rounded-md object-cover"
                    />
                 </div>
            )}
             <DialogFooter className="sm:justify-between pt-4">
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                <Button onClick={() => setMode('edit')}>Edit</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Combobox
                        options={elementOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select or create new..."
                        inputPlaceholder="Search elements..."
                        emptyMessage="No element found. Type to create."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isBuggy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mark as Buggy</FormLabel>
                      <FormDescription>Indicates if this element has an active bug.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bugDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bug Details</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the bug..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mediaLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Media Link (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/video.mp4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
