
"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UIElement, UIFlow } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface TableViewProps {
    elements: UIElement[];
    flows: UIFlow[];
    onBulkUpdate: (type: 'elements' | 'flows', data: any[]) => Promise<void>;
}

export function TableView({ elements, flows, onBulkUpdate }: TableViewProps) {
    const { toast } = useToast();
    const [editableElements, setEditableElements] = useState(elements);
    const [editableFlows, setEditableFlows] = useState(flows);

    useEffect(() => {
        setEditableElements(elements.map(e => ({...e})));
    }, [elements]);

    useEffect(() => {
        setEditableFlows(flows.map(f => ({
            ...f,
            elementIds: [...f.elementIds]
        })));
    }, [flows]);
    
    const handleElementChange = (id: string, field: keyof UIElement, value: string | boolean) => {
        setEditableElements(prev =>
            prev.map(el => (el.id === id ? { ...el, [field]: value } : el))
        );
    };

    const handleFlowChange = (id: string, field: keyof UIFlow, value: string) => {
        setEditableFlows(prev =>
            prev.map(flow => (flow.id === id ? { ...flow, [field]: value } : flow))
        );
    };

    const handleFlowElementsChange = (id: string, value: string) => {
        const elementNames = value.split(',').map(name => name.trim());
        setEditableFlows(prev =>
            prev.map(flow => (flow.id === id ? { ...flow, elementIds: elementNames } : flow))
        );
    };

    const handleSaveChanges = (type: 'elements' | 'flows') => {
        try {
            if (type === 'elements') {
                const elementsToUpdate = editableElements.map(el => ({
                    id: el.id,
                    name: el.name,
                    isBuggy: el.isBuggy,
                    bugDetails: el.bugDetails || '',
                    mediaLink: el.mediaLink || ''
                }));
                onBulkUpdate('elements', elementsToUpdate);
            } else { // flows
                const flowsToUpdate = editableFlows.map(flow => {
                    const elementIds = flow.elementIds.map(name => {
                        const element = elements.find(el => el.name.toLowerCase() === name.toLowerCase());
                        return element ? element.id : name; // Keep name if not found, let parent handle it
                    });

                    return {
                        id: flow.id,
                        name: flow.name,
                        group: flow.group || '',
                        elements: elementIds,
                    };
                });
                 onBulkUpdate('flows', flowsToUpdate);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Error', description: 'Failed to save changes.' });
        }
    };
    
    const handleAddElement = () => {
        const newId = `new-${Date.now()}`;
        // @ts-ignore
        const newElement: UIElement = {
            id: newId,
            name: 'New Element',
            isBuggy: false,
            bugDetails: '',
            mediaLink: '',
            createdAt: { toDate: () => new Date() }
        };
        setEditableElements(prev => [...prev, newElement]);
    };

    const handleAddFlow = () => {
        const newId = `new-${Date.now()}`;
        const newFlow: UIFlow = {
            id: newId,
            name: 'New Flow',
            elementIds: [],
            group: ''
        };
        setEditableFlows(prev => [...prev, newFlow]);
    };


    const elementNamesList = elements.map(e => e.name).join(', ');

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Elements</CardTitle>
                            <CardDescription>View and edit your UI elements directly in the table.</CardDescription>
                        </div>
                        <Button onClick={handleAddElement} size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Element
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-[100px]">Is Buggy?</TableHead>
                                        <TableHead>Bug Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {editableElements.map(el => (
                                        <TableRow key={el.id}>
                                            <TableCell>
                                                <Input
                                                    value={el.name}
                                                    onChange={(e) => handleElementChange(el.id, 'name', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Checkbox
                                                    checked={el.isBuggy}
                                                    onCheckedChange={(checked) => handleElementChange(el.id, 'isBuggy', !!checked)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={el.bugDetails}
                                                    onChange={(e) => handleElementChange(el.id, 'bugDetails', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Button onClick={() => handleSaveChanges('elements')}>Save Element Changes</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Flows</CardTitle>
                             <CardDescription>
                                View and edit your user flows. Use comma-separated names for elements.
                                <br />
                                <span className="text-xs text-muted-foreground">
                                    Available elements: <span className="font-mono text-xs bg-muted p-1 rounded">{elementNamesList}</span>
                                </span>
                            </CardDescription>
                        </div>
                         <Button onClick={handleAddFlow} size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Flow
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="rounded-md border">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Group</TableHead>
                                        <TableHead>Elements (comma-separated)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {editableFlows.map(flow => (
                                        <TableRow key={flow.id}>
                                            <TableCell>
                                                <Input
                                                    value={flow.name}
                                                    onChange={(e) => handleFlowChange(flow.id, 'name', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={flow.group || ''}
                                                    onChange={(e) => handleFlowChange(flow.id, 'group', e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={flow.elementIds.map(id => elements.find(el => el.id === id)?.name || id).join(', ')}
                                                    onChange={(e) => handleFlowElementsChange(flow.id, e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                         <Button onClick={() => handleSaveChanges('flows')}>Save Flow Changes</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
