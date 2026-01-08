module.exports = {
  default: (config) => ({
    className: `__variable_${Math.random().toString(36).substring(7)}`,
    style: {
      fontFamily: config.variable || "mock-font",
    },
    variable: config.variable,
  }),
};
