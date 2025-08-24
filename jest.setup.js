// Jest setup: stub browser dialogs for jsdom environment
// jsdom does not implement alert/confirm. Our app calls these in read-only guards
// and delete confirmations, which would otherwise log noisy "Not implemented" errors.
// We stub them here for all tests to keep output clean and deterministic.

beforeAll(() => {
  const w = global.window || global;

  // Ensure alert exists on window and global, then stub it
  if (typeof w.alert === 'undefined') {
    w.alert = () => {};
  }
  if (typeof global.alert === 'undefined') {
    global.alert = w.alert;
  }
  jest.spyOn(w, 'alert').mockImplementation(() => {});
  if (w !== global && typeof global.alert === 'function') {
    jest.spyOn(global, 'alert').mockImplementation(() => {});
  }

  // Ensure confirm exists on window and global, then stub it (default OK)
  if (typeof w.confirm === 'undefined') {
    w.confirm = () => true;
  }
  if (typeof global.confirm === 'undefined') {
    global.confirm = w.confirm;
  }
  jest.spyOn(w, 'confirm').mockImplementation(() => true);
  if (w !== global && typeof global.confirm === 'function') {
    jest.spyOn(global, 'confirm').mockImplementation(() => true);
  }
});
