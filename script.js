// Fantasy Premier League Team Manager
class FPLTeamManager {
    constructor() {
        this.players = [];
        this.currentEditingId = null;
        this.captain = null;
        this.viceCaptain = null;
        
        this.initializeElements();
        this.loadFromStorage();
        this.bindEvents();
        this.updateDisplay();
    }
    
    initializeElements() {
        // Main elements
        this.addPlayerBtn = document.getElementById('add-player-btn');
        this.playersTable = document.getElementById('players-table');
        this.playersTbody = document.getElementById('players-tbody');
        this.emptyState = document.getElementById('empty-state');
        this.positionFilter = document.getElementById('position-filter');
        this.haveFilter = document.getElementById('have-filter');
        
        // Summary elements
        this.teamCount = document.getElementById('team-count');
        this.totalValue = document.getElementById('total-value');
        this.captainInfo = document.getElementById('captain-info');
        this.viceCaptainInfo = document.getElementById('vice-captain-info');
        
        // Modal elements
        this.modal = document.getElementById('player-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.playerForm = document.getElementById('player-form');
        this.closeBtn = document.querySelector('.close');
        this.cancelBtn = document.getElementById('cancel-btn');
        
        // Form elements
        this.playerName = document.getElementById('player-name');
        this.playerPosition = document.getElementById('player-position');
        this.playerTeam = document.getElementById('player-team');
        this.playerPrice = document.getElementById('player-price');
        this.playerStatus = document.getElementById('player-status');
        this.playerHave = document.getElementById('player-have');
        this.playerNotes = document.getElementById('player-notes');
    }
    
    bindEvents() {
        // Add player button
        this.addPlayerBtn.addEventListener('click', () => this.openModal());
        
        // Modal close events
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        // Form submission
        this.playerForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Position filter
        this.positionFilter.addEventListener('change', () => this.updateDisplay());
        
        // Have filter
        this.haveFilter.addEventListener('change', () => this.updateDisplay());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }
    
    openModal(playerId = null) {
        this.currentEditingId = playerId;
        
        if (playerId) {
            const player = this.players.find(p => p.id === playerId);
            this.modalTitle.textContent = 'Edit Player';
            this.populateForm(player);
        } else {
            this.modalTitle.textContent = 'Add Player';
            this.clearForm();
        }
        
        this.modal.style.display = 'block';
        this.playerName.focus();
    }
    
    closeModal() {
        this.modal.style.display = 'none';
        this.currentEditingId = null;
        this.clearForm();
    }
    
    populateForm(player) {
        this.playerName.value = player.name;
        this.playerPosition.value = player.position;
        this.playerTeam.value = player.team;
        this.playerPrice.value = player.price;
        this.playerStatus.value = player.status;
        this.playerHave.checked = player.have || false;
        this.playerNotes.value = player.notes || '';
    }
    
    clearForm() {
        this.playerForm.reset();
        this.playerStatus.value = ''; // Default to no status
        this.playerHave.checked = false; // Default to not in team
    }
    
    handleFormSubmit(e) {
        e.preventDefault();
        
        const playerData = {
            name: this.playerName.value.trim(),
            position: this.playerPosition.value,
            team: this.playerTeam.value.trim(),
            price: parseFloat(this.playerPrice.value),
            status: this.playerStatus.value,
            have: this.playerHave.checked,
            notes: this.playerNotes.value.trim()
        };
        
        // Check 15 player limit for 'have' status
        if (playerData.have && !this.currentEditingId) {
            const currentTeamSize = this.players.filter(p => p.have).length;
            if (currentTeamSize >= 15) {
                alert('You can only have 15 players in your team. Please remove a player first.');
                return;
            }
        } else if (playerData.have && this.currentEditingId) {
            const currentPlayer = this.players.find(p => p.id === this.currentEditingId);
            const otherTeamPlayers = this.players.filter(p => p.have && p.id !== this.currentEditingId).length;
            if (!currentPlayer.have && otherTeamPlayers >= 15) {
                alert('You can only have 15 players in your team. Please remove a player first.');
                return;
            }
        }
        
        if (this.currentEditingId) {
            this.updatePlayer(this.currentEditingId, playerData);
        } else {
            this.addPlayer(playerData);
        }
        
        this.closeModal();
    }
    
    addPlayer(playerData) {
        const player = {
            id: Date.now().toString(),
            ...playerData
        };
        
        this.players.push(player);
        this.saveToStorage();
        this.updateDisplay();
    }
    
    updatePlayer(playerId, playerData) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            this.players[playerIndex] = { ...this.players[playerIndex], ...playerData };
            this.saveToStorage();
            this.updateDisplay();
        }
    }
    
    deletePlayer(playerId) {
        if (confirm('Are you sure you want to delete this player?')) {
            // Remove from captain/vice captain if applicable
            if (this.captain === playerId) this.captain = null;
            if (this.viceCaptain === playerId) this.viceCaptain = null;
            
            this.players = this.players.filter(p => p.id !== playerId);
            this.saveToStorage();
            this.updateDisplay();
        }
    }
    
    setCaptain(playerId) {
        // If already captain, remove captaincy
        if (this.captain === playerId) {
            this.captain = null;
        } else {
            // If this player was vice captain, remove that first
            if (this.viceCaptain === playerId) {
                this.viceCaptain = null;
            }
            this.captain = playerId;
        }
        
        this.saveToStorage();
        this.updateDisplay();
    }
    
    setViceCaptain(playerId) {
        // If already vice captain, remove vice captaincy
        if (this.viceCaptain === playerId) {
            this.viceCaptain = null;
        } else {
            // If this player was captain, remove that first
            if (this.captain === playerId) {
                this.captain = null;
            }
            this.viceCaptain = playerId;
        }
        
        this.saveToStorage();
        this.updateDisplay();
    }
    
    toggleHave(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        if (player.have) {
            // Remove from team
            player.have = false;
        } else {
            // Add to team - check 15 player limit
            const currentTeamSize = this.players.filter(p => p.have).length;
            if (currentTeamSize >= 15) {
                alert('You can only have 15 players in your team. Please remove a player first.');
                return;
            }
            player.have = true;
        }
        
        this.saveToStorage();
        this.updateDisplay();
    }
    
    getFilteredPlayers() {
        let filteredPlayers = this.players;
        
        // Filter by position
        const positionFilterValue = this.positionFilter.value;
        if (positionFilterValue !== 'all') {
            filteredPlayers = filteredPlayers.filter(player => player.position === positionFilterValue);
        }
        
        // Filter by "Have" status
        const haveFilterChecked = this.haveFilter.checked;
        if (haveFilterChecked) {
            filteredPlayers = filteredPlayers.filter(player => player.have === true);
        }
        
        return filteredPlayers;
    }
    
    updateDisplay() {
        const filteredPlayers = this.getFilteredPlayers();
        
        // Update summary
        this.updateSummary();
        
        // Update captaincy info
        this.updateCaptaincyInfo();
        
        // Show/hide empty state
        if (this.players.length === 0) {
            this.emptyState.style.display = 'block';
            this.playersTable.parentElement.style.display = 'none';
            return;
        } else {
            this.emptyState.style.display = 'none';
            this.playersTable.parentElement.style.display = 'block';
        }
        
        // Update table
        this.playersTbody.innerHTML = '';
        
        filteredPlayers.forEach(player => {
            const row = this.createPlayerRow(player);
            this.playersTbody.appendChild(row);
        });
        
        // Add click handlers for notes expansion
        this.addNotesClickHandlers();
    }
    
    createPlayerRow(player) {
        const row = document.createElement('tr');
        
        const isCaptain = this.captain === player.id;
        const isViceCaptain = this.viceCaptain === player.id;
        
        row.innerHTML = `
            <td><strong>${player.name}</strong></td>
            <td>${this.capitalizeFirst(player.position)}</td>
            <td>${player.team}</td>
            <td>£${player.price.toFixed(1)}m</td>
            <td style="text-align: center;">${player.status ? `<div class="status-circle status-${player.status}" title="${this.getStatusText(player.status)}"></div>` : ''}</td>
            <td style="text-align: center;">
                ${player.have ? `<span class="have-indicator" onclick="fplManager.toggleHave('${player.id}')" style="cursor: pointer;" title="Click to remove from team">✓</span>` : 
                  `<button class="btn btn-secondary" onclick="fplManager.toggleHave('${player.id}')" style="font-size: 10px; padding: 2px 6px;" title="Add to team">+</button>`}
            </td>
            <td>
                ${isCaptain ? '<span class="captain-badge">C</span>' : 
                  `<button class="btn btn-secondary" onclick="fplManager.setCaptain('${player.id}')" style="font-size: 10px; padding: 2px 6px;">C</button>`}
            </td>
            <td>
                ${isViceCaptain ? '<span class="vice-captain-badge">VC</span>' : 
                  `<button class="btn btn-secondary" onclick="fplManager.setViceCaptain('${player.id}')" style="font-size: 10px; padding: 2px 6px;">VC</button>`}
            </td>
            <td class="notes-cell" data-player-id="${player.id}" data-full-notes="${player.notes || ''}" title="Click to expand notes">
                <span class="notes-text">${this.truncateText(player.notes || '', 20)}</span>
            </td>
            <td>
                <button class="btn btn-edit" onclick="fplManager.openModal('${player.id}')">Edit</button>
                <button class="btn btn-danger" onclick="fplManager.deletePlayer('${player.id}')">Delete</button>
            </td>
        `;
        
        return row;
    }
    
    updateSummary() {
        const teamPlayers = this.players.filter(p => p.have);
        const teamCount = teamPlayers.length;
        const totalValue = teamPlayers.reduce((sum, player) => sum + player.price, 0);
        
        this.teamCount.textContent = `In Team: ${teamCount}/15`;
        this.totalValue.textContent = `Total Value: £${totalValue.toFixed(1)}m`;
    }
    
    updateCaptaincyInfo() {
        const captainPlayer = this.players.find(p => p.id === this.captain);
        const viceCaptainPlayer = this.players.find(p => p.id === this.viceCaptain);
        
        this.captainInfo.textContent = captainPlayer ? 
            `Captain: ${captainPlayer.name}` : 'Captain: None selected';
        
        this.viceCaptainInfo.textContent = viceCaptainPlayer ? 
            `Vice Captain: ${viceCaptainPlayer.name}` : 'Vice Captain: None selected';
    }
    
    getStatusText(status) {
        const statusMap = {
            'yellow': 'Maybe Good',
            'green': 'Very Good',
            'red': 'Sell/Don\'t Buy'
        };
        return statusMap[status] || status;
    }
    
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    saveToStorage() {
        const data = {
            players: this.players,
            captain: this.captain,
            viceCaptain: this.viceCaptain
        };
        localStorage.setItem('fpl-team-data', JSON.stringify(data));
    }
    
    addNotesClickHandlers() {
        const notesCells = document.querySelectorAll('.notes-cell');
        notesCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                this.toggleNotesExpansion(e.target.closest('.notes-cell'));
            });
        });
    }
    
    toggleNotesExpansion(cell) {
        const notesText = cell.querySelector('.notes-text');
        const fullNotes = cell.getAttribute('data-full-notes');
        const isExpanded = cell.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            notesText.textContent = this.truncateText(fullNotes, 20);
            cell.classList.remove('expanded');
            cell.title = 'Click to expand notes';
        } else {
            // Expand
            notesText.textContent = fullNotes || 'No notes';
            cell.classList.add('expanded');
            cell.title = 'Click to collapse notes';
        }
    }
    
    loadFromStorage() {
        const savedData = localStorage.getItem('fpl-team-data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.players = data.players || [];
                this.captain = data.captain || null;
                this.viceCaptain = data.viceCaptain || null;
            } catch (error) {
                console.error('Error loading data from storage:', error);
                this.players = [];
                this.captain = null;
                this.viceCaptain = null;
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fplManager = new FPLTeamManager();
});

// Load CSV data as initial players
document.addEventListener('DOMContentLoaded', () => {
    // Clear any existing data and load CSV data
    setTimeout(() => {
        if (window.fplManager) {
            // Clear existing data
            localStorage.removeItem('fpl-team-data');
            window.fplManager.players = [];
            window.fplManager.captain = null;
            window.fplManager.viceCaptain = null;
            
            // CSV data parsed from 2025-Table 1.csv
            const csvPlayers = [
                {name: 'Areola', position: 'goalkeeper', team: 'WHU', price: 4.5, have: true, notes: ''},
                {name: 'Kelleher', position: 'goalkeeper', team: 'BRE', price: 4.5, have: false, notes: 'first six home fixtures are incredibly tough'},
                {name: 'Petrovic', position: 'goalkeeper', team: 'BOU', price: 4.5, have: false, notes: 'Over Gameweeks 2-7, FOUR of Bournemouth\'s six fixtures are at home, with Wolverhampton Wanderers, Brighton & Hove Albion, Newcastle and Fulham the visitors.'},
                {name: 'Dubravka', position: 'goalkeeper', team: 'BUR', price: 4, have: true, notes: 'Dubravka could offer exceptional value due to his huge potential for save points, at the very least. It\'s a similar situation to Dubravka - Sunderland\'s loan signing from Chelsea is there to essentially sit on your bench and at least offers the security of starts if he is called upon.'},
                {name: 'Matz Sels', position: 'goalkeeper', team: 'NFO', price: 5, have: false, notes: 'favourable early schedule. favourable early schedule'},
                {name: 'Sanchez', position: 'goalkeeper', team: 'CHE', price: 5, have: false, notes: 'favourable early schedule'},
                {name: 'Pickford', position: 'goalkeeper', team: 'EVE', price: 5.5, have: false, notes: 'best last season'},
                {name: 'Esteve', position: 'defence', team: 'BUR', price: 4, have: false, notes: 'for bench'},
                {name: 'Rodon', position: 'defence', team: 'LEE', price: 4, have: false, notes: 'defensive contribution points this season boosts centre-backs playing for promoted clubs, such as Leeds United\'s Rodon. eing a centre-back for a newly-promoted club, he carries obvious DC points potential. Opponents Everton struggled for goals last season, too.'},
                {name: 'Seelt', position: 'defence', team: 'SUN', price: 4, have: false, notes: ''},
                {name: 'van de Ven', position: 'defence', team: 'TOT', price: 4.5, have: true, notes: 'Easy games to begin with At present, centre-back Micky van de Ven (£4.5m) is the most secure of them, although one of Destiny Udogie or Djed Spence (both £4.5m) is expected to claim the left-back berth.'},
                {name: 'Wan-Bissaka', position: 'defence', team: 'WHU', price: 4.5, have: true, notes: 'His form under Graham Potter last season shows just why. The right wing-back supplied five assists after Potter was appointed head coach in Gameweek 20, more than any other defender in Fantasy.'},
                {name: 'El Hadji Malick Diouf', position: 'defence', team: 'WHU', price: 4.5, have: false, notes: 'Alternative to Wan Bissaka major attacking potential from his role as a left wing-back.'},
                {name: 'Konsa', position: 'defence', team: 'AVL', price: 4.5, have: false, notes: 'Historically, however, the centre-back has offered very little threat going forward. With just 11 attacking returns over his six seasons at Villa, Konsa\'s backers may have to solely rely on clean sheets.'},
                {name: 'Neco Williams', position: 'defence', team: 'NFO', price: 5, have: true, notes: 'full back. favourable early schedule'},
                {name: 'Ola Aina', position: 'defence', team: 'NFO', price: 5, have: false, notes: 'full back. favourable early schedule'},
                {name: 'Milenkovic', position: 'defence', team: 'NFO', price: 5.5, have: true, notes: 'maybe worht the extra Milenkovic clearly carries the main goal threat of the two. His five goals and 27 shots in the box were both more than TWICE Murillo\'s respective totals of two and 13. Milenkovic\'s far superior goal threat gives him the edge, and his ownership of only eight per cent makes him a great differential. favourable early schedule'},
                {name: 'Murillo', position: 'defence', team: 'NFO', price: 5.5, have: false, notes: 'maybe worht the extra Yet the latter is far more likely to produce defensive contribution points; Murillo would have tallied 38 of them last season, compared with the 26 of Milenkovic.'},
                {name: 'Palhinha', position: 'defence', team: 'TOT', price: 5.5, have: false, notes: 'defensive midfielder'},
                {name: 'Romero\'s', position: 'defence', team: 'TOT', price: 5, have: false, notes: 'aerial ability at set-pieces,'},
                {name: 'Porro', position: 'defence', team: 'TOT', price: 5.5, have: false, notes: 'all-round threat of any Spurs defender attacking beasts'},
                {name: 'Tarkowski', position: 'defence', team: 'EVE', price: 5.5, have: false, notes: ''},
                {name: 'Cucurella', position: 'defence', team: 'CHE', price: 6, have: true, notes: 'favourable early schedule'},
                {name: 'Gvardiol', position: 'defence', team: 'MCI', price: 6, have: false, notes: 'are among the premium defenders with strong early-to-mid-term schedules.'},
                {name: 'Ait Nouri', position: 'defence', team: 'MCI', price: 6, have: false, notes: 'are among the premium defenders with strong early-to-mid-term schedules. . The Algerian delivered 11 attacking returns last season – more than any defender – and now looks set to occupy the left-back berth, with Gvardiol taking up a centre-back role.'},
                {name: 'Chalobah', position: 'defence', team: 'CHE', price: 5, have: false, notes: 'markedly cheaper if you\'re seeking out value early on. favourable early schedule'},
                {name: 'Colwill', position: 'defence', team: 'CHE', price: 5, have: false, notes: 'markedly cheaper if you\'re seeking out value early on. favourable early schedule'},
                {name: 'van Dij', position: 'defence', team: 'LIV', price: 6, have: false, notes: ''},
                {name: 'Gabriel', position: 'defence', team: 'ARS', price: 6, have: false, notes: 'tough early runs of opponents.'},
                {name: 'Munoz', position: 'defence', team: 'CRY', price: 5.5, have: false, notes: 'tough early runs of opponents. attacking beasts'},
                {name: 'Hall', position: 'defence', team: 'NEW', price: 5.5, have: false, notes: 'But as a left-back choice for your FPL squads after the opening few games, he could be a really good pick. tough early runs of opponents.'},
                {name: 'De Cuyper', position: 'defence', team: 'BHA', price: 4.5, have: false, notes: 'Brighton & Hove Albion\'s new left-back has the attacking potential to be a fixture-proof asset in Fantasy. not favorable schedule'},
                {name: 'Johnson', position: 'defence', team: '', price: 7, have: false, notes: ''},
                {name: 'Caicedo', position: 'midfield', team: 'CHE', price: 5.5, have: false, notes: 'would have been the top-scoring midfielder for this metric last season. favourable early schedule'},
                {name: 'Dewsbury-Hall', position: 'midfield', team: 'EVE', price: 5, have: false, notes: 'Dewsbury-Hall looks set to become a regular for David Moyes\' side following his move from Chelsea. He could be handed a No 10 role in a 4-2-3-1 formation and will now contend with Dwight McNeil (£6.0m) for set-piece duties. favourable early schedule'},
                {name: 'Sarr', position: 'midfield', team: 'TOT', price: 6.5, have: false, notes: 'Sarr, meanwhile, has been Spurs\' form player over the summer under new head coach Thomas Frank. The Senegalese has scored three goals while playing as a No 10 and could now start the season in that position, with James Maddison (£7.0m) ruled out for an extended period after he ruptured his Anterior Cruciate Ligament (ACL). favourable early schedule'},
                {name: 'Kudus', position: 'midfield', team: 'TOT', price: 6.5, have: true, notes: 'Kudus is likely to play on Spurs\' right flank after signing from West Ham United over the summer, while Ndiaye is expected to continue as Everton\'s first-choice penalty-taker. favourable early schedule'},
                {name: 'Ndiaye', position: 'midfield', team: 'EVE', price: 6.5, have: false, notes: 'expected to continue as Everton\'s first-choice penalty-taker.'},
                {name: 'Malen', position: 'midfield', team: 'AVL', price: 5.5, have: true, notes: 'favourable early schedule'},
                {name: 'Wilson', position: 'midfield', team: 'FUL', price: 5.5, have: false, notes: ''},
                {name: 'Amad', position: 'midfield', team: 'MNU', price: 6.5, have: false, notes: 'A cost of just £6.5m looks great value as a route into the Manchester United attack, with eight goals and eight assists underlining Amad\'s all-round potential.'},
                {name: 'Fernandez', position: 'midfield', team: 'CHE', price: 6.5, have: false, notes: 'favourable early schedule'},
                {name: 'Anderson', position: 'midfield', team: 'NFO', price: 5.5, have: true, notes: 'defensive points. favourable early schedule'},
                {name: 'Palhinha', position: 'midfield', team: 'TOT', price: 5.5, have: false, notes: 'favourable early schedule'},
                {name: 'Rodri', position: 'midfield', team: 'MCI', price: 6.5, have: false, notes: 'defensive points, NON STARTER'},
                {name: 'Baleba', position: 'midfield', team: 'BHA', price: 5, have: false, notes: 'registered four attacking returns. He would also have returned 30 defensive contribution points.'},
                {name: 'Wharton', position: 'midfield', team: 'CRY', price: 5, have: false, notes: ''},
                {name: 'Salah\'s', position: 'midfield', team: 'LIV', price: 14.5, have: true, notes: ''},
                {name: 'Wirtz', position: 'midfield', team: 'LIV', price: 8.5, have: true, notes: 'outperformed Salah over Liverpool\'s summer friendlies so far.'},
                {name: 'Gakpo', position: 'midfield', team: 'LIV', price: 7.5, have: false, notes: 'outperformed Salah over Liverpool\'s summer friendlies so far.'},
                {name: 'Palmer', position: 'midfield', team: 'CHE', price: 10.5, have: false, notes: 'Crucially, Palmer offers a great armband alternative to Salah in Gameweeks 2-3, in particular. favourable early schedule'},
                {name: 'Marmoush', position: 'midfield', team: 'LIV', price: 8.5, have: false, notes: 'Meanwhile, Omar Marmoush (£8.5m) offers you a significant saving of £5.5m over Erling Haaland (£14.0m) as a route into Manchester City attack. We think it would be worth waiting to see if he becomes a regular before adding him to your teams. differential'},
                {name: 'Saka', position: 'midfield', team: 'ARS', price: 10, have: false, notes: 'Arsenal\'s Bukayo Saka (£10.0m) and Manchester United\'s Bruno Fernandes (£9.0m) could struggle to justify their hefty price tags in the early stages as they have far tougher schedules.'},
                {name: 'Fernandes', position: 'midfield', team: 'MUN', price: 9, have: false, notes: 'Arsenal\'s Bukayo Saka (£10.0m) and Manchester United\'s Bruno Fernandes (£9.0m) could struggle to justify their hefty price tags in the early stages as they have far tougher schedules. Fernandes, nonetheless, boasts the superior form of the two over pre-season, with three goals and an assist to his name.'},
                {name: 'Eze', position: 'midfield', team: 'CRY', price: 7.5, have: false, notes: 'among the best options in the sub-£8.0m bracket but he does have a somewhat mixed run of opponents. not favorable schedule'},
                {name: 'Kluivert', position: 'midfield', team: 'BOU', price: 7, have: false, notes: 'favourable early schedule'},
                {name: 'Semenyo', position: 'midfield', team: 'BOU', price: 7, have: false, notes: 'favourable early schedule'},
                {name: 'Rogers', position: 'midfield', team: 'AVL', price: 7, have: false, notes: ''},
                {name: 'Malen', position: 'midfield', team: 'AVL', price: 5.5, have: false, notes: 'better value'},
                {name: 'Reijnders', position: 'midfield', team: 'MCI', price: 5.5, have: false, notes: 'His two goals against Palermo in Manchester City\'s final pre-season match suggest the Dutchman can offer outstanding value in his debut Fantasy campaign.'},
                {name: 'MITOMA', position: 'midfield', team: 'BHA', price: 6.5, have: false, notes: 'perhaps the most sensible medium-term Brighton midfield option.'},
                {name: 'DAMSGAARD', position: 'midfield', team: 'BRE', price: 6, have: false, notes: 'pretty secure for starts'},
                {name: 'Rice', position: 'midfield', team: 'ARS', price: 6.5, have: false, notes: 'meh'},
                {name: 'Cherki', position: 'midfield', team: 'MCI', price: 6.5, have: false, notes: 'As well as that, the addition of Rayan Cherki (£6.5m) might impact the minutes Marmoush gets. He\'s also sitting on a higher price than any of the other Manchester City midfield options.'},
                {name: 'Guiu', position: 'forward', team: 'SUN', price: 4.5, have: false, notes: 'starting the season with a 3-5-2 formation is gaining momentum.'},
                {name: 'Isak', position: 'forward', team: 'NEW', price: 10.5, have: false, notes: 'Isak didn\'t feature over pre-season for the Magpies, with reports linking with a move to Liverpool.'},
                {name: 'Fullkrug', position: 'forward', team: 'WHU', price: 6, have: false, notes: 'The German claimed three goals, scoring once in each of the Hammers\' final three friendlies. With an ownership currently under 4.0%, Fullkrug looks like a decent alternative for those Fantasy managers who can\'t afford Bowen, who has been re-classified from a midfielder to a forward this season.'},
                {name: 'Bowen', position: 'forward', team: 'WHU', price: 8, have: true, notes: 'Fullkrug offers a £2.0m saving over his team-mate Jarrod Bowen (£8.0m), who has been re-classified from a midfielder to a forward this season.'},
                {name: 'Thiago', position: 'forward', team: 'BRE', price: 6, have: false, notes: ''},
                {name: 'Strand Larsen', position: 'forward', team: 'WOF', price: 6.5, have: false, notes: 'The Norwegian will now be Wolverhampton Wanderers\' No 1 penalty-taker following Matheus Cunha\'s (£8.0m) move to Man Utd.'},
                {name: 'Welbeck', position: 'forward', team: 'BHA', price: 6.5, have: false, notes: 'Brighton & Hove Albion\'s Danny Welbeck could also be boosted by penalty duties for the same reason.'},
                {name: 'Pedro', position: 'forward', team: 'CHE', price: 7.5, have: true, notes: 'Chelsea avoid all of last season\'s top seven clubs in the first six Gameweeks, a run that looks very promising for a double-up on Cole Palmer (£10.5m) and Joao Pedro in attack. favourable early schedule'},
                {name: 'Delap', position: 'forward', team: 'CHE', price: 6.5, have: false, notes: 'It is, nonetheless, likely that the Blues\' other new forward, Liam Delap (£6.5m), could be introduced later on in matches as head coach Enzo Maresca opts for fresh legs up front. favourable early schedule'},
                {name: 'Mateta', position: 'forward', team: 'CRY', price: 7.5, have: false, notes: 'As evidenced by his converted effort against Liverpool in the FA Community Shield on Sunday, the Frenchman also appears to be back on penalty duties again. not favorable schedule'},
                {name: 'Wood', position: 'forward', team: 'NFO', price: 7.5, have: false, notes: 'team not in form with forwards'},
                {name: 'Evanilson', position: 'forward', team: 'BOU', price: 7, have: false, notes: ''},
                {name: 'Watkins', position: 'forward', team: 'AVL', price: 9, have: true, notes: 'consider Malen instead. favourable early schedule'},
                {name: 'Ekitike', position: 'forward', team: 'LIV', price: 8.5, have: false, notes: ''},
                {name: 'Gyokeres', position: 'forward', team: 'ARS', price: 9, have: false, notes: 'Gyokeres is the one to monitor most as he could be on penalties for the Gunners.'}
            ];
            
            // Set captain based on CSV data
            let captainPlayerId = null;
            
            csvPlayers.forEach((playerData, index) => {
                const player = {
                    id: `csv_${Date.now()}_${index}`,
                    ...playerData
                };
                
                // Check if this player is the captain (Salah's in the CSV)
                if (playerData.name === 'Salah\'s') {
                    captainPlayerId = player.id;
                }
                
                window.fplManager.players.push(player);
            });
            
            // Set captain
            window.fplManager.captain = captainPlayerId;
            
            window.fplManager.saveToStorage();
            window.fplManager.updateDisplay();
        }
    }, 100);
});
