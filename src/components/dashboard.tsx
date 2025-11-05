
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Edit, GitFork, Plus, Trash2 } from "lucide-react";
import type { UIFlow } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface DashboardProps {
  flows: UIFlow[];
  onAddFlow: () => void;
  onEditFlow: (flow: UIFlow) => void;
  onDeleteFlow: (flowId: string) => void;
  disabled?: boolean;
}

export function Dashboard({
  flows,
  onAddFlow,
  onEditFlow,
  onDeleteFlow,
  disabled = false
}: DashboardProps) {

  const groupedFlows = flows.reduce((acc, flow) => {
    const group = flow.group || 'Ungrouped';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(flow);
    return acc;
  }, {} as Record<string, UIFlow[]>);

  const groupKeys = Object.keys(groupedFlows).sort();

  return (
    <div className="w-80 border-r bg-background flex flex-col p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Flows</h2>
        <Button onClick={onAddFlow} size="sm" disabled={disabled}>
            <Plus className="mr-2 h-4 w-4" /> Add Flow
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="space-y-2">
            {flows.length === 0 && !disabled ? (
                <p className="text-sm text-muted-foreground text-center py-4">No flows created yet.</p>
            ) : (
                <Accordion type="multiple" className="w-full" defaultValue={groupKeys}>
                    {groupKeys.map(groupName => (
                        <AccordionItem value={groupName} key={groupName}>
                            <AccordionTrigger className="text-md font-semibold">{groupName}</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-2">
                                {groupedFlows[groupName].map(flow => (
                                    <Card key={flow.id}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
                                            <CardTitle className="text-sm font-medium">{flow.name}</CardTitle>
                                            <div className="flex items-center space-x-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditFlow(flow)} disabled={disabled}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteFlow(flow.id)} disabled={disabled}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </CardHeader>
                                    </Card>
                                ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}
