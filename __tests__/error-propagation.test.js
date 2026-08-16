/**
 * Tests covering error propagation for previously silent failures.
 */

import PlayerService from '../js/services/player-service.js';
import CaptaincyService from '../js/services/captaincy-service.js';
import { WeekModel } from '../js/models/week-model.js';
import { createDefaultRoot } from '../js/storage-module.js';
import { handleAppError } from '../js/utils/error-handler.js';
import UIManager from '../js/ui-manager.js';

describe('PlayerService missing-player operations', () => {
  let service;
  let root;

  beforeEach(() => {
    service = new PlayerService({ getRootData: jest.fn(), setRootData: jest.fn() });
    root = createDefaultRoot();
  });

  it('rejects updates for an unknown player', async () => {
    await expect(service.updatePlayer(root, 'missing', { name: 'X' })).rejects.toThrow(/not found/);
  });

  it('rejects deletes for an unknown player', async () => {
    await expect(service.deletePlayer(root, 'missing')).rejects.toThrow(/not found/);
  });

  it('rejects have toggles for an unknown player', async () => {
    await expect(service.toggleHave(root, 'missing')).rejects.toThrow(/not found/);
  });
});

describe('CaptaincyService validation', () => {
  let service;
  let root;

  beforeEach(() => {
    service = new CaptaincyService({ getRootData: jest.fn(), setRootData: jest.fn() });
    root = createDefaultRoot();
  });

  it('throws when the captain id does not exist', () => {
    expect(() => service.setCaptain(root, 'missing')).toThrow(/not found/);
  });

  it('throws when the vice-captain id does not exist', () => {
    expect(() => service.setViceCaptain(root, 'missing')).toThrow(/not found/);
  });

  it('throws when the current week is unreadable', () => {
    root.weeks = {};
    expect(() => service.setCaptain(root, 'missing')).toThrow(/could not be read/);
  });
});

describe('WeekModel.clone', () => {
  it('throws instead of returning null when data cannot be serialized', () => {
    const circular = { weekNumber: 1 };
    circular.self = circular;
    expect(() => WeekModel.clone(circular)).toThrow(TypeError);
  });
});

describe('handleAppError user notification', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the message through the provided UI manager', () => {
    const ui = { showAlert: jest.fn() };
    handleAppError(new Error('boom'), { userMessage: 'Could not save', ui });
    expect(ui.showAlert).toHaveBeenCalledWith('Could not save');
  });

  it('falls back to the alert container when no UI manager is available', () => {
    document.body.innerHTML = '<div data-testid="app-alert" style="display:none"></div>';
    handleAppError(new Error('boom'), { userMessage: 'Could not save' });
    const container = document.querySelector('[data-testid="app-alert"]');
    expect(container.textContent).toBe('Could not save');
    expect(container.style.display).toBe('block');
  });
});

describe('UIManager.showAlert', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div data-testid="app-alert" style="display:none"></div>';
  });

  it('displays and then auto-hides the message', async () => {
    const ui = new UIManager();
    ui.showAlert('Something failed', { timeout: 10 });

    const container = document.querySelector('[data-testid="app-alert"]');
    expect(container.textContent).toBe('Something failed');
    expect(container.style.display).toBe('block');

    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(container.style.display).toBe('none');
    expect(container.textContent).toBe('');
  });

  it('keeps the message visible when no timeout is requested', () => {
    const ui = new UIManager();
    ui.showAlert('Persistent failure', { timeout: null });

    const container = document.querySelector('[data-testid="app-alert"]');
    expect(container.style.display).toBe('block');

    ui.hideAlert();
    expect(container.style.display).toBe('none');
  });
});
