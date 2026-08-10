// Jest config used only by Stryker mutation runs.
//
// The base config registers `tdd-guard-jest`, `github-actions`, and
// `jest-junit` reporters. Under Stryker those fire once per mutant, which
// both slows the run and sprays junit XML into coverage/. `tdd-guard-jest`
// in particular enforces TDD discipline against code Stryker has
// deliberately broken, which is not a meaningful signal.
const base = require('./jest.config');

module.exports = {
  ...base,
  reporters: ['default'],
  collectCoverage: false,
};
