/**
 * D3 graph rendering hook
 */

import { useEffect, RefObject } from 'react';
import * as d3 from 'd3';
import { GraphNode, GraphLink, GraphData, GraphDimensions } from './types';
import { GRAPH_CONFIG, NODE_RADII, FORCE_CONFIG, COLORS, ANIMATION } from './constants';

function getNodeRadius(node: GraphNode): number {
  switch (node.type) {
    case 'domain': return node.id === 'center' ? NODE_RADII.center : NODE_RADII.domain;
    case 'competency': return NODE_RADII.competency;
    case 'ksa-theme': return NODE_RADII.ksaTheme;
    case 'ksa-code': return NODE_RADII.ksaCode;
    case 'ksa-subcode': return NODE_RADII.ksaSubcode;
    default: return NODE_RADII.default;
  }
}

function getTrafficLightColor(mastery: number): string {
  switch (mastery) {
    case 0: return COLORS.trafficLight.red;
    case 1: return COLORS.trafficLight.yellow;
    case 2: return COLORS.trafficLight.green;
    default: return COLORS.trafficLight.gray;
  }
}

function getNodeFill(node: GraphNode): string {
  if ((node.type === 'ksa-code' || node.type === 'ksa-subcode') && node.mastery !== undefined) {
    return getTrafficLightColor(node.mastery);
  }

  if (node.type === 'domain' && node.id === 'center') {
    const score = node.score || 0;
    if (score >= 80) return COLORS.score.high;
    if (score >= 60) return COLORS.score.medium;
    return COLORS.score.low;
  }

  switch (node.ksaType) {
    case 'knowledge': return COLORS.ksa.knowledge;
    case 'skills': return COLORS.ksa.skills;
    case 'attitudes': return COLORS.ksa.attitudes;
    default: return COLORS.ksa.default;
  }
}

export function useGraphRenderer(
  svgRef: RefObject<SVGSVGElement | null>,
  graphData: GraphData,
  dimensions: GraphDimensions,
  selectedNode: GraphNode | null,
  onNodeClick: (node: GraphNode) => void,
  dependencies: unknown[]
) {
  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const { nodes, links } = graphData;
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent(GRAPH_CONFIG.zoomExtent)
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => {
          const target = d.target as GraphNode;
          if (target.type === 'ksa-subcode') return FORCE_CONFIG.linkDistance.ksaSubcode;
          if (target.type === 'ksa-code') return FORCE_CONFIG.linkDistance.ksaCode;
          if (target.type === 'ksa-theme') return FORCE_CONFIG.linkDistance.ksaTheme;
          return FORCE_CONFIG.linkDistance.default;
        }))
      .force('charge', d3.forceManyBody<GraphNode>()
        .strength(d => {
          if (d.type === 'ksa-subcode') return FORCE_CONFIG.chargeStrength.ksaSubcode;
          if (d.type === 'ksa-code') return FORCE_CONFIG.chargeStrength.ksaCode;
          if (d.type === 'ksa-theme') return FORCE_CONFIG.chargeStrength.ksaTheme;
          return FORCE_CONFIG.chargeStrength.default;
        }))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide<GraphNode>()
        .radius(d => getNodeRadius(d) + FORCE_CONFIG.collisionRadius))
      .force('radial', d3.forceRadial<GraphNode>((d) => {
        if (d.type === 'ksa-theme') return FORCE_CONFIG.radialDistance.ksaTheme;
        if (d.type === 'ksa-code') return FORCE_CONFIG.radialDistance.ksaCode;
        if (d.type === 'ksa-subcode') return FORCE_CONFIG.radialDistance.ksaSubcode;
        return 0;
      }, dimensions.width / 2, dimensions.height / 2).strength(FORCE_CONFIG.radialStrength));

    // Add links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', COLORS.link)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value) * 2);

    // Add nodes
    const dragBehavior = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(ANIMATION.alphaTarget).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(dragBehavior as (selection: d3.Selection<d3.BaseType | SVGGElement, GraphNode, SVGGElement, unknown>) => void);

    // Add circles
    node.append('circle')
      .attr('r', getNodeRadius)
      .attr('fill', getNodeFill)
      .attr('stroke', d => selectedNode?.id === d.id ? COLORS.stroke.selected : COLORS.stroke.normal)
      .attr('stroke-width', d => selectedNode?.id === d.id ? 4 : 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d);

        // Zoom to node
        const scale = GRAPH_CONFIG.zoomLevel;
        const x = d.x || 0;
        const y = d.y || 0;
        const transform = d3.zoomIdentity
          .translate(dimensions.width / 2, dimensions.height / 2)
          .scale(scale)
          .translate(-x, -y);

        svg.transition()
          .duration(ANIMATION.transitionDuration)
          .call(zoom.transform, transform);
      });

    // Add labels
    node.append('text')
      .attr('dy', d => d.type === 'domain' && d.id === 'center' ? '.35em' : '-.8em')
      .attr('text-anchor', 'middle')
      .style('font-size', d => {
        if (d.type === 'domain') return d.id === 'center' ? '16px' : '14px';
        if (d.type === 'ksa-theme') return '14px';
        if (d.type === 'ksa-code') return '12px';
        if (d.type === 'ksa-subcode') return '11px';
        return '12px';
      })
      .style('font-weight', d => (d.type === 'domain' || d.type === 'ksa-theme') ? 'bold' : 'normal')
      .style('fill', d => {
        if (d.type === 'ksa-theme') return '#1f2937';
        if (d.type === 'ksa-code' || d.type === 'ksa-subcode') return '#374151';
        return '#111827';
      })
      .text(d => d.name);

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'knowledge-graph-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none');

    node
      .on('mouseover', (event, d) => {
        tooltip.transition().duration(ANIMATION.tooltipDelay).style('opacity', .9);
        let content = `<strong>${d.name}</strong><br/>`;

        if ((d.type === 'ksa-code' || d.type === 'ksa-subcode') && d.details) {
          const status = d.mastery === 2 ? '✅ 全對' :
                        d.mastery === 1 ? '⚠️ 部分正確' : '❌ 完全錯誤';
          content += `${status}<br/>答對: ${d.details.correct}/${d.details.total} 題<br/>`;
          if (d.details.summary) content += `<br/>${d.details.summary}`;
        }

        if (d.details?.explanation) {
          content += `<br/><em>${d.details.explanation}</em>`;
        }

        tooltip.html(content)
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', () => {
        tooltip.transition().duration(ANIMATION.tooltipFadeout).style('opacity', 0);
      });

    // Update positions
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode & {x: number}).x)
        .attr('y1', d => (d.source as GraphNode & {y: number}).y)
        .attr('x2', d => (d.target as GraphNode & {x: number}).x)
        .attr('y2', d => (d.target as GraphNode & {y: number}).y);

      node.attr('transform', d => `translate(${(d as GraphNode & {x: number}).x},${(d as GraphNode & {y: number}).y})`);
    });

    // Click background to reset zoom
    svg.on('click', () => {
      svg.transition()
        .duration(ANIMATION.transitionDuration)
        .call(zoom.transform, d3.zoomIdentity);
    });

    return () => {
      tooltip.remove();
    };
  }, dependencies);
}
