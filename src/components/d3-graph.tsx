"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import type { UIElement, UIFlow } from '@/lib/types';

interface D3GraphProps {
  elements: UIElement[];
  flows: UIFlow[];
  onNodeClick: (element: UIElement) => void;
}

const D3Graph: React.FC<D3GraphProps> = ({ elements, flows, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined>>();

  const flowColorScale = useMemo(() => 
    d3.scaleOrdinal(d3.schemeCategory10), [flows]);

  useEffect(() => {
    if (!svgRef.current || elements.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svg.node()!.getBoundingClientRect().width;
    const height = svg.node()!.getBoundingClientRect().height;
    
    svg.selectAll('*').remove();

    const container = svg.append('g');
    
    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Arrowhead marker definition
    container.append('defs').selectAll('marker')
      .data(flows.map(f => f.id))
      .join('marker')
        .attr('id', d => `arrow-${d}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', d => flowColorScale(d));

    const nodes = elements.map(d => ({ ...d }));
    const links: any[] = [];
    flows.forEach(flow => {
      for (let i = 0; i < flow.elementIds.length - 1; i++) {
        links.push({
          source: flow.elementIds[i],
          target: flow.elementIds[i + 1],
          flowId: flow.id,
        });
      }
    });

    if (!simulationRef.current) {
        simulationRef.current = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(60));
    } else {
        simulationRef.current.nodes(nodes as d3.SimulationNodeDatum[]);
        (simulationRef.current.force('link') as d3.ForceLink<any, any>).links(links);
    }
    
    const simulation = simulationRef.current;

    const link = container.append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')
        .attr('stroke-width', 2.5)
        .attr('stroke', d => flowColorScale(d.flowId))
        .attr('marker-end', d => `url(#arrow-${d.flowId})`);

    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'cursor-pointer')
      .on('click', (event, d) => onNodeClick(d))
      .call(drag(simulation));

    node.append('circle')
      .attr('r', 30)
      .attr('fill', 'hsl(var(--card))')
      .attr('stroke', d => d.isBuggy ? 'hsl(var(--destructive))' : 'hsl(var(--primary))')
      .attr('stroke-width', d => d.isBuggy ? 4 : 2.5);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', 'hsl(var(--foreground))')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .text(d => d.name.length > 12 ? d.name.substring(0, 10) + '...' : d.name);
      
    node.append("title")
        .text(d => d.name);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    simulation.alpha(0.3).restart();

    return () => {
        simulation.stop();
    };

  }, [elements, flows, onNodeClick, flowColorScale]);

  const drag = (simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) => {
    function dragstarted(event: d3.D3DragEvent<any, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: d3.D3DragEvent<any, any, any>, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: d3.D3DragEvent<any, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
  }

  return <svg ref={svgRef} className="w-full h-full"></svg>;
};

export default D3Graph;
