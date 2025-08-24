# Refactoring Opportunities for FPL Team Manager

This document outlines an analysis of the current codebase based on software design principles and provides recommendations for refactoring.

## Code Analysis

The current application is functional but exhibits several areas for improvement when evaluated against Clean Code, SOLID, and DRY principles. The primary issue is that the main [FPLTeamManager](./script.js) class has become a "God Class," violating the Single Responsibility Principle by handling too many concerns.

### 1. SOLID Principles

*   **Single Responsibility Principle (SRP): Violated**
    *   The [FPLTeamManager](./script.js) class is currently responsible for:
        *   **UI Management**: Directly manipulating the DOM, binding events, and rendering HTML (`initializeElements`, `bindEvents`, `updateDisplay`, `createPlayerRow`).
        *   **State Management**: Holding all application state (`players`, `captain`, `currentWeek`, etc.).
        *   **Business Logic**: Handling form submissions, player validation, filtering, and captaincy logic (`handleFormSubmit`, `getFilteredPlayers`).
        *   **Data Persistence**: Reading from and writing to `localStorage`, including data migration logic (`saveToStorage`, `loadFromStorage`, `migrateStorageIfNeeded`).
    *   This makes the class large, difficult to test, and hard to maintain. Changes in one area (e.g., UI) risk breaking logic in another (e.g., data storage).

### 2. DRY (Don't Repeat Yourself) Principle

*   **Repetitive Logic**:
    *   The read-only check `_isReadOnlyCurrentWeek()` is called at the beginning of almost every method that modifies data (`openModal`, `deletePlayer`, `setCaptain`, etc.). This could be centralized.
    *   The 15-player team limit check appears in both `handleFormSubmit` and `toggleHave`.
    *   Inline `onclick` handlers in the `createPlayerRow` method mix HTML and JavaScript, leading to repetitive and less maintainable code.

### 3. Clean Code Principles

*   **God Class**: As mentioned, [FPLTeamManager](./script.js) does too much.
*   **Large Methods**: Functions like `createPlayerRow` and `updateDisplay` are long and handle multiple, distinct tasks. For example, `updateDisplay` manages summary info, captaincy info, week controls, the empty state, and table rendering.
*   **HTML in JavaScript**: The `createPlayerRow` method builds a large, complex HTML string. This is difficult to read, debug, and maintain. It also violates the separation of concerns between structure (HTML) and behavior (JavaScript).
*   **Global Scope Pollution**: The application attaches multiple helper functions and the manager instance directly to the `window` object (`window.fplManager`, `window.fplManagerCreateNewWeek`, etc.). This is not a clean practice and can lead to naming conflicts.

## Refactoring Recommendations

To address these issues, a phased refactoring is recommended to improve the codebase's structure, testability, and maintainability.

### 1. Separate Concerns with New Classes

The core idea is to break down the [FPLTeamManager](./script.js) into smaller, more focused classes, each with a single responsibility.

*   **`UIManager`**: This class will be responsible for all DOM interactions.
    *   **How**: Move all methods that query or manipulate the DOM into this class. This includes element initialization, event binding, rendering updates, and modal handling.
    *   **Why**: This decouples the application logic from the presentation layer. The [FPLTeamManager](./script.js) will no longer need to know about specific DOM element IDs or structures. It will simply call methods on the `UIManager`, like `ui.renderPlayers(players)`.

*   **`StorageService`**: This class will handle all `localStorage` operations.
    *   **How**: Move `saveToStorage`, `loadFromStorage`, and `migrateStorageIfNeeded` into this service. It will expose a simple API like `storage.saveWeekData(week, data)` and `storage.loadWeekData(week)`.
    *   **Why**: This isolates the data persistence logic. If we decide to switch from `localStorage` to a database (like Firebase, as mentioned in the [README.md](./README.md)), we would only need to update this one service, without touching the rest of the application.

*   **[FPLTeamManager](./script.js) (Refactored)**: This class will become a central controller or orchestrator.
    *   **How**: Its primary role will be to manage the application state (players, captains, etc.) and coordinate actions between the `UIManager` and `StorageService`.
    *   **Why**: This adheres to the SRP, making the class smaller, more focused, and easier to understand.

### 2. Improve HTML Generation and Event Handling

*   **Use `<template>` for Player Rows**:
    *   **How**: Instead of building HTML strings in JavaScript, define the structure of a player row within a `<template>` tag in [index.html](./index.html). The `UIManager` can then clone this template, populate it with data, and append it to the table.
    *   **Why**: This cleanly separates HTML from JavaScript, making the row structure easier to modify and visualize. It also improves performance slightly as the browser parses the template only once.

*   **Use Event Delegation**:
    *   **How**: Instead of adding an `onclick` handler to every single button in the player table, add a single event listener to the table's `<tbody>`. This listener can inspect the `event.target` to determine which button was clicked (e.g., using `data-action` and `data-player-id` attributes).
    *   **Why**: This is more efficient, as it reduces the number of event listeners. It also simplifies the code for adding and removing players, as we no longer need to manually attach/detach handlers.

### 3. Centralize Business Logic

*   **Consolidate Validation**:\
    *   **How**: Create dedicated methods within [FPLTeamManager](./script.js) for validation logic, such as `canAddPlayerToTeam()` which would encapsulate the 15-player limit check.\
    *   **Why**: This removes duplicated code and makes business rules clearer and easier to manage.

This refactoring will result in a more robust, maintainable, and scalable application, making it easier to add new features in the future.