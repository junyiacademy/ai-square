/**
 * KSAKnowledgeGraph - Interactive force-directed graph visualization
 * Refactored version with extracted components and hooks
 * Target: ~200 lines (down from 513)
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { KSAKnowledgeGraphProps, GraphNode, GraphLink } from './graph-types';
import { CATEGORY_CONFIGS, GRAPH_COLORS, GRAPH_CONFIG, getCategoryColor, getScoreColor } from './graph-constants';
import { useGraphDimensions } from './useGraphDimensions';
import GraphZoomControls from './GraphZoomControls';
import GraphLegend from './GraphLegend';
import NodeDetailsPanel from './NodeDetailsPanel';

export default function KSAKnowledgeGraph({ ksaScores, title, ksaMapping }: KSAKnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const dimensions = useGraphDimensions(containerRef);

  // Render D3 force graph
  useEffect(() => {
    if (!svgRef.current) return;

    // Build graph data inline to avoid dependency issues
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodes: GraphNode[] = [
      { id: 'center', label: 'AI Literacy', category: 'center', fx: centerX, fy: centerY }
    ];

    CATEGORY_CONFIGS.forEach(cat => {
      const radius = Math.min(width, height) * GRAPH_CONFIG.layout.categoryRadiusMultiplier;
      nodes.push({
        id: cat.id,
        label: cat.label,
        category: cat.id,
        fx: centerX + radius * Math.cos(cat.angle),
        fy: centerY + radius * Math.sin(cat.angle)
      });
    });

    Object.entries(ksaScores).forEach(([ksa, data]) => {
      nodes.push({
        id: ksa,
        label: ksa,
        category: data.category,
        score: data.score
      });
    });

    const links: GraphLink[] = [];
    CATEGORY_CONFIGS.forEach(cat => {
      links.push({ source: 'center', target: cat.id });
    });
    Object.entries(ksaScores).forEach(([ksa, data]) => {
      links.push({ source: data.category, target: ksa });
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent(GRAPH_CONFIG.zoom.scaleExtent)
      .on('zoom', (event) => g.attr('transform', event.transform));

    zoomRef.current = zoom;
    svg.attr('width', width).attr('height', height).call(zoom);

    const g = svg.append('g');

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          const source = d.source as GraphNode;
          const baseDistance = Math.min(width, height) * GRAPH_CONFIG.force.linkDistanceMultiplier;
          return source.id === 'center' ? baseDistance * GRAPH_CONFIG.force.centerLinkMultiplier : baseDistance;
        })
      )
      .force('charge', d3.forceManyBody().strength(GRAPH_CONFIG.force.chargeStrength))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(Math.min(width, height) * GRAPH_CONFIG.force.collisionRadiusMultiplier));

    // Render links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', GRAPH_COLORS.link)
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // Render nodes
    const nodeRadius = Math.min(width, height) * GRAPH_CONFIG.node.baseRadiusMultiplier;
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .enter().append('g')
      .style('cursor', d => d.score !== undefined ? 'pointer' : 'move')
      .on('click', (event, d) => handleNodeClick(event, d, svg, zoom, width, height))
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (e, d) => dragstarted(e, d, simulation))
        .on('drag', (e, d) => dragged(e, d))
        .on('end', (e, d) => dragended(e, d, simulation)));

    // Node circles
    node.append('circle')
      .attr('r', d => {
        if (d.id === 'center') return nodeRadius * GRAPH_CONFIG.node.centerRadiusMultiplier;
        if (d.category === 'center') return nodeRadius * GRAPH_CONFIG.node.categoryRadiusMultiplier;
        return nodeRadius;
      })
      .attr('fill', d => {
        if (d.id === 'center') return GRAPH_COLORS.center;
        if (d.score !== undefined) return getScoreColor(d.score);
        return getCategoryColor(d.category);
      })
      .attr('stroke', d => getCategoryColor(d.category))
      .attr('stroke-width', GRAPH_CONFIG.node.strokeWidth)
      .attr('class', 'node-circle');

    // Node labels
    const fontSize = Math.min(width, height) * 0.02;
    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.id === 'center' || d.category === 'center' ? fontSize * 0.3 : -nodeRadius * 1.3)
      .attr('font-size', d => {
        if (d.id === 'center') return `${fontSize * 1.4}px`;
        if (d.category === 'center') return `${fontSize * 1.2}px`;
        return `${fontSize}px`;
      })
      .attr('font-weight', d => d.id === 'center' || d.category === 'center' ? 'bold' : 'normal')
      .attr('fill', d => d.id === 'center' ? 'white' : '#374151');

    // Node scores
    node.filter(d => d.score !== undefined)
      .append('text')
      .text(d => `${d.score}%`)
      .attr('text-anchor', 'middle')
      .attr('dy', fontSize * 0.3)
      .attr('font-size', `${fontSize * 1.2}px`)
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .style('pointer-events', 'none');

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Reset zoom on double click
    svg.on('dblclick.zoom', () => {
      svg.transition().duration(GRAPH_CONFIG.zoom.transitionDuration).call(zoom.transform, d3.zoomIdentity);
    });

    return () => {
      simulation.stop();
    };
  }, [ksaScores, dimensions]);

  // Update selection state
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll('.node-circle')
      .transition()
      .duration(GRAPH_CONFIG.animation.selectionDuration)
      .attr('stroke-width', function(d: unknown) {
        const node = d as GraphNode;
        return selectedNode && node.id === selectedNode.id ? GRAPH_CONFIG.node.selectedStrokeWidth : GRAPH_CONFIG.node.strokeWidth;
      })
      .attr('stroke', function(d: unknown) {
        const node = d as GraphNode;
        return selectedNode && node.id === selectedNode.id ? '#1f2937' : getCategoryColor(node.category);
      });
  }, [selectedNode]);

  // Event handlers
  const handleNodeClick = (event: MouseEvent, d: GraphNode, svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, zoom: d3.ZoomBehavior<SVGSVGElement, unknown>, width: number, height: number) => {
    event.stopPropagation();
    if (d.score !== undefined) {
      setSelectedNode(d);
      const scale = GRAPH_CONFIG.zoom.focusScale;
      const translate = [width / 2 - scale * (d.x || 0), height / 2 - scale * (d.y || 0)];
      svg.transition()
        .duration(GRAPH_CONFIG.zoom.transitionDuration)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }
  };

  const dragstarted = (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode, simulation: d3.Simulation<GraphNode, GraphLink>) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  const dragged = (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) => {
    d.fx = event.x;
    d.fy = event.y;
  };

  const dragended = (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode, simulation: d3.Simulation<GraphNode, GraphLink>) => {
    if (!event.active) simulation.alphaTarget(0);
    if (d.id !== 'center' && !CATEGORY_CONFIGS.some(c => c.id === d.id)) {
      d.fx = null;
      d.fy = null;
    }
  };

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.2);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.8);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(GRAPH_CONFIG.zoom.transitionDuration).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="relative">
            <svg ref={svgRef} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg" style={{ cursor: 'grab' }}></svg>
            <GraphZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetZoom} />
          </div>
          <GraphLegend />
        </div>

        <NodeDetailsPanel selectedNode={selectedNode} onClose={() => setSelectedNode(null)} ksaMapping={ksaMapping} />
      </div>
    </div>
  );
}
