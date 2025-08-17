# My Fantasy Premier League 2025/2026

A simple, responsive web application to manage your Fantasy Premier League team. Perfect for tracking players, prices, and team strategy on both desktop and mobile devices.

## Features

- **Player Management**: Add, edit, and delete players from your team
- **Required Fields**: Player name, position (Goalkeeper/Defence/Midfield/Forward), team, and price
- **Optional Fields**: Captain/Vice Captain selection and personal notes
- **Color-coded Status System**:
  - 🟡 Yellow: Maybe Good
  - 🟢 Green: Very Good
  - 🔴 Red: Sell/Don't Buy
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Local Storage**: Your data persists between sessions
- **Position Filtering**: Filter players by position
- **Team Summary**: Track total players (0/15) and total team value

## How to Use

1. **Add Players**: Click "Add Player" to add new players to your team
2. **Edit Players**: Click "Edit" next to any player to modify their details
3. **Set Captain**: Click "C" button to set/unset captain
4. **Set Vice Captain**: Click "VC" button to set/unset vice captain
5. **Filter**: Use the position dropdown to filter by player position
6. **Delete**: Click "Delete" to remove players from your team

## Running Locally

To run this project on your local machine:

1.  **Clone the repository or download the files.**
2.  **Navigate to the project directory** in your terminal.
3.  **Start a simple web server.** If you have Python 3 installed, you can use its built-in HTTP server:
    ```bash
    python3 -m http.server 8080
    ```
4.  **Open your browser** and go to `http://localhost:8080`.

Alternatively, you can simply open the `index.html` file directly in your web browser.

## Testing

This project includes a comprehensive test suite to ensure functionality works correctly.

### Prerequisites

- **Node.js** (version 14 or higher) must be installed on your system
- You can download Node.js from [nodejs.org](https://nodejs.org/)

### Running Tests

1. **Install dependencies** (first time only):
   ```bash
   npm install
   ```

2. **Run the test suite**:
   ```bash
   npm test
   ```

### Test Coverage

The test suite includes:
- **Player Management Tests**: Adding, editing, and deleting players
- **Form Validation Tests**: Required field validation and error handling
- **Captaincy Tests**: Setting and switching captain/vice-captain roles
- **UI Interaction Tests**: Button clicks and form submissions

All tests use Jest with JSDOM for DOM simulation and comprehensive coverage of user interactions.

## Deployment to GitHub Pages

1. Create a new repository on GitHub
2. Upload these files: `index.html`, `styles.css`, `script.js`, and `README.md`
3. Go to repository Settings → Pages
4. Select "Deploy from a branch" and choose "main" branch
5. Your app will be available at `https://yourusername.github.io/repository-name`

## Files Structure

- `index.html` - Main HTML structure
- `styles.css` - Responsive CSS styling
- `script.js` - JavaScript functionality and data management
- `README.md` - This documentation
- `__tests__/` - Test files for Jest
- `test-utils.js` - Testing utilities and helpers
- `package.json` - Node.js dependencies and scripts
- `babel.config.js` - Babel configuration for testing

## Browser Compatibility

Works on all modern browsers including:
- Chrome/Edge (Desktop & Mobile)
- Safari (Desktop & Mobile)
- Firefox (Desktop & Mobile)

## Data Storage

All data is stored locally in your browser using localStorage. No external database required.

## Future roadmap ideas
- proper database to allow multidevice usage
- authentication to protect data to myself only
- managing week history

## Potential implementation of database and authentication
- use firebase for database
- use firebase authentication for authentication
- added two readme files on the topic and options

---

**Note**: This is an MVP (Minimum Viable Product) version. All player and team data must be entered manually.
