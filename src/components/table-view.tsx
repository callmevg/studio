
"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UIElement, UIFlow } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { Textarea } from './ui/textarea';

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
            paths: [...f.paths]
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

    const handleFlowPathsChange = (id: string, value: string) => {
        const pathsAsString = value.split(';').map(p => p.trim());
        const pathsAsElementNames = pathsAsString.map(p => p.split(',').map(name => name.trim()));
        setEditableFlows(prev =>
            // @ts-ignore
            prev.map(flow => (flow.id === id ? { ...flow, paths: pathsAsElementNames } : flow))
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
                     const paths = flow.paths.map((path) => {
                        return path.map(name => {
                            const element = elements.find(el => el.name.toLowerCase() === name.toLowerCase());
                            return element ? element.id : name; // Keep name if not found, let parent handle it
                        });
                    });

                    return {
                        id: flow.id,
                        name: flow.name,
                        group: flow.group || '',
                        paths: paths,
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
            paths: [[]],
            group: ''
        };
        setEditableFlows(prev => [...prev, newFlow]);
    };


    const elementNamesList = elements.map(e => e.name).join(', ');

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Elements</CardTitle>
                    <CardDescription>View and edit your UI elements directly in the table.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
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
                                        <TableCell className="p-2">
                                            <Input
                                                value={el.name}
                                                onChange={(e) => handleElementChange(el.id, 'name', e.target.value)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center p-2">
                                            <Checkbox
                                                checked={el.isBuggy}
                                                onCheckedChange={(checked) => handleElementChange(el.id, 'isBuggy', !!checked)}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
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
                </CardContent>
                <CardFooter className="flex justify-between pt-4">
                     <Button onClick={handleAddElement} variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add Element
                    </Button>
                    <Button onClick={() => handleSaveChanges('elements')}>Save Element Changes</Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Flows</CardTitle>
                        <CardDescription>
                        View and edit your user flows. Use comma-separated names for elements within a path, and semicolon-separated for different paths.
                        <br />
                        <span className="text-xs text-muted-foreground">
                            Available elements: <span className="font-mono text-xs bg-muted p-1 rounded">{elementNamesList}</span>
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="rounded-md border">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Group</TableHead>
                                    <TableHead>Paths (e.g. A, B, C; X, B)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editableFlows.map(flow => (
                                    <TableRow key={flow.id}>
                                        <TableCell className="p-2">
                                            <Input
                                                value={flow.name}
                                                onChange={(e) => handleFlowChange(flow.id, 'name', e.target.value)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Input
                                                value={flow.group || ''}
                                                onChange={(e) => handleFlowChange(flow.id, 'group', e.target.value)}
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <Textarea
                                                value={flow.paths.map(path => path.map(id => elements.find(el => el.id === id)?.name || id).join(', ')).join('; ')}
                                                onChange={(e) => handleFlowPathsChange(flow.id, e.target.value)}
                                                className="h-8"
                                                rows={1}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-between pt-4">
                    <Button onClick={handleAddFlow} variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add Flow
                    </Button>
                    <Button onClick={() => handleSaveChanges('flows')}>Save Flow Changes</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
