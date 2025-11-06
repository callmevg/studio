
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Edit, Plus, Trash2 } from "lucide-react";
import type { UIScenario } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface DashboardProps {
  scenarios: UIScenario[];
  onAddScenario: () => void;
  onEditScenario: (scenario: UIScenario) => void;
  onDeleteScenario: (scenarioId: string) => void;
  onAddElement: () => void;
  onScenarioHover: (scenarioId: string | null) => void;
  disabled?: boolean;
}

export function Dashboard({
  scenarios,
  onAddScenario,
  onEditScenario,
  onDeleteScenario,
  onAddElement,
  onScenarioHover,
  disabled = false
}: DashboardProps) {

  const groupedScenarios = scenarios.reduce((acc, scenario) => {
    const group = scenario.group || 'Ungrouped';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(scenario);
    return acc;
  }, {} as Record<string, UIScenario[]>);

  const groupKeys = Object.keys(groupedScenarios).sort();

  return (
    <div className="w-80 border-r bg-background flex flex-col">
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Scenarios</h2>
            <Button onClick={onAddScenario} size="sm" disabled={disabled}>
                <Plus className="mr-2 h-4 w-4" /> Add Scenario
            </Button>
        </div>
        <Separator />
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2">
            {scenarios.length === 0 && !disabled ? (
                <p className="text-sm text-muted-foreground text-center py-4">No scenarios created yet.</p>
            ) : (
                <Accordion type="multiple" className="w-full" defaultValue={groupKeys}>
                    {groupKeys.map(groupName => (
                        <AccordionItem value={groupName} key={groupName}>
                            <AccordionTrigger className="text-md font-semibold">{groupName}</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-2">
                                {groupedScenarios[groupName].map(scenario => (
                                    <Card 
                                        key={scenario.id} 
                                        onMouseEnter={() => onScenarioHover(scenario.id)}
                                        onMouseLeave={() => onScenarioHover(null)}
                                    >
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
                                            <CardTitle className="text-sm font-medium">{scenario.name}</CardTitle>
                                            <div className="flex items-center space-x-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditScenario(scenario)} disabled={disabled}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteScenario(scenario.id)} disabled={disabled}>
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
      <div className="p-4 border-t">
        <Button onClick={onAddElement} className="w-full" variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Element
        </Button>
      </div>
    </div>
  );
}
