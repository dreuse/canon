window.matchMedia = (query) => ({
  media: query,
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
});
window.env = {};
