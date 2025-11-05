
"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { UIElement, UIFlow } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface TableViewProps {
    elements: UIElement[];
    flows: UIFlow[];
    onBulkUpdate: (type: 'elements' | 'flows', data: any[]) => Promise<void>;
}

export function TableView({ elements, flows, onBulkUpdate }: TableViewProps) {
    const { toast } = useToast();
    const [elementPasteData, setElementPasteData] = useState('');
    const [flowPasteData, setFlowPasteData] = useState('');

    const elementNames = elements.map(e => e.name).join(', ');

    const handlePaste = (type: 'elements' | 'flows') => {
        const dataToParse = type === 'elements' ? elementPasteData : flowPasteData;
        if (!dataToParse.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Paste data is empty.' });
            return;
        }

        try {
            const rows = dataToParse.trim().split('\n').map(row => row.split('\t'));
            
            if (type === 'elements') {
                const parsedElements = rows.map(row => ({
                    name: row[0] || '',
                    isBuggy: row[1] ? row[1].toLowerCase() === 'true' : false,
                    bugDetails: row[2] || '',
                    mediaLink: row[3] || '',
                }));
                onBulkUpdate('elements', parsedElements);
                setElementPasteData('');
            } else { // flows
                const parsedFlows = rows.map(row => ({
                    name: row[0] || '',
                    group: row[1] || '',
                    elements: (row[2] || '').split(',').map(s => s.trim()).filter(Boolean),
                }));
                onBulkUpdate('flows', parsedFlows);
                setFlowPasteData('');
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Parsing Error', description: 'Failed to parse pasted data. Please check the format.' });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Elements</CardTitle>
                    <CardDescription>View and bulk-edit your UI elements.</CardDescription>
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
                                    {elements.map(el => (
                                        <TableRow key={el.id}>
                                            <TableCell className="font-medium">{el.name}</TableCell>
                                            <TableCell>
                                                <Checkbox checked={el.isBuggy} disabled />
                                            </TableCell>
                                            <TableCell>{el.bugDetails}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="space-y-2">
                             <h4 className="font-semibold text-md">Copy/Paste from Excel</h4>
                             <p className="text-sm text-muted-foreground">
                                Paste tab-separated values with columns: `Name`, `Is Buggy` (true/false), `Bug Details`, `Media Link`
                             </p>
                            <Textarea
                                placeholder="Paste data here..."
                                value={elementPasteData}
                                onChange={(e) => setElementPasteData(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <Button onClick={() => handlePaste('elements')}>Update Elements</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Flows</CardTitle>
                    <CardDescription>View and bulk-edit your user flows.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="rounded-md border">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Group</TableHead>
                                        <TableHead>Elements</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flows.map(flow => (
                                        <TableRow key={flow.id}>
                                            <TableCell className="font-medium">{flow.name}</TableCell>
                                            <TableCell>{flow.group}</TableCell>
                                            <TableCell>
                                                {flow.elementIds
                                                    .map(id => elements.find(el => el.id === id)?.name)
                                                    .filter(Boolean)
                                                    .join(' → ')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="space-y-2">
                             <h4 className="font-semibold text-md">Copy/Paste from Excel</h4>
                             <p className="text-sm text-muted-foreground">
                                Paste tab-separated values with columns: `Name`, `Group`, `Elements` (comma-separated names).
                                <br />
                                Available element names: <span className="font-mono text-xs bg-muted p-1 rounded">{elementNames}</span>
                             </p>
                            <Textarea
                                placeholder="Paste data here..."
                                value={flowPasteData}
                                onChange={(e) => setFlowPasteData(e.target.value)}
                                className="min-h-[100px]"
                            />
                            <Button onClick={() => handlePaste('flows')}>Update Flows</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
