import { createDOM, userEvent } from '../test-utils';
import '@testing-library/jest-dom';

describe('Player Management', () => {
  let container, fplManager, document, window;
  
  beforeEach(async () => {
    // Set up the DOM and get the fplManager instance
    const dom = await createDOM();
    container = dom.document.body;
    document = dom.document;
    window = dom.window;
    fplManager = dom.fplManager;
    
    // Clear any existing data before each test
    window.localStorage.clear();
    fplManager.players = [];
    fplManager.captain = null;
    fplManager.viceCaptain = null;
    await fplManager.updateDisplay();
  });

  test('should add a new player successfully', async () => {
    // Open the add player modal
    const addButton = document.querySelector('[data-testid="add-player-button"]');
    await userEvent.click(addButton, window);
    
    // Wait for modal to be created
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Get modal elements from the manager's UI instance
    const modal = fplManager.ui.modal;
    console.log('Modal found in add test:', !!modal);
    expect(modal).not.toBeNull();
    
    // Fill out the form
    await userEvent.type(modal.querySelector('[data-testid="player-name-input"]'), 'Test Player', window);
    await userEvent.select(modal.querySelector('[data-testid="player-position-select"]'), 'midfield', window);
    await userEvent.type(modal.querySelector('[data-testid="player-team-input"]'), 'TST', window);
    await userEvent.type(modal.querySelector('[data-testid="player-price-input"]'), '8.5', window);
    await userEvent.select(modal.querySelector('[data-testid="player-status-select"]'), 'green', window);
    
    // Submit the form
    const form = modal.querySelector('#player-form');
    await userEvent.submit(form, window);
    
    // Wait for the async storage operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if the player was added by getting data directly from storage
    const players = await fplManager.getPlayers();
    expect(players.length).toBe(1);
    expect(players[0].name).toBe('Test Player');
    expect(players[0].position).toBe('midfield');
    expect(players[0].team).toBe('TST');
    expect(players[0].price).toBe(8.5);
    expect(players[0].status).toBe('green');
  });

  test('should show validation errors for required fields', async () => {
    const addButton = document.querySelector('[data-testid="add-player-button"]');
    await userEvent.click(addButton, window);
    
    // Try to submit without filling required fields
    const form = document.querySelector('#player-form');
    
    // Check form validity before submission
    const nameInput = document.querySelector('[data-testid="player-name-input"]');
    const positionSelect = document.querySelector('[data-testid="player-position-select"]');
    const teamInput = document.querySelector('[data-testid="player-team-input"]');
    const priceInput = document.querySelector('[data-testid="player-price-input"]');
    
    // Verify fields are empty and invalid
    expect(nameInput.value).toBe('');
    expect(positionSelect.value).toBe('');
    expect(teamInput.value).toBe('');
    expect(priceInput.value).toBe('');
    
    // Check that required fields show as invalid
    expect(nameInput.validity.valueMissing).toBe(true);
    expect(positionSelect.validity.valueMissing).toBe(true);
    expect(teamInput.validity.valueMissing).toBe(true);
    expect(priceInput.validity.valueMissing).toBe(true);
    
    // The form should not be valid
    expect(form.checkValidity()).toBe(false);
    
    // Try to submit - this should not add a player due to validation
    await userEvent.submit(form, window);
    
    // Check that no player was added (the app should prevent submission)
    expect(fplManager.players.length).toBe(0);
  });

  test('should edit an existing player', async () => {
    // First add a player using the async API
    const testPlayer = {
      id: 'test-1',
      name: 'Original Name',
      position: 'defence',
      team: 'TST',
      price: 5.0,
      have: false,
      notes: ''
    };
    
    await fplManager.addPlayer(testPlayer);
    await fplManager.updateDisplay();
    
    // Wait for DOM updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    
    // Open the edit modal
    const editButton = document.querySelector(`[data-action="edit"][data-player-id="${testPlayer.id}"]`);
    expect(editButton).not.toBeNull(); // Ensure button exists
    await userEvent.click(editButton, window);
    
    // Wait for modal to be created
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Get modal elements from the manager's UI instance
    const modal = fplManager.ui.modal;
    expect(modal).not.toBeNull();
    
    // Update the player's name
    const nameInput = modal.querySelector('[data-testid="player-name-input"]');
    await userEvent.clear(nameInput, window);
    await userEvent.type(nameInput, 'Original Name Updated', window);
    
    // Submit the form
    const form = modal.querySelector('#player-form');
    await userEvent.submit(form, window);
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check that the player was updated using async API
    const players = await fplManager.getPlayers();
    expect(players[0].name).toBe('Original Name Updated');
  });

  test('should delete a player', async () => {
    // First add a player using the async API
    const testPlayer = {
      id: 'test-delete',
      name: 'Player to Delete',
      position: 'forward',
      team: 'TST',
      price: 7.5,
      have: false,
      notes: ''
    };
    
    await fplManager.addPlayer(testPlayer);
    await fplManager.updateDisplay();
    
    // Wait for DOM updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock confirm to return true before clicking
    const confirmSpy = jest.fn(() => true);
    window.confirm = confirmSpy;
    global.confirm = confirmSpy;
    
    // Click the delete button and confirm
    const deleteButton = document.querySelector(`[data-action="delete"][data-player-id="${testPlayer.id}"]`);
    expect(deleteButton).not.toBeNull(); // Ensure button exists
    await userEvent.click(deleteButton, window);
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check that the player was deleted using async API
    const players = await fplManager.getPlayers();
    expect(players.length).toBe(0);
    expect(confirmSpy).toHaveBeenCalled();
  });
});
