// Complete D3.js mock for testing
type ChainableMock = jest.Mock & {
  [key: string]: jest.Mock | unknown;
};

const createChainableMock = (): ChainableMock => {
  const mock = jest.fn() as ChainableMock;

  // All methods that should create new chainable mocks
  const chainingMethods = [
    "select",
    "selectAll",
    "append",
    "data",
    "enter",
    "exit",
    "merge",
    "transition",
    "remove",
    "join",
  ];

  // Methods that return this for continued chaining
  const thisMethods = [
    "attr",
    "style",
    "text",
    "on",
    "call",
    "classed",
    "duration",
    "delay",
    "ease",
    "interpolate",
    "property",
    "html",
    "raise",
    "lower",
    "sort",
    "order",
    "each",
    "filter",
  ];

  // Utility methods that return values
  // const utilityMethods = ['node', 'nodes', 'size', 'empty']; // Not used, methods added directly

  // Add chaining methods that return new mocks
  chainingMethods.forEach((method) => {
    mock[method] = jest.fn(() => createChainableMock());
  });

  // Add methods that return this
  thisMethods.forEach((method) => {
    mock[method] = jest.fn(() => mock);
  });

  // Add utility methods with specific return values
  mock.node = jest.fn(() => ({ tagName: "g" }));
  mock.nodes = jest.fn(() => []);
  mock.size = jest.fn(() => 0);
  mock.empty = jest.fn(() => true);

  return mock;
};

const createSimulationMock = () => {
  const mock: Record<string, unknown> = {
    force: jest.fn().mockReturnThis(),
    nodes: jest.fn().mockReturnThis(),
    links: jest.fn().mockReturnThis(),
    alpha: jest.fn().mockReturnThis(),
    alphaTarget: jest.fn().mockReturnThis(),
    alphaMin: jest.fn().mockReturnThis(),
    alphaDecay: jest.fn().mockReturnThis(),
    velocityDecay: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    restart: jest.fn().mockReturnThis(),
    tick: jest.fn().mockReturnThis(),
    find: jest.fn(),
  };
  return mock;
};

const createForceMock = () => ({
  strength: jest.fn().mockReturnThis(),
  distance: jest.fn().mockReturnThis(),
  radius: jest.fn().mockReturnThis(),
  x: jest.fn().mockReturnThis(),
  y: jest.fn().mockReturnThis(),
  id: jest.fn().mockReturnThis(),
  links: jest.fn().mockReturnThis(),
  iterations: jest.fn().mockReturnThis(),
});

type ZoomMock = jest.Mock & {
  transform: jest.Mock;
  scaleBy: jest.Mock;
  scaleTo: jest.Mock;
  translateBy: jest.Mock;
  scaleExtent: jest.Mock;
  extent: jest.Mock;
  translateExtent: jest.Mock;
  on: jest.Mock;
};

const createZoomMock = (): ZoomMock => {
  const mock = jest.fn() as ZoomMock;
  mock.transform = jest.fn();
  mock.scaleBy = jest.fn();
  mock.scaleTo = jest.fn();
  mock.translateBy = jest.fn();
  mock.scaleExtent = jest.fn().mockReturnThis();
  mock.extent = jest.fn().mockReturnThis();
  mock.translateExtent = jest.fn().mockReturnThis();
  mock.on = jest.fn().mockReturnThis();
  return mock;
};

const d3Mock = {
  select: jest.fn(() => createChainableMock()),
  selectAll: jest.fn(() => createChainableMock()),

  // Force simulation
  forceSimulation: jest.fn(() => createSimulationMock()),
  forceLink: jest.fn(() => createForceMock()),
  forceManyBody: jest.fn(() => createForceMock()),
  forceCenter: jest.fn(() => createForceMock()),
  forceCollide: jest.fn(() => createForceMock()),
  forceRadial: jest.fn(() => createForceMock()),
  forceX: jest.fn(() => createForceMock()),
  forceY: jest.fn(() => createForceMock()),

  // Zoom
  zoom: jest.fn(() => createZoomMock()),
  zoomIdentity: {
    translate: jest.fn(() => ({
      scale: jest.fn(() => ({})),
    })),
    k: 1,
    x: 0,
    y: 0,
  },

  // Drag
  drag: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    container: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    subject: jest.fn().mockReturnThis(),
    clickDistance: jest.fn().mockReturnThis(),
  })),

  // Scales
  scaleLinear: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    clamp: jest.fn().mockReturnThis(),
  })),

  scaleOrdinal: jest.fn(() => ({
    domain: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  })),

  // Other utilities
  event: null,
  mouse: jest.fn(() => [0, 0]),
  pointer: jest.fn(() => [0, 0]),

  // Colors
  schemeCategory10: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"],

  // Shapes
  arc: jest.fn(() => ({
    innerRadius: jest.fn().mockReturnThis(),
    outerRadius: jest.fn().mockReturnThis(),
    startAngle: jest.fn().mockReturnThis(),
    endAngle: jest.fn().mockReturnThis(),
  })),

  pie: jest.fn(() => ({
    value: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
  })),
};

// Export as both default and named exports for compatibility
export default d3Mock;
export const {
  select,
  selectAll,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  forceX,
  forceY,
  zoom,
  zoomIdentity,
  drag,
  scaleLinear,
  scaleOrdinal,
  schemeCategory10,
  arc,
  pie,
} = d3Mock;

// Also export as a namespace for import * as d3
module.exports = d3Mock;
