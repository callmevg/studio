"use client";

import React, { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bug, FileJson, GitFork, Plus, Upload } from "lucide-react";
import type { UIElement, UIFlow } from '@/lib/types';

interface DashboardProps {
  elements: UIElement[];
  flows: UIFlow[];
  onAddElement: () => void;
  onAddFlow: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Dashboard({
  elements,
  flows,
  onAddElement,
  onAddFlow,
  onExport,
  onImport,
}: DashboardProps) {
  const buggyElementsCount = useMemo(() => elements.filter(el => el.isBuggy).length, [elements]);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="w-80 border-r bg-background flex flex-col p-4 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flows</CardTitle>
            <GitFork className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buggy Elements</CardTitle>
            <Bug className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${buggyElementsCount > 0 ? 'text-destructive' : ''}`}>
              {buggyElementsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              out of {elements.length} elements
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Separator />

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Manage</h3>
        <Button onClick={onAddElement} className="w-full justify-start">
          <Plus className="mr-2 h-4 w-4" /> Add Element
        </Button>
        <Button onClick={onAddFlow} className="w-full justify-start">
          <Plus className="mr-2 h-4 w-4" /> Add Flow
        </Button>
      </div>
      
      <Separator />

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Data</h3>
        <Button onClick={onExport} variant="outline" className="w-full justify-start">
          <FileJson className="mr-2 h-4 w-4" /> Export Data
        </Button>
        <Button onClick={() => importInputRef.current?.click()} variant="outline" className="w-full justify-start">
          <Upload className="mr-2 h-4 w-4" /> Import Data
        </Button>
        <input
          type="file"
          ref={importInputRef}
          className="hidden"
          accept=".json"
          onChange={onImport}
        />
      </div>
    </div>
  );
}
