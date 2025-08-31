/**
 * @jest-environment jsdom
 */

import { createDOM, userEvent } from '../test-utils';
import '@testing-library/jest-dom';

describe('Centralized UI Alert Container', () => {
  let dom, document, window, fplManager;

  beforeEach(async () => {
    dom = await createDOM();
    document = dom.document;
    window = dom.window;
    fplManager = dom.fplManager;

    // Clear prior calls
    window.alert.mockClear && window.alert.mockClear();
  });

  test('UIManager creates an alert container and showAlert displays message', () => {
    // Ensure container exists or is created
    let alertEl = document.querySelector('[data-testid="app-alert"]');
    // If not present in HTML, UIManager should create it during init
    if (!alertEl) {
      // trigger init in case lazy
      fplManager.ui.initElements();
      alertEl = document.querySelector('[data-testid="app-alert"]');
    }
    expect(alertEl).toBeTruthy();

    // Show an alert and verify contents/visibility
    fplManager.ui.showAlert('Test message', { timeout: 0 }); // no auto-hide for this assertion
    expect(alertEl).toHaveTextContent('Test message');
    expect(alertEl).toBeVisible();
  });

  test('showAlert auto-hides after timeout', () => {
    jest.useFakeTimers();
    const ensureAlert = () => {
      let el = document.querySelector('[data-testid="app-alert"]');
      if (!el) {
        fplManager.ui.initElements();
        el = document.querySelector('[data-testid="app-alert"]');
      }
      return el;
    };
    const alertEl = ensureAlert();

    fplManager.ui.showAlert('Will disappear', { timeout: 1500 });
    expect(alertEl).toBeVisible();

    // Fast-forward timers and expect it hidden
    jest.advanceTimersByTime(1600);
    expect(alertEl.style.display).toBe('none');
    jest.useRealTimers();
  });

  test('Rule violations use UI alert instead of native window.alert (team full)', async () => {
    const alertEl = document.querySelector('[data-testid="app-alert"]') || (()=>{ fplManager.ui.initElements(); return document.querySelector('[data-testid="app-alert"]'); })();

    // Build a full team of 15
    fplManager.players = Array.from({ length: 15 }).map((_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
      position: i < 2 ? 'goalkeeper' : i < 7 ? 'defence' : i < 12 ? 'midfield' : 'forward',
      team: 'T',
      price: 5,
      have: true,
      status: '',
      notes: ''
    }));

    // Add a 16th candidate not in team
    const extra = { id: 'extra', name: 'Extra', position: 'forward', team: 'X', price: 6, have: false, notes: '' };
    fplManager.players.push(extra);
    await fplManager.updateDisplay();

    // Attempt to toggle have -> should trigger alert container, not window.alert
    fplManager.toggleHave('extra');

    expect(window.alert).not.toHaveBeenCalled();
    expect(alertEl).toBeVisible();
    expect(alertEl).toHaveTextContent('You can only have 15 players in your team');
  });
});
