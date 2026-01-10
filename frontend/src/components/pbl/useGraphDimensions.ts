/**
 * Hook to manage graph dimensions with responsive behavior
 * Extracted from KSAKnowledgeGraph.tsx
 */

import { useEffect, useState, RefObject } from "react";
import { GraphDimensions } from "./graph-types";
import { GRAPH_CONFIG } from "./graph-constants";

/**
 * Custom hook to calculate and manage responsive graph dimensions
 * @param containerRef - Reference to the container element
 * @returns Current width and height for the graph
 */
export function useGraphDimensions(
  containerRef: RefObject<HTMLDivElement | null>,
): GraphDimensions {
  const [dimensions, setDimensions] = useState<GraphDimensions>({
    width: 800,
    height: 600,
  });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const newWidth = width - GRAPH_CONFIG.layout.padding;
        const newHeight = Math.min(
          600,
          newWidth * GRAPH_CONFIG.layout.aspectRatio,
        );

        setDimensions((prev) => {
          // Only update if dimensions actually changed to avoid infinite loops
          if (prev.width !== newWidth || prev.height !== newHeight) {
            return { width: newWidth, height: newHeight };
          }
          return prev;
        });
      }
    };

    // Initial calculation
    handleResize();

    // Listen to window resize
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, [containerRef]); // Include containerRef for proper dependency tracking

  return dimensions;
}
