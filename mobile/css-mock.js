// Metro can't resolve .module.css files in React Native bundles.
// This mock is returned instead of any .css import so bundling succeeds.
module.exports = {};
