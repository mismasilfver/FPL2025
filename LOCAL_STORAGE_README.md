# FPL App: Local Database Implementation Guide

This guide outlines how to implement a local-only database for the Fantasy Premier League app, providing persistence beyond browser localStorage without requiring online access.

## Overview

Three recommended local database options:

1. **SQLite with Node.js backend**: File-based SQL database (recommended)
2. **IndexedDB with Dexie.js**: Enhanced browser storage
3. **LowDB with Express**: Simple JSON file storage, perfect for single user. No concurrent access.

## Benefits

- Data persistence without browser localStorage limitations
- No internet connection required
- No authentication needed
- Full data ownership and privacy
- Easy backup (single file database)

## Implementation Options

## Option 1: SQLite with Express Backend (Recommended)

### Prerequisites

- Node.js installed
- Basic knowledge of JavaScript/Node.js

### Setup Steps

1. **Create project structure**:
   ```
   FPL2025/
   ├── public/           # Frontend static files
   │   ├── index.html
   │   ├── styles.css
   │   └── script.js     # Modified frontend code
   ├── server.js         # Express + SQLite server
   ├── database.js       # Database access module
   ├── package.json
   └── fpl_data.db       # SQLite database file
   ```

2. **Install dependencies**:
   ```bash
   npm init -y
   npm install express better-sqlite3 cors
   ```

3. **Create database module** (`database.js`):
   ```javascript
   const sqlite3 = require('better-sqlite3');
   const path = require('path');
   const fs = require('fs');

   // Create data directory if it doesn't exist
   const dataDir = path.join(__dirname, 'data');
   if (!fs.existsSync(dataDir)) {
     fs.mkdirSync(dataDir);
   }

   // Connect to database
   const db = sqlite3(path.join(dataDir, 'fpl_data.db'));

   // Initialize database schema
   function initializeDatabase() {
     // Create tables if they don't exist
     db.exec(`
       CREATE TABLE IF NOT EXISTS players (
         id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         position TEXT NOT NULL,
         team TEXT NOT NULL,
         price REAL NOT NULL,
         have INTEGER,
         status TEXT,
         notes TEXT
       );
       
       CREATE TABLE IF NOT EXISTS captaincy (
         id INTEGER PRIMARY KEY CHECK (id = 1),
         captain TEXT,
         viceCaptain TEXT,
         FOREIGN KEY (captain) REFERENCES players (id),
         FOREIGN KEY (viceCaptain) REFERENCES players (id)
       );
     `);
     
     // Insert default captaincy row if it doesn't exist
     const captaincy = db.prepare('SELECT * FROM captaincy WHERE id = 1').get();
     if (!captaincy) {
       db.prepare('INSERT INTO captaincy (id, captain, viceCaptain) VALUES (1, NULL, NULL)').run();
     }
   }

   // Get all players
   function getPlayers() {
     return db.prepare('SELECT * FROM players').all();
   }

   // Save a player
   function savePlayer(player) {
     const stmt = db.prepare(`
       INSERT OR REPLACE INTO players (id, name, position, team, price, have, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     `);
     
     stmt.run(
       player.id,
       player.name,
       player.position,
       player.team,
       player.price,
       player.have ? 1 : 0,
       player.status || '',
       player.notes || ''
     );
     
     return player;
   }

   // Delete a player
   function deletePlayer(id) {
     db.prepare('DELETE FROM players WHERE id = ?').run(id);
   }

   // Get captaincy
   function getCaptaincy() {
     return db.prepare('SELECT captain, viceCaptain FROM captaincy WHERE id = 1').get();
   }

   // Set captain
   function setCaptain(captainId) {
     db.prepare('UPDATE captaincy SET captain = ? WHERE id = 1').run(captainId);
   }

   // Set vice captain
   function setViceCaptain(viceCaptainId) {
     db.prepare('UPDATE captaincy SET viceCaptain = ? WHERE id = 1').run(viceCaptainId);
   }

   // Initialize database on module load
   initializeDatabase();

   module.exports = {
     getPlayers,
     savePlayer,
     deletePlayer,
     getCaptaincy,
     setCaptain,
     setViceCaptain
   };
   ```

4. **Create Express server** (`server.js`):
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const path = require('path');
   const db = require('./database');

   const app = express();
   const port = process.env.PORT || 3000;

   // Middleware
   app.use(cors());
   app.use(express.json());
   app.use(express.static(path.join(__dirname, 'public')));

   // API Routes

   // Get all players
   app.get('/api/players', (req, res) => {
     try {
       const players = db.getPlayers();
       res.json(players);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });

   // Add or update player
   app.post('/api/players', (req, res) => {
     try {
       const player = req.body;
       if (!player.id || !player.name || !player.position || !player.team || !player.price) {
         return res.status(400).json({ error: 'Missing required player fields' });
       }
       
       const savedPlayer = db.savePlayer(player);
       res.json(savedPlayer);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });

   // Delete player
   app.delete('/api/players/:id', (req, res) => {
     try {
       db.deletePlayer(req.params.id);
       res.json({ success: true });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });

   // Get captaincy info
   app.get('/api/captaincy', (req, res) => {
     try {
       const captaincy = db.getCaptaincy();
       res.json(captaincy);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });

   // Set captain
   app.put('/api/captaincy/captain', (req, res) => {
     try {
       const { captainId } = req.body;
       db.setCaptain(captainId);
       res.json({ success: true, captain: captainId });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });

   // Set vice captain
   app.put('/api/captaincy/viceCaptain', (req, res) => {
     try {
       const { viceCaptainId } = req.body;
       db.setViceCaptain(viceCaptainId);
       res.json({ success: true, viceCaptain: viceCaptainId });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });

   // Start server
   app.listen(port, () => {
     console.log(`FPL Manager server running at http://localhost:${port}`);
   });
   ```

5. **Modify frontend code** (`public/script.js`):
   ```javascript
   // API endpoints
   const API_URL = 'http://localhost:3000/api';
   
   class FPLManager {
     // ... your existing code ...
     
     // Modified loadData method - replace localStorage
     async loadData() {
       try {
         // Load players
         const playersResponse = await fetch(`${API_URL}/players`);
         this.players = await playersResponse.json();
         
         // Load captaincy
         const captaincyResponse = await fetch(`${API_URL}/captaincy`);
         const captaincy = await captaincyResponse.json();
         this.captain = captaincy.captain;
         this.viceCaptain = captaincy.viceCaptain;
       } catch (error) {
         console.error('Error loading data:', error);
         // Optional: Fallback to localStorage
         const savedData = localStorage.getItem('fplData');
         if (savedData) {
           const data = JSON.parse(savedData);
           this.players = data.players || [];
           this.captain = data.captain || null;
           this.viceCaptain = data.viceCaptain || null;
         }
       }
       this.updateDisplay();
     }
     
     // Modified saveData method - replace localStorage
     async saveData() {
       try {
         // Save each player
         for (const player of this.players) {
           await fetch(`${API_URL}/players`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(player)
           });
         }
         
         // Save captaincy
         if (this.captain) {
           await fetch(`${API_URL}/captaincy/captain`, {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ captainId: this.captain })
           });
         }
         
         if (this.viceCaptain) {
           await fetch(`${API_URL}/captaincy/viceCaptain`, {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ viceCaptainId: this.viceCaptain })
           });
         }
       } catch (error) {
         console.error('Error saving data:', error);
         // Optional: Fallback to localStorage
         localStorage.setItem('fplData', JSON.stringify({
           players: this.players,
           captain: this.captain,
           viceCaptain: this.viceCaptain
         }));
       }
     }
     
     // Modified deletePlayer method
     async deletePlayer(id) {
       // ... existing code ...
       try {
         await fetch(`${API_URL}/players/${id}`, { method: 'DELETE' });
       } catch (error) {
         console.error('Error deleting player:', error);
       }
       // ... existing code ...
     }
   }
   ```

6. **Run the application**:
   ```bash
   node server.js
   ```
   Access your app at: http://localhost:3000

## Option 2: IndexedDB with Dexie.js

### Prerequisites

- Modern web browser
- No server setup required

### Setup Steps

1. **Install Dexie.js**:
   ```html
   <!-- Add to your HTML head -->
   <script src="https://unpkg.com/dexie@3.2.3/dist/dexie.js"></script>
   ```

2. **Create database module** (`indexeddb.js`):
   ```javascript
   // IndexedDB wrapper using Dexie
   const db = new Dexie('FplDatabase');

   // Define database schema
   db.version(1).stores({
     players: 'id, name, position, team, price, have, status',
     captaincy: 'id, captain, viceCaptain'
   });

   // Initialize captaincy record
   db.on('ready', async () => {
     // Create default captaincy entry if it doesn't exist
     const count = await db.captaincy.count();
     if (count === 0) {
       await db.captaincy.add({
         id: 1,
         captain: null,
         viceCaptain: null
       });
     }
   });

   // Database API
   const FplDb = {
     // Get all players
     async getPlayers() {
       return await db.players.toArray();
     },
     
     // Save player
     async savePlayer(player) {
       await db.players.put(player);
       return player;
     },
     
     // Delete player
     async deletePlayer(id) {
       await db.players.delete(id);
     },
     
     // Get captaincy
     async getCaptaincy() {
       return await db.captaincy.get(1);
     },
     
     // Set captain
     async setCaptain(captainId) {
       await db.captaincy.update(1, { captain: captainId });
     },
     
     // Set vice captain
     async setViceCaptain(viceCaptainId) {
       await db.captaincy.update(1, { viceCaptain: viceCaptainId });
     }
   };
   ```

3. **Modify your FPL Manager class**:
   ```javascript
   class FPLManager {
     // ... your existing code ...
     
     // Modified loadData method
     async loadData() {
       try {
         // Load players
         this.players = await FplDb.getPlayers();
         
         // Load captaincy
         const captaincy = await FplDb.getCaptaincy();
         this.captain = captaincy.captain;
         this.viceCaptain = captaincy.viceCaptain;
       } catch (error) {
         console.error('Error loading data:', error);
         // Optional: Fallback to localStorage
       }
       this.updateDisplay();
     }
     
     // Modified saveData method
     async saveData() {
       try {
         // Save each player
         for (const player of this.players) {
           await FplDb.savePlayer(player);
         }
         
         // Save captaincy
         if (this.captain) {
           await FplDb.setCaptain(this.captain);
         }
         
         if (this.viceCaptain) {
           await FplDb.setViceCaptain(this.viceCaptain);
         }
       } catch (error) {
         console.error('Error saving data:', error);
         // Optional: Fallback to localStorage
       }
     }
     
     // ... rest of your code ...
   }
   ```

## Option 3: LowDB with Express

### Prerequisites

- Node.js installed
- Basic knowledge of JavaScript/Node.js

### Setup Steps

1. **Install dependencies**:
   ```bash
   npm init -y
   npm install express cors lowdb@1.0.0
   ```

2. **Create server** (`server.js`):
   ```javascript
   const express = require('express');
   const cors = require('cors');
   const path = require('path');
   const low = require('lowdb');
   const FileSync = require('lowdb/adapters/FileSync');

   const app = express();
   const port = process.env.PORT || 3000;

   // Setup lowdb
   const adapter = new FileSync('fpl_data.json');
   const db = low(adapter);

   // Initialize db with default data
   db.defaults({ 
     players: [],
     captaincy: { captain: null, viceCaptain: null }
   }).write();

   // Middleware
   app.use(cors());
   app.use(express.json());
   app.use(express.static(path.join(__dirname, 'public')));

   // API Routes
   
   // Get all players
   app.get('/api/players', (req, res) => {
     const players = db.get('players').value();
     res.json(players);
   });

   // Add or update player
   app.post('/api/players', (req, res) => {
     const player = req.body;
     
     // Check if player exists
     const existingPlayer = db.get('players')
       .find({ id: player.id })
       .value();
     
     if (existingPlayer) {
       // Update existing player
       db.get('players')
         .find({ id: player.id })
         .assign(player)
         .write();
     } else {
       // Add new player
       db.get('players')
         .push(player)
         .write();
     }
     
     res.json(player);
   });

   // Delete player
   app.delete('/api/players/:id', (req, res) => {
     db.get('players')
       .remove({ id: req.params.id })
       .write();
     
     res.json({ success: true });
   });

   // Get captaincy
   app.get('/api/captaincy', (req, res) => {
     const captaincy = db.get('captaincy').value();
     res.json(captaincy);
   });

   // Set captain
   app.put('/api/captaincy/captain', (req, res) => {
     const { captainId } = req.body;
     
     db.set('captaincy.captain', captainId)
       .write();
     
     res.json({ success: true, captain: captainId });
   });

   // Set vice captain
   app.put('/api/captaincy/viceCaptain', (req, res) => {
     const { viceCaptainId } = req.body;
     
     db.set('captaincy.viceCaptain', viceCaptainId)
       .write();
     
     res.json({ success: true, viceCaptain: viceCaptainId });
   });

   // Start server
   app.listen(port, () => {
     console.log(`FPL Manager server running at http://localhost:${port}`);
   });
   ```

3. **Frontend modifications** - Same as the SQLite example above, using the same API endpoints.

## Running Tests with a Local Database

To run tests with a local database implementation:

1. **Create a test database configuration**:
   ```javascript
   // test-database.js
   const sqlite3 = require('better-sqlite3');
   const db = sqlite3(':memory:'); // In-memory database for testing
   
   // ... rest of your database code ...
   ```

2. **Update Jest configuration** in `package.json`:
   ```json
   "jest": {
     "testEnvironment": "node",
     "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"]
   }
   ```

3. **Create Jest setup file** (`jest.setup.js`):
   ```javascript
   // Mock the database module
   jest.mock('./database.js', () => require('./test-database.js'));
   ```

4. **Update your tests** to work with the API endpoints instead of direct localStorage manipulation.

## Conclusion

Any of these implementations will provide a robust local database solution for your FPL app without relying on browser localStorage. The SQLite approach offers the best combination of performance, reliability, and ease of use for a local-only application.

To get started quickly, implement Option 1 (SQLite) as it provides the best balance of features and simplicity for your use case.
