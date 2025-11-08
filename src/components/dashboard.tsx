
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Edit, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import type { UIScenario } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

interface DashboardProps {
  scenarios: UIScenario[];
  scenarioColors: { [key: string]: string };
  hiddenScenarioIds: Set<string>;
  onAddScenario: () => void;
  onEditScenario: (scenario: UIScenario) => void;
  onDeleteScenario: (scenarioId: string) => void;
  onAddElement: () => void;
  onScenarioHover: (scenarioId: string | null) => void;
  onToggleScenario: (scenarioId: string) => void;
  onToggleGroup: (scenarios: UIScenario[]) => void;
  disabled?: boolean;
}

export function Dashboard({
  scenarios,
  scenarioColors,
  hiddenScenarioIds,
  onAddScenario,
  onEditScenario,
  onDeleteScenario,
  onAddElement,
  onScenarioHover,
  onToggleScenario,
  onToggleGroup,
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
                    {groupKeys.map(groupName => {
                        const groupScenarios = groupedScenarios[groupName];
                        const allHidden = groupScenarios.every(s => hiddenScenarioIds.has(s.id));
                        const GroupEyeIcon = allHidden ? EyeOff : Eye;
                        
                        return (
                            <AccordionItem value={groupName} key={groupName}>
                                <div className="flex items-center">
                                    <AccordionTrigger className="text-md font-semibold flex-1">{groupName}</AccordionTrigger>
                                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleGroup(groupScenarios)}>
                                        <GroupEyeIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                                <AccordionContent>
                                    <div className="space-y-2">
                                    {groupScenarios.map(scenario => {
                                        const isHidden = hiddenScenarioIds.has(scenario.id);
                                        const EyeIcon = isHidden ? EyeOff : Eye;
                                        return (
                                        <Card 
                                            key={scenario.id} 
                                            onMouseEnter={() => onScenarioHover(scenario.id)}
                                            onMouseLeave={() => onScenarioHover(null)}
                                            className={cn("border-l-4", isHidden && "opacity-50")}
                                            style={{ borderLeftColor: scenarioColors[scenario.id] || 'hsl(var(--border))' }}
                                        >
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
                                                <CardTitle className="text-sm font-medium">{scenario.name}</CardTitle>
                                                <div className="flex items-center space-x-1">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleScenario(scenario.id)} disabled={disabled}>
                                                        <EyeIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditScenario(scenario)} disabled={disabled}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    )})}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
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
