// Israeli Whist Game Implementation - Complete Rebuild
// Following proper Israeli Whist rules with 3 phases

class IsraeliWhist {
    constructor() {
        this.players = ['north', 'east', 'south', 'west'];
        this.playerName = 'Player'; // Human player's name (default)
        this.botNames = {
            north: 'Botti (N)',
            east: 'Droidi (E)',
            south: this.playerName, // Will be updated when player enters name
            west: 'Chati (W)'
        };
        this.currentDealer = 0; // North starts as dealer
        this.currentRound = 1; // Track current round
        this.deck = [];
        this.hands = {
            north: [],
            east: [],
            south: [],
            west: []
        };
        this.scores = {
            north: 0,
            east: 0,
            south: 0,
            west: 0
        };
        this.cumulativeScores = {
            north: 0,
            east: 0,
            south: 0,
            west: 0
        };
        this.gamletsPlayed = 0;
        this.gamletHistory = []; // Track individual gamlet data for scorecard
        this.extendedViewActive = false; // Track which view is currently shown
        
        // Gamlet history tracking
        this.gamletHistory = [];
        this.gamletNumber = 1;
        this.fullGameNumber = 1; // Track full games (200 points or 10 gamlets)
        
        // Last hand data for review
        this.lastHandData = null;
        
        // Fast mode setting
        this.fastMode = false;
        

        
        // Phase 1 - Trump bidding
        this.phase1Bids = {
            north: null,
            east: null,
            south: null,
            west: null
        };
        this.trumpWinner = null;
        this.trumpSuit = null;
        this.minimumTakes = 0;
        
        // Phase 2 - Takes bidding 
        this.phase2Bids = {
            north: null,
            east: null,
            south: null,
            west: null
        };
        
        // Phase 3 - Playing
        this.tricksWon = {
            north: 0,
            east: 0,
            south: 0,
            west: 0
        };
        this.currentTrick = [];
        this.trickLeader = 2;
        this.tricksPlayed = 0;
        
        // Game state
        this.currentPhase = 'dealing'; // dealing, phase1, phase2, phase3, scoring
        this.currentBidder = null;
        this.passCount = 0;
        this.playersPassed = {
            north: false,
            east: false,
            south: false,
            west: false
        };
        this.cardsDisplayed = false; // Flag to prevent redrawing cards
         this.handType = null; // 'over' or 'under' based on Phase 2 total
        
        // Button selection state
        this.selectedTricks = null;
        this.selectedSuit = null;
        this.phase2BiddingExpanded = false; // Track if user has expanded Phase 2 bidding view
        
        // Advanced AI System - More conservative bots
        this.botMemory = {
            cardsSeen: [], // All cards seen during play
            playerPatterns: {
                north: { biddingStyle: 'conservative', accuracy: 0.8, riskTolerance: 0.2, learningData: [] }, // Botti is very conservative
                east: { biddingStyle: 'balanced', accuracy: 0.75, riskTolerance: 0.4, learningData: [] }, // Droidi is more balanced
                south: { biddingStyle: 'human', accuracy: 0.6, riskTolerance: 0.5, learningData: [] },
                west: { biddingStyle: 'conservative', accuracy: 0.75, riskTolerance: 0.25, learningData: [] } // Chati is conservative too
            },
            gameHistory: [], // Historical data for learning
            cardsPlayed: { north: [], east: [], south: [], west: [] },
            suitDistribution: { clubs: 13, diamonds: 13, hearts: 13, spades: 13 },
            probabilityModel: {
                remainingCards: {},
                playerLikelyHoldings: { north: {}, east: {}, south: {}, west: {} }
            }
        };
        
        this.bindEvents();
        this.initializeGame();
    }

    initializeGame() {
        // Check if we have a cached name
        const cachedName = localStorage.getItem('israeliWhist_playerName');
        
        // Show name modal first (it will auto-fill the cached name if available)
        this.showNameModal();
        
        // Initialize hint system
        this.initializeHintSystem();
    }

    startGameWithName(playerName) {
        this.playerName = playerName || 'Player';
        
        // Cache the player name in localStorage for future games
        if (playerName && playerName.trim()) {
            localStorage.setItem('israeliWhist_playerName', playerName.trim());
        }
        
        // Hide name modal
        document.getElementById('name-modal').style.display = 'none';
        
        // Ensure hands are properly initialized
        this.hands = {
            north: [],
            east: [],
            south: [],
            west: []
        };
        
        this.shuffleDeck();
        
        // Update botNames for south player before updating displays
        this.botNames.south = `${this.playerName} (S)`;
        
        this.updateDisplay();
        this.updateScoresDisplay();
        this.updatePlayerNameDisplay();
        
        // Verify initialization
        if (this.deck.length !== 52 || Object.keys(this.hands).length !== 4) {
            console.error('Game initialization failed');
        }
    }

    shuffleDeck() {
        this.deck = [];
        const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        // Create a standard 52-card deck
        for (const suit of suits) {
            for (let i = 0; i < ranks.length; i++) {
                const card = {
                    suit: suit,
                    rank: ranks[i],
                    value: i + 2
                };
                
                // Validate card before adding
                if (card.suit && card.rank && typeof card.value === 'number') {
                    this.deck.push(card);
                } else {
                    console.error('Invalid card created during shuffle:', card);
                }
            }
        }
        
        // Comprehensive deck validation
        if (!this.validateDeck()) {
            console.error('Deck validation failed! Recreating deck...');
            this.deck = [];
            // Recreate deck if validation failed
            for (const suit of suits) {
                for (let i = 0; i < ranks.length; i++) {
                    this.deck.push({
                        suit: suit,
                        rank: ranks[i],
                        value: i + 2
                    });
                }
            }
        }
        
        // Final verification
        if (this.deck.length !== 52) {
            console.error('CRITICAL: Deck creation failed, expected 52 cards, got:', this.deck.length);
            return;
        }
        
        // Shuffle using Fisher-Yates algorithm
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        
        
    }
    
    validateDeck() {
        // Check total count
        if (this.deck.length !== 52) {
            console.error(`❌ Invalid deck size: ${this.deck.length}, expected 52`);
            return false;
        }
        
        const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        // Count cards per suit
        const suitCounts = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
        const rankCounts = {};
        
        // Initialize rank counts
        ranks.forEach(rank => {
            rankCounts[rank] = 0;
        });
        
        // Check each card and count
        for (const card of this.deck) {
            // Validate card structure
            if (!card.suit || !card.rank || typeof card.value !== 'number') {
                console.error('❌ Invalid card structure:', card);
                return false;
            }
            
            if (!suits.includes(card.suit)) {
                console.error('❌ Invalid suit:', card.suit);
                return false;
            }
            
            if (!ranks.includes(card.rank)) {
                console.error('❌ Invalid rank:', card.rank);
                return false;
            }
            
            // Validate value matches rank
            const expectedValue = ranks.indexOf(card.rank) + 2;
            if (card.value !== expectedValue) {
                console.error(`❌ Invalid value for ${card.rank}: expected ${expectedValue}, got ${card.value}`);
                return false;
            }
            
            // Count this card
            suitCounts[card.suit]++;
            rankCounts[card.rank]++;
        }
        
        // Verify exactly 13 cards per suit
        for (const suit of suits) {
            if (suitCounts[suit] !== 13) {
                console.error(`❌ Invalid suit count for ${suit}: ${suitCounts[suit]}, expected 13`);

                return false;
            }
        }
        
        // Verify exactly 4 cards per rank
        for (const rank of ranks) {
            if (rankCounts[rank] !== 4) {
                console.error(`❌ Invalid rank count for ${rank}: ${rankCounts[rank]}, expected 4`);

                return false;
            }
        }
        
        // Check for duplicates by creating a set of card identifiers
        const cardIds = this.deck.map(card => `${card.rank}_${card.suit}`);
        const uniqueCardIds = new Set(cardIds);
        
        if (cardIds.length !== uniqueCardIds.size) {
            console.error('❌ Deck contains duplicate cards');
            const duplicates = cardIds.filter((card, index) => cardIds.indexOf(card) !== index);
            console.error('Duplicate cards:', duplicates);
            return false;
        }
        
        return true;
    }
    
    validateDealing() {
        
        const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        // Check each player has exactly 13 cards
        const expectedCardsPerPlayer = 13;
        let totalCardsDealt = 0;
        
        for (const player of this.players) {
            const handSize = this.hands[player].length;
            totalCardsDealt += handSize;
            
            if (handSize !== expectedCardsPerPlayer) {
                console.error(`❌ ${player} has ${handSize} cards, expected ${expectedCardsPerPlayer}`);
                return false;
            }
        }
        
        // Check total cards dealt
        if (totalCardsDealt !== 52) {
            console.error(`❌ Total cards dealt: ${totalCardsDealt}, expected 52`);
            return false;
        }
        
        // Count all dealt cards by suit and rank
        const globalSuitCounts = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
        const globalRankCounts = {};
        const allDealtCards = [];
        
        // Initialize rank counts
        ranks.forEach(rank => {
            globalRankCounts[rank] = 0;
        });
        
        // Collect and count all cards
        for (const player of this.players) {
            for (const card of this.hands[player]) {
                const cardId = `${card.rank}_${card.suit}`;
                
                // Check for duplicates
                if (allDealtCards.includes(cardId)) {
                    console.error(`❌ Duplicate card found: ${card.rank} of ${card.suit}`);
                    return false;
                }
                allDealtCards.push(cardId);
                
                // Count by suit and rank
                globalSuitCounts[card.suit]++;
                globalRankCounts[card.rank]++;
            }
        }
        
        // Verify exactly 13 cards per suit were dealt
        for (const suit of suits) {
            if (globalSuitCounts[suit] !== 13) {
                console.error(`❌ Invalid dealt suit count for ${suit}: ${globalSuitCounts[suit]}, expected 13`);

                return false;
            }
        }
        
        // Verify exactly 4 cards per rank were dealt
        for (const rank of ranks) {
            if (globalRankCounts[rank] !== 4) {
                console.error(`❌ Invalid dealt rank count for ${rank}: ${globalRankCounts[rank]}, expected 4`);

                return false;
            }
        }
        
        // Check remaining deck
        if (this.deck.length !== 0) {
            console.error(`❌ Deck should be empty after dealing, but has ${this.deck.length} cards remaining`);
            return false;
        }
        
        return true;
    }

    dealCards() {
          
          // Hide the deal button after it's clicked
          const dealBtn = document.getElementById('deal-btn');
          if (dealBtn) {
              dealBtn.style.display = 'none';
          }
          
          // Add safety check for deck
        if (!this.deck || !Array.isArray(this.deck) || this.deck.length < 52) {
            console.warn('Deck not properly initialized, reshuffling...');
            this.shuffleDeck();
        }
        
        this.currentPhase = 'phase1';
        this.currentBidder = 2; // Start with South (human player)
        
        // Clear hands before dealing
        this.hands = {
            north: [],
            east: [],
            south: [],
            west: []
        };
        
        // Deal 13 cards to each player in proper order
        // Deal one card at a time to each player in rotation (North, East, South, West)
        for (let i = 0; i < 13; i++) {
            for (let j = 0; j < 4; j++) {
                const player = this.players[j];
                
                if (this.deck.length === 0) {
                    console.error('CRITICAL: Deck is empty during dealing!');
                    this.shuffleDeck();
                }
                
                const card = this.deck.pop();
                
                // Add safety check for card
                if (card && typeof card === 'object' && card.suit && card.rank) {
                    this.hands[player].push(card);
                } else {
                    console.error('Invalid card drawn during dealing:', card);
                    // Try to draw another card
                    const replacementCard = this.deck.pop();
                    if (replacementCard && typeof replacementCard === 'object' && replacementCard.suit && replacementCard.rank) {
                        this.hands[player].push(replacementCard);
                    } else {
                        console.error('Failed to get replacement card, reshuffling deck...');
                        this.shuffleDeck();
                        const newCard = this.deck.pop();
                        if (newCard) {
                            this.hands[player].push(newCard);
                        }
                    }
                }
            }
        }
        
        // Validate dealing results
        this.validateDealing();
        
        // Verify each player has exactly 13 cards
        this.players.forEach(player => {
            if (this.hands[player].length !== 13) {
                console.error(`${player} has ${this.hands[player].length} cards instead of 13!`);
            }
        });
        
        // Log all initial hands for analysis
        console.log(`\n🃏 INITIAL HANDS DEALT:`);
        this.players.forEach(player => {
            const hand = this.hands[player].map(card => `${card.rank}${this.getSuitSymbol(card.suit)}`).sort();
            console.log(`   ${this.getPlayerDisplayName(player)}: ${hand.join(' ')}`);
        });
        console.log('');
        
        this.displayCards();
        
        // Initially disable card selection until it's player's turn
        this.disableCardSelection();
        this.updateDisplay();
        
        // Reset pass button state for new hand
        this.resetPassButtonState();
        
        // Since we start with South (human player), show the bidding interface immediately
        this.promptPhase1Bidder();
    }

    showBiddingInterface() {
        const biddingInterface = document.getElementById('bidding-interface');
        if (biddingInterface) {
            biddingInterface.style.display = 'block';
        } else {
            console.error('Bidding interface element not found!');
        }
        
        // Clear previous selections for fresh start
        this.selectedTricks = null;
        this.selectedSuit = null;
        
        // Ensure pass button is enabled for fresh bidding round
        const passBtn = document.getElementById('pass-btn');
        if (passBtn) {

            passBtn.disabled = false;
            passBtn.style.opacity = '1';
            passBtn.style.cursor = 'pointer';
            passBtn.style.backgroundColor = '';  // Clear any inline background
            passBtn.style.color = '';           // Clear any inline color
            passBtn.style.filter = '';          // Clear any filters
            passBtn.classList.remove('disabled'); // Remove disabled class if present
            passBtn.removeAttribute('aria-disabled'); // Remove aria-disabled
        }
        
        // Ensure bid button is enabled
        const bidBtn = document.getElementById('bid-btn');
        if (bidBtn) {

            bidBtn.disabled = false;
            bidBtn.style.opacity = '1';
            bidBtn.style.cursor = 'pointer';
            bidBtn.style.backgroundColor = '';  // Clear any inline background
            bidBtn.style.color = '';           // Clear any inline color
            bidBtn.style.filter = '';          // Clear any filters
            bidBtn.classList.remove('disabled'); // Remove disabled class if present
            bidBtn.removeAttribute('aria-disabled'); // Remove aria-disabled
        }
        
        this.populateBiddingButtons();
        this.updatePassButtonState();
    }

    hideBiddingInterface() {
        const biddingInterface = document.getElementById('bidding-interface');
        if (biddingInterface) {
            biddingInterface.style.display = 'none';
        }
        
        // Reset pass button state when hiding interface
        this.resetPassButtonState();
    }

    populateBiddingButtons() {
        const tricksButtons = document.getElementById('tricks-buttons');
        const suitButtons = document.getElementById('suit-buttons');
        
        if (!tricksButtons || !suitButtons) {
            console.error('Button containers not found!');
            return;
        }
        
        tricksButtons.innerHTML = '';
        suitButtons.innerHTML = '';
        
                 // Add trick buttons (5-13) - minimum bid is 5 according to official rules
         for (let i = 5; i <= 13; i++) {
            const button = document.createElement('button');
            button.className = 'trick-button';
            button.dataset.value = i;
            button.textContent = i;
            button.addEventListener('click', () => this.selectTricks(i));
            tricksButtons.appendChild(button);
        }
        
        // Add suit buttons
        const suits = [
            { value: 'clubs', text: '♣', rank: 1 },
            { value: 'diamonds', text: '♦', rank: 2 },
            { value: 'hearts', text: '♥', rank: 3 },
            { value: 'spades', text: '♠', rank: 4 },
            { value: 'notrump', text: 'NT', rank: 5 }
        ];
        
        for (const suit of suits) {
            const button = document.createElement('button');
            button.className = 'suit-button';
            button.dataset.value = suit.value;
            button.dataset.rank = suit.rank;
            button.textContent = suit.text;
            button.addEventListener('click', () => this.selectSuit(suit.value));
            suitButtons.appendChild(button);
        }
    }

    // Button selection methods for Phase 1 bidding
    selectTricks(tricks) {
        this.selectedTricks = tricks;
        this.updateButtonSelection('tricks', tricks);
        this.updatePassButtonState();
    }

    selectSuit(suit) {
        this.selectedSuit = suit;
        this.updateButtonSelection('suit', suit);
        this.updatePassButtonState();
    }

    updateButtonSelection(type, value) {
        // Remove previous selections
        if (type === 'tricks') {
            document.querySelectorAll('.trick-button').forEach(btn => btn.classList.remove('selected'));
            document.querySelector(`.trick-button[data-value="${value}"]`)?.classList.add('selected');
        } else if (type === 'suit') {
            document.querySelectorAll('.suit-button').forEach(btn => btn.classList.remove('selected'));
            document.querySelector(`.suit-button[data-value="${value}"]`)?.classList.add('selected');
        }
    }

    updatePassButtonState() {
        // Disable pass button if both tricks and suit are selected
        const passBtn = document.getElementById('pass-btn');
        if (passBtn) {
            if (this.selectedTricks && this.selectedSuit) {
                passBtn.disabled = true;
                passBtn.title = 'Cannot pass after selecting a bid';
            } else {
                passBtn.disabled = false;
                passBtn.title = '';
            }
        }
    }

    resetPassButtonState() {
        // Reset pass button to enabled state and clear any selections
        const passBtn = document.getElementById('pass-btn');
        if (passBtn) {
            passBtn.disabled = false;
            passBtn.title = '';
        }
        
        // Clear selections when hiding interface
        this.selectedTricks = null;
        this.selectedSuit = null;
        
        // Clear button selections
        document.querySelectorAll('.trick-button').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.suit-button').forEach(btn => btn.classList.remove('selected'));
    }

    clearBidSelections() {
        // Clear current bid selections and re-enable pass button
        this.selectedTricks = null;
        this.selectedSuit = null;
        
        // Clear button selections
        document.querySelectorAll('.trick-button').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.suit-button').forEach(btn => btn.classList.remove('selected'));
        
        // Re-enable pass button
        this.updatePassButtonState();
        
        // Show feedback to user
        this.showGameNotification('Bid selections cleared. You can now pass or make a new selection.', 'info');
    }

    expandPhase2Bidding() {
        const extraButtons = document.getElementById('tricks-buttons-extra');
        const mainButtons = document.querySelector('.tricks-buttons-main');
        const moreBtn = document.getElementById('more-tricks-btn');
        const lessBtn = document.getElementById('less-tricks-btn');
        
        if (extraButtons && mainButtons) {
            // Hide main buttons (0-7) and show full range (0-13)
            mainButtons.style.display = 'none';
            extraButtons.style.display = 'grid';
            
            // Show Less button, hide More button
            if (moreBtn) moreBtn.style.display = 'none';
            if (lessBtn) lessBtn.style.display = 'block';
            
            // Remember user preference for this round
            this.phase2BiddingExpanded = true;
        }
    }

    collapsePhase2Bidding() {
        const extraButtons = document.getElementById('tricks-buttons-extra');
        const mainButtons = document.querySelector('.tricks-buttons-main');
        const moreBtn = document.getElementById('more-tricks-btn');
        const lessBtn = document.getElementById('less-tricks-btn');
        
        if (extraButtons && mainButtons) {
            // Show main buttons (0-7) and hide full range
            mainButtons.style.display = 'grid';
            extraButtons.style.display = 'none';
            
            // Show More button, hide Less button
            if (moreBtn) moreBtn.style.display = 'block';
            if (lessBtn) lessBtn.style.display = 'none';
            
            // Update user preference
            this.phase2BiddingExpanded = false;
        }
    }

    getTotalBidsForPlayer(player) {
        // Calculate total Phase 2 bids for this player across all hands in current game
        // For now, return 0 as placeholder - we'll need to track this properly
        return 0;
    }

    toggleExtendedView() {
        this.extendedViewActive = !this.extendedViewActive;
        
        const normalContent = document.getElementById('total-score-content');
        const extendedContent = document.getElementById('extended-score-content');
        const viewTitle = document.getElementById('score-view-title');
        const toggleBtn = document.getElementById('extended-view-btn');
        
        if (this.extendedViewActive) {
            // Show extended view
            normalContent.style.display = 'none';
            extendedContent.style.display = 'block';
            viewTitle.textContent = 'Game History';
            toggleBtn.textContent = '📋';
            toggleBtn.title = 'Show current scores';
            this.generateExtendedScorecard();
        } else {
            // Show normal view
            normalContent.style.display = 'flex';
            extendedContent.style.display = 'none';
            viewTitle.textContent = 'Total Score';
            toggleBtn.textContent = '📊';
            toggleBtn.title = 'Show extended scorecard';
        }
    }

    generateExtendedScorecard() {
        const extendedContent = document.getElementById('extended-score-content');
        if (!extendedContent) return;

        // Always show the table structure, even for first gamlet
        const hasCompletedGamlets = this.gamletHistory.length > 0;

        // Generate scorecard table
        let tableHTML = '<table class="scorecard-table">';
        
        // Header row
        tableHTML += '<tr>';
        tableHTML += '<th rowspan="2" class="game-number">#</th>';
        
        // Player headers with Bid/Score columns
        this.players.forEach(player => {
            const displayName = player === 'south' ? (this.playerName || 'Guy') : this.getPlayerDisplayName(player).split(' ')[0];
            tableHTML += `<th colspan="2" class="player-header player-${player}">${displayName}</th>`;
        });
        
        tableHTML += '<th rowspan="2" class="total-row">Total<br/>Bid</th>';
        tableHTML += '<th rowspan="2" class="trump-header">Trump</th>';
        tableHTML += '</tr>';
        
        // Sub-header row (Bid/Score)
        tableHTML += '<tr>';
        this.players.forEach((player) => {
            tableHTML += `<th class="bid-col player-${player}">Bid</th>`;
            tableHTML += `<th class="score-col player-${player}">Score</th>`;
        });
        tableHTML += '</tr>';
        
        // Gamlet rows - show completed gamlets and current gamlet if in progress
        if (hasCompletedGamlets) {
            this.gamletHistory.forEach((gamlet, index) => {
            tableHTML += '<tr>';
                tableHTML += `<td class="game-number">${gamlet.fullGameNumber}.${gamlet.gamletNumber}</td>`;
            
            let totalBid = 0;
            this.players.forEach(player => {
                    const bid = gamlet.phase2Bids[player] || 0;
                    const score = gamlet.finalScores[player];
                totalBid += bid;
                    tableHTML += `<td class="bid-col player-${player}">${bid}</td>`;
                    tableHTML += `<td class="score-col player-${player}">${score}</td>`;
            });
            
            tableHTML += `<td class="total-row">${totalBid}</td>`;
                
                // Add trump column
                const trumpSymbol = this.getSuitSymbol(gamlet.trumpSuit);
                const trumpWinnerName = gamlet.trumpWinner === 'south' ? 
                    (this.playerName || 'Guy') : 
                    this.getPlayerDisplayName(gamlet.trumpWinner).split(' ')[0];
                tableHTML += `<td class="trump-col">${trumpSymbol}<br/><small>(${trumpWinnerName})</small></td>`;
                
            tableHTML += '</tr>';
        });
        }
        
        // Always show current gamlet row (in progress or as placeholder)
        tableHTML += '<tr class="current-gamlet">';
        tableHTML += `<td class="game-number current">${this.fullGameNumber}.${this.gamletNumber}</td>`;
        
        let currentTotalBid = 0;
        this.players.forEach(player => {
            const currentBid = this.phase2Bids[player] || '-';
            const currentScore = this.scores[player] || 0;
            if (typeof currentBid === 'number') currentTotalBid += currentBid;
            
            tableHTML += `<td class="bid-col player-${player} current">${currentBid}</td>`;
            tableHTML += `<td class="score-col player-${player} current">${currentScore}</td>`;
        });
        
        tableHTML += `<td class="total-row current">${currentTotalBid > 0 ? currentTotalBid : '-'}</td>`;
        
        // Current trump column
        if (this.trumpSuit && this.trumpWinner) {
            const currentTrumpSymbol = this.getSuitSymbol(this.trumpSuit);
            const currentTrumpWinnerName = this.trumpWinner === 'south' ? 
                (this.playerName || 'Guy') : 
                this.getPlayerDisplayName(this.trumpWinner).split(' ')[0];
            tableHTML += `<td class="trump-col current">${currentTrumpSymbol}<br/><small>(${currentTrumpWinnerName})</small></td>`;
        } else {
            tableHTML += `<td class="trump-col current">-</td>`;
        }
        
        tableHTML += '</tr>';
        
        // Total row
        tableHTML += '<tr class="total-row">';
        tableHTML += '<td><strong>Total</strong></td>';
        
        this.players.forEach(player => {
            const totalBids = this.gamletHistory.reduce((sum, gamlet) => sum + (gamlet.phase2Bids[player] || 0), 0);
            // Use current scores for cumulative score if no gamlets completed
            const cumulativeScore = hasCompletedGamlets ? this.cumulativeScores[player] : this.scores[player];
            tableHTML += `<td class="player-${player}"><strong>${totalBids || '-'}</strong></td>`;
            tableHTML += `<td class="player-${player}"><strong>${cumulativeScore || 0}</strong></td>`;
        });
        
        const grandTotalBids = this.gamletHistory.reduce((sum, gamlet) => {
            return sum + this.players.reduce((gamletSum, player) => gamletSum + (gamlet.phase2Bids[player] || 0), 0);
        }, 0);
        tableHTML += `<td><strong>${grandTotalBids || '-'}</strong></td>`;
        tableHTML += '<td><strong>-</strong></td>'; // Empty trump cell for total row
        tableHTML += '</tr>';
        
        tableHTML += '</table>';
        
        extendedContent.innerHTML = tableHTML;
    }

    makePhase1Bid(minTakes, trumpSuit) {
        if (!this.selectedTricks || !this.selectedSuit) {
            this.showGameNotification('Please select both tricks and trump suit before bidding!', 'warning');
            return;
        }
        
                 // Validate minimum bid of 5 according to official Israeli Whist rules
         if (minTakes < 5) {
             console.error('Minimum bid must be 5 or higher');
            return;
        }
        

        
        // Record the bid
        this.phase1Bids.south = {
            minTakes: minTakes,
            trumpSuit: trumpSuit
        };
        
        // Log the human player's bid to match bot logging
        console.log(`🃏 PHASE 1: ${this.getPlayerDisplayName('south')} bids ${minTakes} ${trumpSuit}`);
        
        // Update the display to show the new bid
        this.updateDisplay();
        
        // Show bid animation
        this.showBidAnimation('south', `${minTakes} ${this.getSuitSymbol(this.selectedSuit)}`);
        
        // Hide bidding interface after bid
        this.hideBiddingInterface();
        
        // Move to next player after animation
        setTimeout(() => {
            this.nextPhase1Bidder();
        }, 1500);
    }

    startPhase2() {

        this.currentPhase = 'phase2';
        this.hideBiddingInterface();
        
        // Clear Phase 1 display and show Phase 2 status
        this.updateDisplay();
         
         // Force immediate refresh of all Phase 2 displays to clear Phase 1 state
         this.forceDisplayUpdate();
        
        // Start Phase 2 bidding with trump winner
         // Then go clockwise (left) from there
        this.currentBidder = this.players.indexOf(this.trumpWinner);

         
         // Show Phase 2 interface first
         this.showPhase2Interface();
         
         // Then prompt the current bidder
        this.promptPhase2Bidder();
    }

    promptPhase2Bidder() {
        if (this.currentBidder === 2) { // South (human)
            this.showPhase2Interface();
             // Show human player's prediction controls
             this.showHumanPhase2Controls();
        } else {
            this.botMakePhase2Bid();
        }
    }

    showPhase2Interface() {
        const phase2Interface = document.querySelector('.second-phase-bidding');
        if (phase2Interface) {
            phase2Interface.style.display = 'block';
            
            // Update trump reminder
            const trumpReminder = document.getElementById('trump-reminder');
            if (trumpReminder) {
                trumpReminder.textContent = this.getSuitSymbol(this.trumpSuit);
            }
            
             // Refresh all Phase 2 displays
             this.refreshAllPhase2Displays();
        }
    }

    showHumanPhase2Controls() {
        const yourPredictionControls = document.getElementById('your-prediction-controls');
        if (yourPredictionControls) {
            yourPredictionControls.style.display = 'block';
        }
        
        // Always start with collapsed view (0-7) for new rounds
        this.collapsePhase2Bidding();
        
        // Set minimum bid for trump winner
        if (this.currentBidder === this.players.indexOf(this.trumpWinner)) {
            // Trump winner must bid at least their Phase 1 minimum
            const trickButtons = document.querySelectorAll('.trick-btn');
            trickButtons.forEach(button => {
                const value = parseInt(button.getAttribute('data-value'), 10);
                if (value < this.minimumTakes) {
                    button.disabled = true;
                } else {
                    button.disabled = false;
                }
            });
        } else {
            // Reset all buttons to be enabled
            const trickButtons = document.querySelectorAll('.trick-btn');
            trickButtons.forEach(button => {
                button.disabled = false;
            });
        }
        
        // Show a message indicating it's the human player's turn
        const turnMessage = document.getElementById('turn-message');
        if (turnMessage) {
            turnMessage.textContent = `Your turn to bid! Choose how many tricks you think you'll take.`;
            turnMessage.style.display = 'block';
        }
    }

    makePhase2Bid(player, takes) {
        // Validate minimum bid for trump winner
        if (player === this.trumpWinner && takes < this.minimumTakes) {
            const playerDisplayName = this.getPlayerDisplayName(player);
            console.error(`${playerDisplayName} must bid at least ${this.minimumTakes} as trump winner`);
            return;
        }
        
                this.phase2Bids[player] = takes;
        console.log(`🎯 PHASE 2: ${this.getPlayerDisplayName(player)} predicts ${takes} tricks`);
           
           // Update Phase 2 bid display immediately
          this.updatePhase2BidDisplay(player, takes);
          
          // Force immediate DOM update
          this.forceDisplayUpdate();
        
        // Update display immediately after bid
        this.updateDisplay();
        
          // Check if all players have now bid
          const allPlayersBid = this.players.every(p => this.phase2Bids[p] !== null && this.phase2Bids[p] !== undefined);
          
                     if (allPlayersBid) {
               // Calculate total bids for analysis
               const totalBids = Object.values(this.phase2Bids).reduce((sum, bid) => sum + bid, 0);
               console.log(`📊 PHASE 2 COMPLETE: Total bids = ${totalBids} (${totalBids === 13 ? 'EXACT' : totalBids > 13 ? 'OVER' : 'UNDER'})`);
               
               // Small delay to show the final bid before transitioning
               setTimeout(() => this.startPhase3(), this.getDelay(1000));
              return;
          }
          
          // Move to next player in clockwise order
        this.currentBidder = (this.currentBidder + 1) % 4;

        
          if (this.currentBidder === 2) { // Back to South (human player)
              // Human player's turn to bid
              this.promptPhase2Bidder();
        } else {
            this.botMakePhase2Bid();
        }
    }

    botMakePhase2Bid() {
        const player = this.players[this.currentBidder];
        
        // Calculate current total bids
        const currentTotal = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
        
         // Determine valid bid range - always allow bidding
        let minBid = 0;
         let maxBid = 7; // Hard cap for bots - never allow bidding above 7
        
        // Trump winner must bid at least their Phase 1 minimum
        if (player === this.trumpWinner) {
            minBid = this.minimumTakes;
        }
        
         // Handle the case where total would be exactly 13
         // Instead of preventing bidding, adjust the bid to avoid exactly 13
            if (currentTotal + minBid === 13) {
             // If minimum bid would make total exactly 13, allow bidding 1 higher
                minBid = Math.min(13, minBid + 1);
        }
        
        // Smart bidding based on hand strength and current situation
        const handStrength = this.evaluateHandStrength(player);
        let takes = this.calculateSmartPhase2Bid(player, handStrength, currentTotal, minBid, maxBid);
        
        // Ensure bid is within valid range
        takes = Math.max(minBid, Math.min(maxBid, takes));
         
         // Final check: if this bid would make total exactly 13, adjust it
         if (currentTotal + takes === 13) {
             if (takes < 13) {
                 takes = takes + 1; // Bid one higher
             } else {
                 takes = takes - 1; // Bid one lower
             }

         }
        

        
        // Analyze bidding pattern for learning
        this.analyzeOpponentPattern(player, {
            type: 'bid',
            value: takes
        }, {
            handStrength: handStrength.score,
            trumpSuit: this.trumpSuit,
            position: this.currentBidder,
            competitionLevel: currentTotal
        });
        
        this.makePhase2Bid(player, takes);
    }

    calculateSmartPhase2Bid(player, handStrength, currentTotal, minBid, maxBid) {
        // Expert-level Phase 2 bidding - aim for optimal totals of 12 or 14
        const playerPattern = this.botMemory.playerPatterns[player];
        const trumpSuit = this.trumpSuit;
        const hand = this.hands[player];
        const playersRemaining = 4 - this.currentBidder;
        
        // Base trick estimation
        let trickEstimate = this.calculateRealisticTricks(hand, trumpSuit, handStrength);
        
        // Expert strategic bidding - prioritize achieving optimal totals
        let optimalBid = trickEstimate;
        
        if (playersRemaining === 1) {
            // Last bidder - we control the final total, so be very strategic
            const targetTotals = [12, 14]; // Optimal totals in order of preference
            let bestBid = Math.round(trickEstimate);
            let bestScore = -1000;
            
            // Evaluate each possible bid
            for (let testBid = minBid; testBid <= maxBid; testBid++) {
                const resultingTotal = currentTotal + testBid;
                let bidScore = 0;
                
                // Heavily favor optimal totals
                if (resultingTotal === 12) {
                    bidScore += 100; // Best total
                } else if (resultingTotal === 14) {
                    bidScore += 90;  // Second best total
                } else if (resultingTotal === 11 || resultingTotal === 15) {
                    bidScore += 20;  // Decent totals
                } else if (resultingTotal === 10 || resultingTotal === 16) {
                    bidScore += 10;  // OK totals
                } else if (resultingTotal === 13) {
                    bidScore -= 200; // Forbidden total
                } else {
                    bidScore -= Math.abs(resultingTotal - 13) * 10; // Penalty for distance from 13
                }
                
                // Factor in how close the bid is to our hand strength
                const handFit = 1 - Math.abs(testBid - trickEstimate) / 10;
                bidScore += handFit * 50;
                
                // Penalty for extreme overbidding/underbidding
                if (testBid > trickEstimate * 1.5) {
                    bidScore -= 30; // Overbidding penalty
                } else if (testBid < trickEstimate * 0.6) {
                    bidScore -= 20; // Underbidding penalty
                }
                
                if (bidScore > bestScore) {
                    bestScore = bidScore;
                    bestBid = testBid;
                }
            }
            
            optimalBid = bestBid;
            
        } else {
            // Not last bidder - coordinate towards optimal totals
            const remainingPlayers = playersRemaining;
            
            // Calculate what total we're aiming for
            let targetTotal = 12; // Default preference
            
            // If we're early in bidding, consider both 12 and 14
            const projectedFor12 = (12 - currentTotal) / remainingPlayers;
            const projectedFor14 = (14 - currentTotal) / remainingPlayers;
            
            // Choose the target that's more reasonable given our hand
            if (Math.abs(trickEstimate - projectedFor14) < Math.abs(trickEstimate - projectedFor12)) {
                targetTotal = 14;
            }
            
            const targetBidForOptimal = (targetTotal - currentTotal) / remainingPlayers;
            
            // Balance between our hand strength and optimal total contribution
            const handWeight = 0.6; // 60% hand strength
            const optimalWeight = 0.4; // 40% optimal total targeting
            
            optimalBid = (trickEstimate * handWeight) + (targetBidForOptimal * optimalWeight);
            
            // Adjust based on position in bidding order
            if (this.currentBidder === 0) {
                // First bidder - be slightly conservative to allow room for others
                optimalBid *= 0.9;
            } else if (this.currentBidder === 1) {
                // Second bidder - moderate approach
                optimalBid *= 0.95;
            } else {
                // Third bidder - more aggressive to set up last bidder
                optimalBid *= 1.05;
            }
        }
        
        // Apply bot personality (but keep it smaller)
        const riskTolerance = playerPattern.riskTolerance;
        if (riskTolerance < 0.3) {
            optimalBid *= 0.95; // Slightly conservative
        } else if (riskTolerance > 0.6) {
            optimalBid *= 1.05; // Slightly aggressive
        }
        
        // Trump winner constraint
        if (player === this.trumpWinner) {
            optimalBid = Math.max(optimalBid, this.minimumTakes);
        }
        
        // Hand strength reality checks
        const isWeakHand = handStrength.score < 18;
        const isStrongHand = handStrength.score >= 25;
        
        if (isWeakHand && optimalBid > 4) {
            optimalBid = Math.min(4, Math.max(minBid, optimalBid * 0.8));
        } else if (isStrongHand && optimalBid < 2) {
            optimalBid = Math.max(2, optimalBid);
        }
        
        // Final constraints
        let finalBid = Math.round(optimalBid);
        finalBid = Math.max(minBid, Math.min(maxBid, finalBid));
        
        // Last safety check - don't bid impossibly high compared to hand
        const maxReasonableBid = Math.ceil(trickEstimate * 1.6);
        if (finalBid > maxReasonableBid && !isStrongHand) {
            finalBid = Math.max(minBid, maxReasonableBid);
        }
        
        return finalBid;
    }
    
    calculateRealisticTricks(hand, trumpSuit, handStrength) {
        // Much more accurate trick calculation
        let tricks = 0;
        
        console.log(`Calculating tricks for hand: ${hand.map(c => c.rank + c.suit).join(', ')} with trump: ${trumpSuit}`);
        
        // Count sure winners more accurately
        const aces = hand.filter(card => card.rank === 'A').length;
        tricks += aces * 0.95; // Aces are almost guaranteed
        console.log(`Aces (${aces}): +${aces * 0.95} tricks`);
        
        // Trump suit analysis - be more realistic
        if (trumpSuit !== 'notrump') {
            const trumpCards = hand.filter(card => card.suit === trumpSuit);
            const trumpLength = trumpCards.length;
            
            console.log(`Trump cards (${trumpSuit}): ${trumpCards.map(c => c.rank + c.suit).join(', ')} (${trumpLength} cards)`);
            
            // Trump length analysis - improved values
            if (trumpLength >= 6) {
                tricks += 3.0; // Very long trump - can ruff extensively
            } else if (trumpLength >= 5) {
                tricks += 2.2; // Long trump suit - good control
            } else if (trumpLength >= 4) {
                tricks += 1.5; // Good trump length
            } else if (trumpLength >= 3) {
                tricks += 0.8; // Decent trump suit
            } else if (trumpLength <= 1) {
                tricks -= 0.2; // Short trump is disadvantageous
            }
            
            // Trump honors - more accurate values
            const trumpAce = trumpCards.some(card => card.rank === 'A');
            const trumpKing = trumpCards.some(card => card.rank === 'K');
            const trumpQueen = trumpCards.some(card => card.rank === 'Q');
            const trumpJack = trumpCards.some(card => card.rank === 'J');
            
            if (trumpAce) {
                tricks += 0.9; // Trump ace is very strong
                console.log(`Trump Ace: +0.9 tricks`);
            }
            if (trumpKing && trumpLength >= 2) {
                tricks += 0.6; // Protected trump king
                console.log(`Trump King (protected): +0.6 tricks`);
            }
            if (trumpQueen && trumpLength >= 3) {
                tricks += 0.4; // Well-protected trump queen
                console.log(`Trump Queen (protected): +0.4 tricks`);
            }
            if (trumpJack && trumpLength >= 4) {
                tricks += 0.2; // Protected trump jack
                console.log(`Trump Jack (protected): +0.2 tricks`);
            }
            
            console.log(`Trump contribution: +${trumpLength >= 6 ? 3.0 : trumpLength >= 5 ? 2.2 : trumpLength >= 4 ? 1.5 : trumpLength >= 3 ? 0.8 : trumpLength <= 1 ? -0.2 : 0} for length`);
        }
        
        // High cards in side suits - much more accurate evaluation
        ['clubs', 'diamonds', 'hearts', 'spades'].forEach(suit => {
            if (suit !== trumpSuit) {
                const suitCards = hand.filter(card => card.suit === suit);
                const suitLength = suitCards.length;
                
                if (suitLength === 0) return; // Skip void suits
                
                const suitAces = suitCards.filter(card => card.rank === 'A').length;
                const kings = suitCards.filter(card => card.rank === 'K').length;
                const queens = suitCards.filter(card => card.rank === 'Q').length;
                const jacks = suitCards.filter(card => card.rank === 'J').length;
                const tens = suitCards.filter(card => card.rank === '10').length;
                
                console.log(`Side suit ${suit} (${suitLength} cards): ${suitCards.map(c => c.rank + c.suit).join(', ')}`);
                
                // Aces already counted above, but side suit aces are excellent
                if (suitAces > 0) {
                    console.log(`  Side suit Aces: already counted in main calculation`);
                }
                
                // More accurate side suit evaluation based on protection
                if (suitLength >= 4) {
                    // Long suits - very well protected
                    tricks += kings * 0.8; // Well-protected kings
                    tricks += queens * 0.5; // Protected queens
                    tricks += jacks * 0.3; // Protected jacks
                    tricks += tens * 0.2; // Protected tens
                    console.log(`  Long suit (${suitLength}): K=${kings * 0.8}, Q=${queens * 0.5}, J=${jacks * 0.3}, 10=${tens * 0.2}`);
                } else if (suitLength === 3) {
                    // Well protected
                    tricks += kings * 0.7; // Well-protected kings
                    tricks += queens * 0.4; // Protected queens
                    tricks += jacks * 0.2; // Protected jacks
                    console.log(`  Medium suit (3): K=${kings * 0.7}, Q=${queens * 0.4}, J=${jacks * 0.2}`);
                } else if (suitLength === 2) {
                    // Somewhat protected
                    tricks += kings * 0.5; // Somewhat protected
                    tricks += queens * 0.25;
                    console.log(`  Short suit (2): K=${kings * 0.5}, Q=${queens * 0.25}`);
                } else { // singleton
                    tricks += kings * 0.3; // Singleton king still has some value
                    console.log(`  Singleton: K=${kings * 0.3} (risky)`);
                    // Don't count singleton queens/jacks - too risky
                }
            }
        });
        
        // Distribution adjustments - more conservative
        const voids = Object.values(handStrength.suitCounts).filter(count => count === 0).length;
        const singletons = Object.values(handStrength.suitCounts).filter(count => count === 1).length;
        const doubletons = Object.values(handStrength.suitCounts).filter(count => count === 2).length;
        
        if (trumpSuit !== 'notrump') {
            const trumpLength = hand.filter(card => card.suit === trumpSuit).length;
            if (trumpLength >= 3) { // Only count ruffing if we have decent trumps
                tricks += voids * 0.5; // Ruffing potential (reduced)
                tricks += singletons * 0.2; // Some ruffing potential
                tricks += doubletons * 0.1; // Minor ruffing potential
            }
        }
        
        // Hand strength correlation - weak hands get penalty
        if (handStrength.score < 15) {
            tricks *= 0.8; // Weak hands rarely perform as well
        } else if (handStrength.score >= 25) {
            tricks *= 1.1; // Strong hands perform better
        }
        
        // Cap the estimate to be realistic - lower ceiling for realism
        tricks = Math.max(0.5, Math.min(5.5, tricks));
        
        return tricks;
    }
    
    analyzeOpponentBids() {
        // Analyze patterns in opponent bidding for strategic adjustment
        let totalOverbid = 0;
        let bidCount = 0;
        
        Object.keys(this.botMemory.playerPatterns).forEach(player => {
            const pattern = this.botMemory.playerPatterns[player];
            const recentBids = pattern.learningData
                .filter(d => d.action.type === 'bid')
                .slice(-3); // Last 3 bids
                
            recentBids.forEach(bidData => {
                const predicted = bidData.action.value;
                const actual = bidData.context.actualTricks || 0;
                totalOverbid += (predicted - actual);
                bidCount++;
            });
        });
        
        return {
            averageOverbid: bidCount > 0 ? totalOverbid / bidCount : 0,
            sampleSize: bidCount
        };
    }

    startPhase3() {

        this.currentPhase = 'phase3';
        this.hidePhase2Interface();
        this.updateDisplay();
         
         // Calculate if this will be an Over or Under hand
         const totalBids = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
         this.handType = totalBids > 13 ? 'over' : 'under';

        // Log Phase 3 start with all player hands for analysis
        console.log(`\n🎮 PHASE 3 STARTING - CARD PLAY:`);
        console.log(`   Trump: ${this.trumpSuit || 'No Trump'} | Total Bids: ${totalBids} (${this.handType.toUpperCase()})`);
        console.log(`   Current Hands:`);
        this.players.forEach(player => {
            const hand = this.hands[player].map(card => `${card.rank}${this.getSuitSymbol(card.suit)}`).sort();
            const bid = this.phase2Bids[player];
            console.log(`     ${this.getPlayerDisplayName(player)}: ${hand.join(' ')} (bid: ${bid})`);
        });
        console.log('');
        
        // Start first trick
        this.startTrick();
    }

    startTrick() {
        this.currentTrick = [];
         // According to official rules, trump winner leads first trick
         this.trickLeader = this.players.indexOf(this.trumpWinner);
        
         if (this.trickLeader === 2) { // South (human player)
            this.enableCardSelection();
        } else {
            this.disableCardSelection();
            this.botPlayCard();
        }
    }

    enableCardSelection() {
        const cards = document.querySelectorAll('#south-cards .card');
        const humanCardsContainer = document.getElementById('south-cards');
        
        // Add class to indicate it's player's turn
        if (humanCardsContainer) {
            humanCardsContainer.classList.add('player-turn');
        }
        
        // Remove any existing click handlers and add new ones
        cards.forEach(card => {
            // Remove existing listeners by cloning the element
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // Add click handler to the new card
            newCard.addEventListener('click', () => this.onCardClick(newCard));
            newCard.style.cursor = 'pointer';
        });
        
        // Card highlighting removed
        

    }
    
    disableCardSelection() {
        const cards = document.querySelectorAll('#south-cards .card');
        const humanCardsContainer = document.getElementById('south-cards');
        
        // Remove class to indicate it's not player's turn
        if (humanCardsContainer) {
            humanCardsContainer.classList.remove('player-turn');
        }
        
        // Card highlighting removed
        
        // Remove click handlers and pointer cursor
        cards.forEach(card => {
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            newCard.style.cursor = 'default';
        });
    }
    
    // Card highlighting methods removed

    onCardClick(cardElement) {
        // Get the card data from the element's content using correct selectors
        const cardRankElement = cardElement.querySelector('.card-rank');
        const cardSuitElement = cardElement.querySelector('.card-center-suit');
        
        if (!cardRankElement || !cardSuitElement) {
            console.error('Could not find rank or suit elements in clicked card');

            return;
        }
        
        const cardRank = cardRankElement.textContent?.trim();
        const suitSymbol = cardSuitElement.textContent?.trim();
        
        // Determine suit from the symbol
        let cardSuit = null;
        if (suitSymbol === '♠') cardSuit = 'spades';
        else if (suitSymbol === '♥') cardSuit = 'hearts';
        else if (suitSymbol === '♦') cardSuit = 'diamonds';
        else if (suitSymbol === '♣') cardSuit = 'clubs';
        
        if (!cardRank || !cardSuit) {
            console.error(`Could not determine card from clicked element. Rank: "${cardRank}", Suit: "${suitSymbol}"`);
            return;
        }
        
        // Find the exact card in the player's hand
        const hand = this.hands.south;
        const cardIndex = hand.findIndex(card => card.rank === cardRank && card.suit === cardSuit);
        
        if (cardIndex === -1) {
            console.error(`Card ${cardRank} of ${cardSuit} not found in player's hand`);

            return;
        }
        

        this.playCard('south', cardIndex);
    }

    playCard(player, cardIndex) {
        const hand = this.hands[player];
        if (cardIndex >= hand.length) return;
        
        const card = hand[cardIndex];
        
        // Validate card play according to Israeli Whist rules (before removing from hand)
        if (!this.isValidCardPlay(player, card)) {
            console.error(`Invalid card play: ${player} cannot play ${card.rank}${this.getSuitSymbol(card.suit)}`);
            if (player === 'south') {
                this.showGameNotification('You must follow suit if you can!', 'warning');
            }
            return;
        }
        

        
        // Update AI memory with card played
        this.updateCardMemory(card, player);
        
        // Analyze play pattern for learning (skip human player)
        if (player !== 'south') {
            this.analyzeOpponentPattern(player, {
                type: 'cardPlay',
                card: card,
                value: this.getCardValue(card)
            }, {
                tricksNeeded: (this.phase2Bids[player] || 0) - (this.tricksWon[player] || 0),
                position: this.currentTrick.length,
                leadSuit: this.currentTrick.length > 0 ? this.currentTrick[0].card.suit : null
            });
        }
        
        // Add card to current trick
        this.currentTrick.push({ player, card });
        
        // Log the card play
        const cardDisplay = `${card.rank}${this.getSuitSymbol(card.suit)}`;
        const trickPosition = this.currentTrick.length;
        console.log(`🃏 ${this.getPlayerDisplayName(player)} plays ${cardDisplay} (position ${trickPosition}/4)`);
        
        // Remove card from hand
        hand.splice(cardIndex, 1);
        
        // For human player, immediately update their card display
        if (player === 'south') {
            this.updateHumanPlayerCards();
            // Hide the "Show Last Hand" button when human player plays a new card
            this.hideLastHandButton();
        }
        
        // Display the played card on the table
        this.displayPlayedCard(player, card);
        
        // Update hand display
        this.updateDisplay();
        
        // Check if this completes a trick
        if (this.currentTrick.length === 4) {
            // Show the "Show Last Hand" button after all 4 cards are played
            this.showLastHandButton();
            // Wait a moment to show all cards before completing trick
            setTimeout(() => this.completeTrick(), this.getDelay(1000));
        } else {
        // Move to next player
            setTimeout(() => this.nextPlayerInTrick(), this.getDelay(500));
        }
    }
    
    isValidCardPlay(player, card) {
        // If this is the first card of the trick, any card is valid
        if (this.currentTrick.length === 0) {

            return true;
        }
        
        // Get the lead suit (suit of the first card played)
        const leadSuit = this.currentTrick[0].card.suit;
        const hand = this.hands[player];
        

        
        // If playing the same suit as led, it's valid
        if (card.suit === leadSuit) {

            return true;
        }
        
        // If player doesn't have any cards of the lead suit, they can play any card
        const hasLeadSuit = hand.some(handCard => handCard.suit === leadSuit);
        if (!hasLeadSuit) {

            return true;
        }
        
        // Player has cards of the lead suit but didn't play one - invalid
        const leadSuitCards = hand.filter(handCard => handCard.suit === leadSuit);

        return false;
    }
    
    displayPlayedCard(player, card) {
        // Find the corresponding played card area
        const playedCardDiv = document.getElementById(`${player}-played`);
        if (!playedCardDiv) {
            console.error(`Could not find played card area for ${player}`);
            return;
        }
        
        // Create card element for the table
        const cardElement = this.createCardElement(card);
        cardElement.classList.add('card-throwing');
        
        // Clear any previous card and add the new one
        playedCardDiv.innerHTML = '';
        playedCardDiv.appendChild(cardElement);
        

    }
     
    completeTrick() {
        // Store the current trick data for potential "Show Last Hand" animation
        this.lastTrickData = [...this.currentTrick];
        
        // Determine trick winner according to Israeli Whist rules
        const winner = this.determineTrickWinner();
        this.tricksWon[winner]++;
        this.tricksPlayed++;
        
        // Log the complete trick
        const trickCards = this.currentTrick.map(play => 
            `${this.getPlayerDisplayName(play.player)}: ${play.card.rank}${this.getSuitSymbol(play.card.suit)}`
        ).join(', ');
        console.log(`🏆 TRICK ${this.tricksPlayed} WINNER: ${this.getPlayerDisplayName(winner)} | Cards played: ${trickCards}`);
        
        // Update the winner's trick count display immediately
        this.updateTrickCount(winner);
        
        // Update round display immediately after trick completion
        this.updateDisplay();
        
        // Animate cards moving to winner
        this.animateCardsToWinner(winner);
        
        // Check if all 13 tricks have been played
        if (this.tricksPlayed >= 13) {

            this.currentPhase = 'scoring';
            this.updateDisplay();
            setTimeout(() => this.endHand(), this.getDelay(3000));
            return;
        }
        
        // Set trick leader to the winner for next trick
        this.trickLeader = this.players.indexOf(winner);
        this.currentTrick = [];
        

        
        // Start next trick after animation completes
        setTimeout(() => {
            if (this.trickLeader === 2) { // South (human player)
                this.enableCardSelection();
            } else {
                this.disableCardSelection();
                this.botPlayCard();
            }
        }, 3000);
    }
    
    updateTrickCount(player) {
        // Update the Take: X display for the winning player
        const trickCountElement = document.querySelector(`.${player}-player .player-tricks`) ||
                                 document.getElementById(`${player}-takes`) ||
                                 document.querySelector(`#${player}-tricks`);
        
        if (trickCountElement) {
            const tricksWon = this.tricksWon[player];
            trickCountElement.textContent = `Takes: ${tricksWon}`;
        } else {
            console.warn(`Could not find trick count element for ${player}`);
        }
    }
    
    animateCardsToWinner(winner) {

        
        // Get all played card elements
        const playedCards = ['north', 'east', 'south', 'west'].map(player => {
            const cardDiv = document.getElementById(`${player}-played`);
            return cardDiv ? cardDiv.querySelector('.card') : null;
        }).filter(card => card !== null);
        
        // Get winner's name element specifically
        const winnerNameElement = document.querySelector(`.${winner}-player .player-name`);
        
        if (!winnerNameElement) {
            console.error(`Could not find winner's name element for ${winner}`);
            // Fallback: just clear cards after delay
            setTimeout(() => this.clearPlayedCards(), this.getDelay(1500));
            return;
        }
        
        // Animate each card to the winner
        playedCards.forEach((card, index) => {
            if (card) {
                // Add animation class
                card.classList.add('card-moving-to-winner');
                
                // Calculate target position (winner's name element)
                const winnerRect = winnerNameElement.getBoundingClientRect();
                const cardRect = card.getBoundingClientRect();
                
                // Calculate relative movement to the center of the player's name
                const deltaX = (winnerRect.left + winnerRect.width / 2) - (cardRect.left + cardRect.width / 2);
                const deltaY = (winnerRect.top + winnerRect.height / 2) - (cardRect.top + cardRect.height / 2);
                
                // Apply transform animation
                card.style.transition = 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.6) rotate(${index * 10}deg)`;
                card.style.opacity = '0.8';
                card.style.zIndex = '1000';
                
                // Add stacking effect
                setTimeout(() => {
                    card.style.transform += ` translateZ(${index * 2}px)`;
                }, 100 * index);
            }
        });
        
        // Clear the cards after animation completes
        setTimeout(() => {
            this.clearPlayedCards();
        }, 2000);
    }
    
    determineTrickWinner() {
        if (this.currentTrick.length !== 4) {
            console.error('Cannot determine winner of incomplete trick');
            return this.currentTrick[0].player;
        }
        
        const leadSuit = this.currentTrick[0].card.suit;
        let winningCard = this.currentTrick[0];
        
        // Check each card in the trick
        for (let i = 1; i < this.currentTrick.length; i++) {
            const currentCard = this.currentTrick[i];
            
            // Trump beats everything except higher trump
            if (this.trumpSuit !== 'notrump') {
                // If current card is trump and winning card is not trump
                if (currentCard.card.suit === this.trumpSuit && winningCard.card.suit !== this.trumpSuit) {
                    winningCard = currentCard;
                }
                // If both are trump, higher trump wins
                else if (currentCard.card.suit === this.trumpSuit && winningCard.card.suit === this.trumpSuit) {
                    if (this.getCardValue(currentCard.card) > this.getCardValue(winningCard.card)) {
                        winningCard = currentCard;
                    }
                }
                // If neither current nor winning card is trump, check lead suit
                else if (currentCard.card.suit !== this.trumpSuit && winningCard.card.suit !== this.trumpSuit) {
                    // Only cards of the lead suit can win (unless trump)
                    if (currentCard.card.suit === leadSuit && winningCard.card.suit === leadSuit) {
                        if (this.getCardValue(currentCard.card) > this.getCardValue(winningCard.card)) {
                            winningCard = currentCard;
                        }
                    } else if (currentCard.card.suit === leadSuit && winningCard.card.suit !== leadSuit) {
                        winningCard = currentCard;
                    }
                }
            } else {
                // No trump game: highest card of lead suit wins
                if (currentCard.card.suit === leadSuit && winningCard.card.suit === leadSuit) {
                    if (this.getCardValue(currentCard.card) > this.getCardValue(winningCard.card)) {
                        winningCard = currentCard;
                    }
                } else if (currentCard.card.suit === leadSuit && winningCard.card.suit !== leadSuit) {
                    winningCard = currentCard;
                }
            }
        }
        
        return winningCard.player;
    }
    
    getCardValue(card) {
        // Convert card rank to numeric value for comparison
        const rankValues = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, 
            '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return rankValues[card.rank] || 0;
    }
    
    clearPlayedCards() {
        // Clear all played card areas
        ['north', 'east', 'south', 'west'].forEach(player => {
            const playedCardDiv = document.getElementById(`${player}-played`);
            if (playedCardDiv) {
                playedCardDiv.innerHTML = '';
            }
        });
    }
    
    clearAllCards() {
        // Clear all player hand cards
        ['north', 'east', 'south', 'west'].forEach(player => {
            const cardsDiv = document.getElementById(`${player}-cards`);
            if (cardsDiv) {
                cardsDiv.innerHTML = '';
            }
        });
        
        // Also clear played cards
        this.clearPlayedCards();
    }
    
    clearTrickArea() {
        // Clear the trick area and reset trick display
        const trickArea = document.getElementById('trick-area');
        if (trickArea) {
            // Clear any trick animations or indicators
            ['north', 'east', 'south', 'west'].forEach(player => {
                const playedCardDiv = document.getElementById(`${player}-played`);
                if (playedCardDiv) {
                    playedCardDiv.innerHTML = '';
                    playedCardDiv.className = `played-card ${player}-played`;
                }
            });
        }
        
        // Clear won tricks display
        ['north', 'east', 'south', 'west'].forEach(player => {
            const wonTricksDiv = document.getElementById(`${player}-won`);
            if (wonTricksDiv) {
                wonTricksDiv.innerHTML = '';
            }
            
            // Reset trick counters
            const trickCounter = document.getElementById(`${player}-tricks`);
            if (trickCounter) {
                trickCounter.innerHTML = '';
            }
        });
    }
    
    updateHumanPlayerCards() {
        // Immediately update the human player's card display
        const southCardsDiv = document.getElementById('south-cards');
        if (southCardsDiv && this.hands.south && Array.isArray(this.hands.south)) {
            southCardsDiv.innerHTML = '';
            const sortedCards = this.sortCards(this.hands.south);
            
            // Display remaining cards
            sortedCards.forEach(card => {
                const cardElement = this.createCardElement(card);
                southCardsDiv.appendChild(cardElement);
            });
            

            
            // Re-enable card selection if it's still the human player's turn
            if (this.currentPhase === 'phase3' && this.currentTrick.length < 4) {
                setTimeout(() => {
                    const nextPlayerIndex = this.getCurrentPlayerIndex();
                    if (nextPlayerIndex === 2) { // South (human player)
                        this.enableCardSelection();
                    }
                }, 100);
            }
        }
    }
    
    allPhase2BidsComplete() {
        // Check if all players have made their Phase 2 bids
        return this.players.every(player => 
            this.phase2Bids[player] !== null && this.phase2Bids[player] !== undefined
        );
    }
    
    getBestTrumpSuit(player, handStrength) {
        // Determine the best trump suit for this player based on their hand
        const hand = this.hands[player];
        const suitAnalysis = {};
        
        // Analyze each suit
        ['clubs', 'diamonds', 'hearts', 'spades'].forEach(suit => {
            const suitCards = hand.filter(card => card.suit === suit);
            const suitLength = suitCards.length;
            const suitHonors = suitCards.filter(card => ['A', 'K', 'Q', 'J'].includes(card.rank)).length;
            
            // Calculate suit strength score
            let suitScore = 0;
            suitScore += suitLength * 2; // Length is important
            suitScore += suitHonors * 3; // Honors are valuable
            
            // Bonus for very long suits (6+ cards)
            if (suitLength >= 6) {
                suitScore += (suitLength - 5) * 2;
            }
            
            suitAnalysis[suit] = {
                length: suitLength,
                honors: suitHonors,
                score: suitScore
            };
        });
        
        // Check if no-trump might be better (balanced hand with high cards)
        const isBalanced = handStrength.maxLength <= 5 && handStrength.minLength >= 2;
        const hasHighCards = handStrength.score >= 25;
        
        if (isBalanced && hasHighCards) {
            // Consider no-trump as best option for balanced strong hands
            return 'notrump';
        }
        
        // Find the suit with the highest score
        let bestSuit = 'clubs';
        let bestScore = suitAnalysis['clubs'].score;
        
        Object.entries(suitAnalysis).forEach(([suit, analysis]) => {
            if (analysis.score > bestScore) {
                bestSuit = suit;
                bestScore = analysis.score;
            }
        });
        
        return bestSuit;
    }
    
    getSuitStrength(player, suit) {
        const hand = this.hands[player];
        
        if (suit === 'notrump') {
            // For no trump, consider overall hand strength and balance
            const handStrength = this.evaluateHandStrength(player);
            const isBalanced = handStrength.maxLength <= 5 && handStrength.minLength >= 2;
            return isBalanced ? handStrength.score / 4 : handStrength.score / 6;
        }
        
        const suitCards = hand.filter(card => card.suit === suit);
        const suitLength = suitCards.length;
        const suitHonors = suitCards.filter(card => ['A', 'K', 'Q', 'J'].includes(card.rank)).length;
        
        // Calculate suit strength score
        let strength = 0;
        strength += suitLength * 2; // Length is important
        strength += suitHonors * 3; // Honors are valuable
        
        // Bonus for very long suits
        if (suitLength >= 6) {
            strength += (suitLength - 5) * 2;
        }
        
        // Penalty for very short suits
        if (suitLength <= 2) {
            strength *= 0.5;
        }
        
        return strength;
    }

    nextPlayerInTrick() {
         // Move to next player in clockwise order
         const lastPlayer = this.currentTrick[this.currentTrick.length - 1].player;
         const lastPlayerIndex = this.players.indexOf(lastPlayer);
         const nextPlayerIndex = (lastPlayerIndex + 1) % 4; // Clockwise progression
        const nextPlayerName = this.players[nextPlayerIndex];
        
        if (nextPlayerIndex === 2) {
            // Human player's turn - add small delay to ensure trick state is updated
            setTimeout(() => {
            this.enableCardSelection();
            }, 100);
        } else {
            // Bot player's turn
            this.disableCardSelection();
            setTimeout(() => {
                this.botPlayCard(nextPlayerName);
            }, 400);
        }
    }

    botPlayCard(playerName = null) {
        if (!playerName) {
            const currentPlayerIndex = this.getCurrentPlayerIndex();
            playerName = this.players[currentPlayerIndex];
        }
        

        
        const hand = this.hands[playerName];
        if (hand.length === 0) return;
        
        // Smart card selection that follows suit rules
        let cardIndex = this.selectValidBotCard(playerName);
        
        this.playCard(playerName, cardIndex);
    }
    
    selectValidBotCard(player) {
        const hand = this.hands[player];
        if (!hand || hand.length === 0) return 0;
        
        // Advanced card selection based on sophisticated strategy
        if (this.currentTrick.length === 0) {
            return this.selectLeadCard(player);
        } else {
            return this.selectFollowCard(player);
        }
    }
    
    selectLeadCard(player) {
        const hand = this.hands[player];
        const handAnalysis = this.evaluateHandStrength(player);
        const playerBid = this.phase2Bids[player] || 0;
        const tricksTaken = this.tricksWon[player] || 0;
        const tricksNeeded = playerBid - tricksTaken;
        const tricksRemaining = 13 - this.tricksPlayed;
        
        // Enhanced strategic decision based on position relative to bid
        const isUnderBid = tricksNeeded > 0;
        const isOverBid = tricksNeeded < 0;
        const isExactBid = tricksNeeded === 0;
        const urgencyLevel = this.calculateUrgencyLevel(tricksNeeded, tricksRemaining);
        
        // Advanced context for card selection
        const context = {
            isUnderBid,
            isOverBid,
            isExactBid,
            tricksNeeded,
            tricksRemaining,
            urgencyLevel,
            handAnalysis,
            playerBid,
            tricksTaken,
            // Add awareness of other players' situations
            opponentSituations: this.analyzeOpponentSituations()
        };
        
        let bestCardIndex = 0;
        let bestScore = -999;
        
        for (let i = 0; i < hand.length; i++) {
            const card = hand[i];
            const score = this.evaluateLeadCardChoice(card, player, context);
            
            if (score > bestScore) {
                bestScore = score;
                bestCardIndex = i;
            }
        }
        
        // Log strategy for debugging
        const chosenCard = hand[bestCardIndex];
        const strategyType = isUnderBid ? 'UNDER' : isOverBid ? 'OVER' : 'EXACT';
        console.log(`🧠 ${this.getPlayerDisplayName(player)} (${strategyType}, needs ${tricksNeeded}): leads ${chosenCard.rank}${this.getSuitSymbol(chosenCard.suit)}`);
        
        return bestCardIndex;
    }
    
    selectFollowCard(player) {
        const hand = this.hands[player];
        const leadSuit = this.currentTrick[0].card.suit;
        const playerBid = this.phase2Bids[player] || 0;
        const tricksTaken = this.tricksWon[player] || 0;
        const tricksNeeded = playerBid - tricksTaken;
        const tricksRemaining = 13 - this.tricksPlayed;
        
        // Enhanced strategic awareness
        const isUnderBid = tricksNeeded > 0;
        const isOverBid = tricksNeeded < 0;
        const isExactBid = tricksNeeded === 0;
        const urgencyLevel = this.calculateUrgencyLevel(tricksNeeded, tricksRemaining);
        
        // Find valid cards (must follow suit if possible)
        const validCards = [];
        const suitCards = [];
        
        for (let i = 0; i < hand.length; i++) {
            if (hand[i].suit === leadSuit) {
                suitCards.push({index: i, card: hand[i]});
            }
            validCards.push({index: i, card: hand[i]});
        }
        
        // Must follow suit if possible
        const followCards = suitCards.length > 0 ? suitCards : validCards;
        const canFollowSuit = suitCards.length > 0;
        
        // Enhanced context for card selection
        const context = {
            leadSuit,
            tricksNeeded,
            tricksRemaining,
            currentTrick: this.currentTrick,
            canFollowSuit,
            isUnderBid,
            isOverBid,
            isExactBid,
            urgencyLevel,
            playerBid,
            tricksTaken,
            // Analyze the current trick situation
            trickAnalysis: this.analyzeTrickSituation(),
            // Analyze what other players need
            opponentSituations: this.analyzeOpponentSituations()
        };
        
        let bestCardIndex = followCards[0].index;
        let bestScore = -999;
        
        for (const cardInfo of followCards) {
            const score = this.evaluateFollowCardChoice(cardInfo.card, player, context);
            
            if (score > bestScore) {
                bestScore = score;
                bestCardIndex = cardInfo.index;
            }
        }
        
        // Log strategy for debugging
        const chosenCard = hand[bestCardIndex];
        const strategyType = isUnderBid ? 'UNDER' : isOverBid ? 'OVER' : 'EXACT';
        const actionType = canFollowSuit ? 'follows' : 'discards';
        console.log(`🧠 ${this.getPlayerDisplayName(player)} (${strategyType}, needs ${tricksNeeded}): ${actionType} ${chosenCard.rank}${this.getSuitSymbol(chosenCard.suit)}`);
        
        return bestCardIndex;
    }
    
    evaluateLeadCardChoice(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const hand = this.hands[player];
        const suitLength = hand.filter(c => c.suit === card.suit).length;
        
        // Basic card strength baseline
        score += cardStrength * 0.1;
        
        if (context.isUnderBid) {
            // UNDER BID STRATEGY: Need to win tricks aggressively
            score += this.evaluateUnderBidLeadStrategy(card, player, context);
            
        } else if (context.isOverBid) {
            // OVER BID STRATEGY: Need to avoid tricks while trying to get rid of dangerous cards
            score += this.evaluateOverBidLeadStrategy(card, player, context);
            
        } else {
            // EXACT BID STRATEGY: Play defensively to maintain exact count
            score += this.evaluateExactBidLeadStrategy(card, player, context);
        }
        
        // Apply urgency multiplier based on how desperate the situation is
        score *= (1 + context.urgencyLevel * 0.5);
        
        return score;
    }
    
    evaluateUnderBidLeadStrategy(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const hand = this.hands[player];
        const suitLength = hand.filter(c => c.suit === card.suit).length;
        
        // Aggressive trick-taking strategy
        if (isTrump) {
            score += 15; // Trump leads are very strong
            if (cardStrength >= 12) score += 10; // High trump is excellent
        }
        
        // High cards in long suits
        if (cardStrength >= 12) {
            score += 12; // Aces and Kings
            if (suitLength >= 4) score += 8; // Even better in long suits
        }
        
        if (cardStrength >= 10) {
            score += 6; // Queens and Jacks
            if (suitLength >= 3) score += 4;
        }
        
        // Establish long suits
        if (suitLength >= 5) score += 10;
        if (suitLength >= 4) score += 6;
        
        // Avoid weak leads unless desperate
        if (cardStrength <= 6 && context.urgencyLevel < 0.7) {
            score -= 8;
        }
        
        // Consider opponents' situations - lead where they can't compete
        const opponentAnalysis = context.opponentSituations;
        if (opponentAnalysis.someNeedToAvoid && !isTrump) {
            score += 5; // Lead non-trump when opponents want to avoid tricks
        }
        
        return score;
    }
    
    evaluateOverBidLeadStrategy(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const hand = this.hands[player];
        const suitLength = hand.filter(c => c.suit === card.suit).length;
        
        // Smart disposal strategy
        if (isTrump) {
            score -= 20; // Avoid trump leads - too dangerous
            if (cardStrength >= 12) score -= 15; // High trump is very dangerous
        }
        
        // Get rid of dangerous cards strategically
        if (cardStrength >= 12 && !isTrump) {
            score += 8; // Lead high non-trump to get rid of it
            if (suitLength === 1) score += 12; // Singleton high cards are very dangerous
        }
        
        // Lead from short suits to get rid of them
        if (suitLength <= 2 && !isTrump) {
            score += 10;
            if (cardStrength <= 8) score += 5; // Low cards in short suits
        }
        
        // Safe low cards
        if (cardStrength <= 6) {
            score += 12;
            if (!isTrump) score += 5;
        }
        
        // Middle cards are risky - might accidentally win
        if (cardStrength >= 8 && cardStrength <= 11) {
            score -= 5;
        }
        
        // Consider if opponents need tricks - can sometimes feed them safely
        const opponentAnalysis = context.opponentSituations;
        if (opponentAnalysis.someNeedTricks && cardStrength <= 8) {
            score += 8; // Safe to lead low when opponents need tricks
        }
        
        return score;
    }
    
    evaluateExactBidLeadStrategy(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const hand = this.hands[player];
        const suitLength = hand.filter(c => c.suit === card.suit).length;
        
        // Conservative strategy - avoid both winning and losing unexpectedly
        
        // Moderate preference for middle cards
        if (cardStrength >= 7 && cardStrength <= 10) {
            score += 8;
        }
        
        // Avoid very high cards unless in long suits where we control them
        if (cardStrength >= 12) {
            if (suitLength >= 4) score += 3; // Can control long suit
            else score -= 8; // Dangerous high cards
        }
        
        // Avoid very low cards that might let others take unexpected tricks
        if (cardStrength <= 5) {
            score -= 5;
        }
        
        // Trump considerations
        if (isTrump) {
            if (cardStrength >= 10) score -= 5; // Avoid high trump
            else score += 3; // Low trump can be useful
        }
        
        // Lead from suits where we have good control
        if (suitLength >= 3) {
            const suitCards = hand.filter(c => c.suit === card.suit);
            const highCardsInSuit = suitCards.filter(c => this.getCardValue(c) >= 10).length;
            if (highCardsInSuit >= 2) score += 6; // Good control
        }
        
        return score;
    }
    
    evaluateFollowCardChoice(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const isLeadSuit = card.suit === context.leadSuit;
        
        // Analyze current trick situation
        const canWinTrick = this.canCardWinTrick(card, context.currentTrick);
        const trickAnalysis = context.trickAnalysis;
        
        if (context.isUnderBid) {
            // UNDER BID STRATEGY: Aggressively try to win tricks
            score += this.evaluateUnderBidFollowStrategy(card, player, context, canWinTrick, isLeadSuit, isTrump, cardStrength);
            
        } else if (context.isOverBid) {
            // OVER BID STRATEGY: Avoid tricks while getting rid of dangerous cards
            score += this.evaluateOverBidFollowStrategy(card, player, context, canWinTrick, isLeadSuit, isTrump, cardStrength);
            
        } else {
            // EXACT BID STRATEGY: Play precisely to maintain exact count
            score += this.evaluateExactBidFollowStrategy(card, player, context, canWinTrick, isLeadSuit, isTrump, cardStrength);
        }
        
        // Apply urgency multiplier
        score *= (1 + context.urgencyLevel * 0.3);
        
        return score;
    }
    
    evaluateUnderBidFollowStrategy(card, player, context, canWinTrick, isLeadSuit, isTrump, cardStrength) {
        let score = 0;
        
        if (canWinTrick) {
            // Excellent - we can win this trick
            score += 25;
            
            // Prefer winning with lower cards to save high ones
            if (isLeadSuit) {
                score += (20 - cardStrength); // Win cheaply in suit
            } else if (isTrump) {
                score += 20; // Trump wins are good
                if (cardStrength <= 8) score += 10; // Low trump wins are excellent
            }
            
        } else {
            // Can't win - minimize loss and save good cards
            if (isLeadSuit) {
                score += (15 - cardStrength); // Play lowest possible in suit
            } else {
                // Not following suit - opportunity to discard or trump
                if (isTrump) {
                    // Check if we can trump to win
                    const hasTrumpWin = this.hands[player].some(c => 
                        c.suit === this.trumpSuit && this.canCardWinTrick(c, context.currentTrick));
                    if (!hasTrumpWin) {
                        score += 15; // Trump anyway if no better trump
                    } else {
                        score -= 10; // Save this trump for better opportunity
                    }
                } else {
                    // Discard safely
                    score += 12;
                    // Get rid of dangerous high cards
                    if (cardStrength >= 12) score += 8;
                    // Keep middle cards
                    if (cardStrength >= 8 && cardStrength <= 11) score -= 3;
                }
            }
        }
        
        return score;
    }
    
    evaluateOverBidFollowStrategy(card, player, context, canWinTrick, isLeadSuit, isTrump, cardStrength) {
        let score = 0;
        
        if (canWinTrick) {
            // Bad - we might win when we don't want to
            score -= 25;
            
            // Especially bad if we're forced to win with a high card
            if (isLeadSuit && cardStrength >= 10) {
                score -= 15; // Very bad to be forced to win with high card
            }
            
            // Trump wins are very dangerous when over-bid
            if (isTrump) {
                score -= 20;
                if (cardStrength >= 10) score -= 10;
            }
            
        } else {
            // Good - we won't win
            score += 20;
            
            if (isLeadSuit) {
                // Play highest card that won't win to get rid of dangerous cards
                score += cardStrength; // Higher cards are better to discard
            } else {
                // Discarding opportunity
                if (isTrump) {
                    // Avoid trumping unless forced
                    score -= 10;
                } else {
                    score += 15; // Great discard opportunity
                    // Prioritize getting rid of dangerous cards
                    if (cardStrength >= 12) score += 15; // Aces and Kings are dangerous
                    if (cardStrength >= 10) score += 8; // Queens and Jacks too
                    // Keep safe low cards for later
                    if (cardStrength <= 6) score -= 5;
                }
            }
        }
        
        // Consider if someone else might need this trick
        const opponentAnalysis = context.opponentSituations;
        if (opponentAnalysis.someNeedTricks && !canWinTrick) {
            score += 8; // Good to let others win when we want to avoid
        }
        
        return score;
    }
    
    evaluateExactBidFollowStrategy(card, player, context, canWinTrick, isLeadSuit, isTrump, cardStrength) {
        let score = 0;
        
        if (canWinTrick) {
            // Neutral to slightly negative - we need to be selective
            score -= 8;
            
            // Only win if we have good reason
            if (isLeadSuit) {
                // Win cheaply in suit if possible
                if (cardStrength <= 10) score += 15;
                else score -= 5; // Avoid winning with high cards unless necessary
            } else if (isTrump) {
                // Trump wins should be calculated
                score -= 5; // Generally avoid unless strategic
            }
            
        } else {
            // Good - safe play
            score += 10;
            
            if (isLeadSuit) {
                // Play middle cards when following suit
                if (cardStrength >= 7 && cardStrength <= 10) score += 8;
                else if (cardStrength <= 6) score += 5; // Low cards are safe
                else score += 2; // High cards are risky but sometimes necessary
            } else {
                // Discard opportunity
                if (isTrump) {
                    score -= 5; // Avoid trumping when exact
                } else {
                    score += 12; // Good discard
                    // Get rid of problematic cards
                    if (cardStrength >= 12) score += 6;
                    if (cardStrength <= 5) score += 3;
                }
            }
        }
        
        return score;
    }
    
    calculateUrgencyLevel(tricksNeeded, tricksRemaining) {
        if (tricksNeeded === 0) return 0; // No urgency when exact
        
        const absNeeded = Math.abs(tricksNeeded);
        if (absNeeded >= tricksRemaining) return 1.0; // Maximum urgency
        
        const ratio = absNeeded / Math.max(tricksRemaining, 1);
        return Math.min(ratio * 1.5, 1.0); // Scale urgency
    }
    
    analyzeOpponentSituations() {
        const situations = {
            someNeedTricks: false,
            someNeedToAvoid: false,
            mostDesperate: null,
            maxUrgency: 0
        };
        
        this.players.forEach(player => {
            const bid = this.phase2Bids[player] || 0;
            const taken = this.tricksWon[player] || 0;
            const needed = bid - taken;
            const remaining = 13 - this.tricksPlayed;
            
            if (needed > 0) {
                situations.someNeedTricks = true;
                const urgency = this.calculateUrgencyLevel(needed, remaining);
                if (urgency > situations.maxUrgency) {
                    situations.maxUrgency = urgency;
                    situations.mostDesperate = player;
                }
            } else if (needed < 0) {
                situations.someNeedToAvoid = true;
            }
        });
        
        return situations;
    }
    
    analyzeTrickSituation() {
        if (this.currentTrick.length === 0) {
            return { position: 'lead', highestCard: null, canWin: true };
        }
        
        const leadSuit = this.currentTrick[0].card.suit;
        const highestCard = this.getHighestCardInCurrentTrick();
        
        return {
            position: this.currentTrick.length + 1,
            leadSuit,
            highestCard,
            hasTrump: this.currentTrick.some(play => play.card.suit === this.trumpSuit),
            tricksNeededByLeader: this.calculateTricksNeededByPlayer(this.currentTrick[0].player)
        };
    }
    
    calculateTricksNeededByPlayer(player) {
        const bid = this.phase2Bids[player] || 0;
        const taken = this.tricksWon[player] || 0;
        return bid - taken;
    }
    
    canCardWinTrick(card, currentTrick) {
        if (currentTrick.length === 0) return true;
        
        const leadSuit = currentTrick[0].card.suit;
        const highestCard = this.getHighestCardInCurrentTrick();
        
        // Trump always wins over non-trump
        if (card.suit === this.trumpSuit && highestCard.suit !== this.trumpSuit) {
            return true;
        }
        
        // Same suit comparison
        if (card.suit === highestCard.suit) {
            return this.getCardValue(card) > this.getCardValue(highestCard);
        }
        
        // Non-trump vs trump loses
        if (card.suit !== this.trumpSuit && highestCard.suit === this.trumpSuit) {
            return false;
        }
        
        // Off-suit vs lead suit loses
        if (card.suit !== leadSuit && highestCard.suit === leadSuit) {
            return false;
        }
        
        return false;
    }
    
    getHighestCardInCurrentTrick() {
        if (this.currentTrick.length === 0) return null;
        
        let highest = this.currentTrick[0].card;
        for (let i = 1; i < this.currentTrick.length; i++) {
            const card = this.currentTrick[i].card;
            
            // Trump beats non-trump
            if (card.suit === this.trumpSuit && highest.suit !== this.trumpSuit) {
                highest = card;
            }
            // Same suit - higher rank wins
            else if (card.suit === highest.suit && 
                     this.getCardValue(card) > this.getCardValue(highest)) {
                highest = card;
            }
        }
        
        return highest;
    }

    getCurrentPlayerIndex() {
        if (this.currentTrick.length === 0) {
            return this.trickLeader;
        }
        
        const lastPlayer = this.currentTrick[this.currentTrick.length - 1].player;
        return (this.players.indexOf(lastPlayer) + 1) % 4;
    }

    displayCards() {
        // Add safety check for hands
        if (!this.hands || typeof this.hands !== 'object') {
            console.warn('displayCards called but hands not initialized:', this.hands);
            return;
        }
        
        // Verify each player has exactly 13 cards before displaying
        this.players.forEach(player => {
            if (this.hands[player].length !== 13) {
                console.error(`displayCards: ${player} has ${this.hands[player].length} cards instead of 13!`);
                // Limit to 13 cards to prevent display issues
                if (this.hands[player].length > 13) {
                    this.hands[player] = this.hands[player].slice(0, 13);
                    console.warn(`Truncated ${player} hand to 13 cards`);
                }
            }
        });
        
        // Display human player cards (sorted)
        const southCardsDiv = document.getElementById('south-cards');
        if (southCardsDiv && this.hands.south && Array.isArray(this.hands.south)) {
            southCardsDiv.innerHTML = '';
            const sortedCards = this.sortCards(this.hands.south);
            // Ensure we only display up to 13 cards
            const cardsToDisplay = sortedCards.slice(0, 13);
            cardsToDisplay.forEach((card, index) => {
                const cardElement = this.createCardElement(card);
                southCardsDiv.appendChild(cardElement);
            });
        }
        
        // Display bot player cards (face down)
        ['north', 'east', 'west'].forEach(player => {
            const cardsDiv = document.getElementById(`${player}-cards`);
            if (cardsDiv && this.hands[player] && Array.isArray(this.hands[player])) {
                cardsDiv.innerHTML = '';
                // Ensure we only display up to 13 cards
                const cardsToDisplay = Math.min(this.hands[player].length, 13);
                for (let i = 0; i < cardsToDisplay; i++) {
                    const cardElement = this.createCardBack();
                    cardsDiv.appendChild(cardElement);
                }
            }
        });
        
        this.cardsDisplayed = true;
    }

    createCardElement(card) {
        // Add null check for card parameter
        if (!card || typeof card !== 'object') {
            console.warn('createCardElement called with invalid card:', card);
            return this.createCardBack(); // Return a card back instead of crashing
        }
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        
        const cardFace = document.createElement('div');
        cardFace.className = 'card-face';
        
        // Top-left corner
        const topSection = document.createElement('div');
        topSection.style.position = 'absolute';
        topSection.style.top = '8px';
        topSection.style.left = '8px';
        topSection.style.display = 'flex';
        topSection.style.flexDirection = 'column';
        topSection.style.alignItems = 'flex-start';
        
        const rank = document.createElement('div');
        rank.className = 'card-rank';
        rank.style.fontSize = '20px';
        rank.style.fontWeight = '900';
        rank.style.lineHeight = '1';
        rank.textContent = card.rank || '?';
        rank.style.color = this.getSuitColor(card.suit);
        
        topSection.appendChild(rank);
        
        // Large center suit symbol
        const centerSuit = document.createElement('div');
        centerSuit.className = 'card-center-suit';
        centerSuit.style.fontSize = '42px';
        centerSuit.style.textAlign = 'center';
        centerSuit.style.position = 'absolute';
        centerSuit.style.top = '50%';
        centerSuit.style.left = '50%';
        centerSuit.style.transform = 'translate(-50%, -50%)';
        centerSuit.style.fontWeight = 'bold';
        centerSuit.style.opacity = '0.8';
        centerSuit.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.3)';
        centerSuit.textContent = this.getSuitSymbol(card.suit);
        centerSuit.style.color = this.getSuitColor(card.suit);
        
        cardFace.appendChild(topSection);
        cardFace.appendChild(centerSuit);
        cardDiv.appendChild(cardFace);
        
        return cardDiv;
    }

    createCardBack() {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card card-back';
        return cardDiv;
    }

    getSuitSymbol(suit) {
        const symbols = {
            clubs: '♣',
            diamonds: '♦',
            hearts: '♥',
            spades: '♠',
            notrump: 'NT'
        };
        return symbols[suit] || suit;
    }

    getSuitColor(suit) {
        const colors = {
            clubs: '#000000',      // Black
            spades: '#000000',     // Black
            diamonds: '#DC143C',   // Red
            hearts: '#DC143C'      // Red
        };
        return colors[suit] || '#000000';
    }

    showBidAnimation(player, bidText) {
        // Create bid animation element
        const bidAnimation = document.createElement('div');
        bidAnimation.className = 'bid-animation';
        
          // Create content with just the bid (no player position)
        const isPass = bidText === 'Pass';
        
        bidAnimation.innerHTML = `
            <div style="text-align: center;">
                  <div style="font-size: 14px; font-weight: bold; color: ${isPass ? '#FF6B6B' : '#4CAF50'};">
                    ${bidText}
                </div>
            </div>
        `;
        
         // Position the animation above each player's cards
        let animationTop = '50%';
        let animationLeft = '50%';
        
        // Try to position above the player's cards first, then fallback to name area
        const playerCards = document.getElementById(`${player}-cards`);
            const gameBoardRect = document.querySelector('.game-board').getBoundingClientRect();
            
        if (playerCards && gameBoardRect) {
            const cardsRect = playerCards.getBoundingClientRect();
            
            if (player === 'north') {
                // Special positioning for North player - place below their cards instead of above
                animationTop = `${cardsRect.bottom - gameBoardRect.top + 20}px`;
                animationLeft = `${cardsRect.left - gameBoardRect.left + cardsRect.width / 2}px`;
            } else {
                // Position above the center of the cards for other players
                animationTop = `${cardsRect.top - gameBoardRect.top - 60}px`;
                animationLeft = `${cardsRect.left - gameBoardRect.left + cardsRect.width / 2}px`;
            }
            
                 } else {
            // Fallback: position above the player info panel
            const playerInfo = document.querySelector(`.${player}-player`);
            if (playerInfo && gameBoardRect) {
                const rect = playerInfo.getBoundingClientRect();
                
                if (player === 'north') {
                    // Special positioning for North player fallback - place below their info panel
                    animationTop = `${rect.bottom - gameBoardRect.top + 20}px`;
                    animationLeft = `${rect.left - gameBoardRect.left + rect.width / 2}px`;
                } else {
                    // Position above the player info panel for other players
                    animationTop = `${rect.top - gameBoardRect.top - 60}px`;
                    animationLeft = `${rect.left - gameBoardRect.left + rect.width / 2}px`;
                }
             }
        }
        
        bidAnimation.style.cssText = `
            position: absolute;
            top: ${animationTop};
            left: ${animationLeft};
            transform: translate(-50%, -50%);
            background: rgba(255, 215, 0, 0.95);
            color: #000;
             padding: 6px 12px;
             border-radius: 8px;
            font-weight: bold;
            z-index: 2000;
            animation: bidPulse 2s ease-in-out;
             box-shadow: 0 4px 16px rgba(0,0,0,0.3);
             border: 1px solid #FFD700;
        `;
        
        // Add CSS animation
        if (!document.querySelector('#bid-animation-style')) {
            const style = document.createElement('style');
            style.id = 'bid-animation-style';
            style.textContent = `
                @keyframes bidPulse {
                    0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
                    15% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
                    85% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(0.7); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to game board
        const gameBoard = document.querySelector('.game-board');
        if (gameBoard) {
            gameBoard.appendChild(bidAnimation);
            
            // Remove after animation
            setTimeout(() => {
                if (bidAnimation.parentNode) {
                    bidAnimation.parentNode.removeChild(bidAnimation);
                }
            }, 2000);
        }
    }



    sortCards(cards) {
        // Add safety check for cards parameter
        if (!cards || !Array.isArray(cards)) {
            console.warn('sortCards called with invalid cards:', cards);
            return [];
        }
        
        // Filter out any invalid cards before sorting
        const validCards = cards.filter(card => card && typeof card === 'object' && card.suit && card.rank);
        
        if (validCards.length !== cards.length) {
            console.warn('sortCards: filtered out invalid cards, original:', cards.length, 'valid:', validCards.length);
        }
        
        // Define suit order (clubs, diamonds, spades, hearts)
        const suitOrder = {
            clubs: 1,
            diamonds: 2,
            spades: 3,
            hearts: 4
        };
        
        // Define rank order (2 to A)
        const rankOrder = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
            '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        
        return validCards.sort((a, b) => {
            // First sort by suit
            const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
            if (suitDiff !== 0) {
                return suitDiff;
            }
            
            // Then sort by rank (low to high)
            return rankOrder[a.rank] - rankOrder[b.rank];
        });
    }

    hideBiddingInterface() {
        const biddingInterface = document.getElementById('bidding-interface');
        if (biddingInterface) {
            biddingInterface.style.display = 'none';
        }
    }

    hidePhase2Interface() {
        const phase2Interface = document.querySelector('.second-phase-bidding');
        if (phase2Interface) {
            phase2Interface.style.display = 'none';
        }
    }

    updateDisplay() {
        // Update gamlet number display  
        const roundIndicator = document.getElementById('round-indicator');
        if (roundIndicator) {
            roundIndicator.textContent = this.gamletNumber;
        }
        
        // Update trump display
        const trumpIndicator = document.getElementById('trump-indicator');
        if (trumpIndicator) {
            if (this.trumpSuit) {
                trumpIndicator.textContent = this.getSuitSymbol(this.trumpSuit);
                // Apply appropriate color class based on suit
                trumpIndicator.className = `trump-${this.trumpSuit}`;
            } else {
                trumpIndicator.textContent = '-';
                trumpIndicator.className = 'trump-none';
            }
        }
        
        // Update round display (shows current round 1-13 during Phase 3)
        const tricksIndicator = document.getElementById('tricks-indicator');
        if (tricksIndicator) {
            if (this.currentPhase === 'phase3' || this.currentPhase === 'scoring') {
                // Show current round number (1-13) - tricksPlayed + 1 for current round
                const currentRound = this.tricksPlayed + 1;
                tricksIndicator.textContent = `${Math.min(currentRound, 13)}`;
                tricksIndicator.style.color = '';
            } else {
                // Show 1 for other phases (game starts with round 1)
                tricksIndicator.textContent = '1';
                tricksIndicator.style.color = '';
            }
        }
        
        // Update total bid display (now in the turn-indicator field)
        const turnIndicator = document.getElementById('turn-indicator');
        if (turnIndicator) {
            // Calculate total bids regardless of phase
            const totalBids = Object.values(this.phase2Bids).reduce((sum, bid) => {
                return sum + (bid !== null && bid !== undefined ? bid : 0);
            }, 0);
            
            if (totalBids > 0) {
                // Show Phase 2 bid totals and over/under status
                const status = totalBids > 13 ? 'Over' : totalBids < 13 ? 'Under' : 'Exact';
                const color = totalBids > 13 ? '#FF6B6B' : totalBids < 13 ? '#4CAF50' : '#FFD700';
                
                turnIndicator.innerHTML = `${totalBids} (${status})`;
                turnIndicator.style.color = color;
            } else {
                // Show 0 when no bids yet
                turnIndicator.textContent = '0';
                turnIndicator.style.color = '';
            }
        }
         
         // Update hand type display
         const handTypeIndicator = document.getElementById('hand-type-indicator');
         if (handTypeIndicator) {
             if (this.handType) {
                 handTypeIndicator.textContent = this.handType.toUpperCase();
                 handTypeIndicator.style.color = this.handType === 'over' ? '#FF6B6B' : '#4CAF50';
             } else {
                 handTypeIndicator.textContent = '-';
             }
         }
         
         // Update scores display
         this.updateScoresDisplay();
        
        // Update player info panels with current bids
        this.updatePlayerInfoPanels();
    }
     
         updateScoresDisplay() {
        // Ensure botNames.south is up to date with current player name
        if (this.playerName && this.playerName !== 'Player') {
            this.botNames.south = `${this.playerName} (S)`;
        }
        
        // Create an array of players with their scores for sorting
        const playerScores = this.players.map(player => ({
            player: player,
            score: this.scores[player],
            displayName: this.getPlayerDisplayName(player)
        }));
        
        // Sort players by score (highest to lowest), then alphabetically if scores are equal
        playerScores.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Sort by score first (highest to lowest)
            } else {
                return a.displayName.localeCompare(b.displayName); // Alphabetical sort if scores are equal
            }
        });
        
        // Get the total score content container
        const totalScoreContent = document.getElementById('total-score-content');
        if (!totalScoreContent) {
            console.warn('Could not find total-score-content element');
            return;
        }
        
        // Clear existing content
        totalScoreContent.innerHTML = '';
        
        // Generate score items in sorted order
        playerScores.forEach((playerData, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            scoreItem.setAttribute('data-player', playerData.player);
            
            // Add ranking indicator for top 3 positions
            let rankingClass = '';
            if (index === 0) rankingClass = 'first-place';
            else if (index === 1) rankingClass = 'second-place';
            else if (index === 2) rankingClass = 'third-place';
            
            if (rankingClass) {
                scoreItem.classList.add(rankingClass);
            }
            
            scoreItem.innerHTML = `
                <span class="player-label">${playerData.displayName}:</span>
                <span class="score-value" id="${playerData.player}-total-score">${playerData.score}</span>
            `;
            
            totalScoreContent.appendChild(scoreItem);
        });
    }

    updatePlayerInfoPanels() {
        // Update each player's bid display in their info panel
        this.players.forEach(player => {
             // Try multiple selectors to find the bid span
             let bidSpan = document.querySelector(`.${player}-player .player-bid`);
             if (!bidSpan) {
                 bidSpan = document.querySelector(`#${player}-player .player-bid`);
             }
             if (!bidSpan) {
                 bidSpan = document.querySelector(`[id*="${player}"] .player-bid`);
             }
             
            if (bidSpan) {
                 // Phase 2 takes priority - if we have a Phase 2 bid, show it regardless of Phase 1 state
                 if (this.phase2Bids[player] !== null && this.phase2Bids[player] !== undefined) {
                        // Show Phase 2 bid amount
                        bidSpan.textContent = `bid: ${this.phase2Bids[player]}`;
                 } else if (this.currentPhase === 'phase2') {
                        // Phase 2 but no bid yet - show waiting status
                        bidSpan.textContent = 'waiting...';
                } else if (this.phase1Bids[player]) {
                    // Show Phase 1 trump bid with colored suit
                    const bid = this.phase1Bids[player];
                    const suitSymbol = this.getSuitSymbol(bid.trumpSuit);
                    const suitColor = this.getSuitColor(bid.trumpSuit);
                    bidSpan.innerHTML = `bid: ${bid.minTakes} <span style="color: ${suitColor};">${suitSymbol}</span>`;
                } else if (this.playersPassed[player]) {
                    bidSpan.textContent = 'bid: Pass';
                } else {
                    bidSpan.textContent = 'bid: -';
                }
             } else {
                 console.warn(`Could not find bid span for player: ${player}`);
             }
         });
     }

         updatePhase2BidDisplay(player, takes) {
                 // Specifically update Phase 2 bid display for a player
         
         // Try multiple selectors to find the bid span
         let bidSpan = document.querySelector(`.${player}-player .player-bid`);
         if (!bidSpan) {
             bidSpan = document.querySelector(`#${player}-player .player-bid`);
         }
         if (!bidSpan) {
             bidSpan = document.querySelector(`[id*="${player}"] .player-bid`);
         }
         
         if (bidSpan) {
             // Handle null/undefined takes properly
             if (takes === null || takes === undefined) {
                 bidSpan.textContent = 'waiting...';
             } else {
                 bidSpan.textContent = `bid: ${takes}`;
             }
             
             // Force a DOM update by triggering a reflow
             bidSpan.offsetHeight;
             
             // Also try to update the parent container to ensure visibility
             const parentContainer = bidSpan.closest('.player-info');
             if (parentContainer) {
                 parentContainer.style.display = 'block';
             }
         } else {
             console.error(`Could not find bid span for player: ${player}`);
             
             // Debug: log all elements with player-bid class
             const allBidSpans = document.querySelectorAll('.player-bid');
             console.log('All bid spans found:', allBidSpans);
             allBidSpans.forEach((span, index) => {
                 console.log(`Bid span ${index}:`, span.textContent, 'parent:', span.parentElement);
             });
         }
         
         // Also update the Phase 2 interface if it's visible
         this.updatePhase2Interface();
         
         // Force a full display update to ensure consistency
         setTimeout(() => {
             this.updatePlayerInfoPanels();
         }, 100);
     }
     
     forceDisplayUpdate() {
         // Force a DOM reflow to ensure updates are visible
         
         // Update all Phase 2 bid displays immediately
         this.players.forEach(player => {
             const bidSpan = document.querySelector(`.${player}-player .player-bid`);
             if (bidSpan) {
                 if (this.phase2Bids[player] !== null && this.phase2Bids[player] !== undefined) {
                     bidSpan.textContent = `bid: ${this.phase2Bids[player]}`;
                 } else {
                     bidSpan.textContent = 'waiting...';
                 }
                 
                 // Force DOM update
                 bidSpan.offsetHeight;
             }
         });
         
         // Also update the Phase 2 interface
         this.updatePhase2Interface();
         
         // Force a complete refresh of player info panels to ensure Phase 1 state is cleared
         setTimeout(() => {
             this.updatePlayerInfoPanels();
         }, 50);
     }

    updatePhase2Interface() {
        // Update Phase 2 interface elements
        const phase2Interface = document.querySelector('.second-phase-bidding');
        if (phase2Interface && phase2Interface.style.display !== 'none') {
            // Update predictions display
            this.players.forEach(player => {
                const predictionElement = document.getElementById(`${player}-prediction`);
                if (predictionElement) {
                    if (this.phase2Bids[player] !== null && this.phase2Bids[player] !== undefined) {
                        predictionElement.textContent = this.phase2Bids[player];
                    } else {
                        predictionElement.textContent = '-';
                    }
                }
            });
            
            // Update total predictions
            const totalElement = document.getElementById('prediction-total');
            if (totalElement) {
                const currentTotal = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
                totalElement.textContent = currentTotal;
                
                // Update status - only show warning when equals 13
                const statusElement = document.getElementById('prediction-status');
                if (statusElement) {
                    if (currentTotal === 13) {
                        statusElement.textContent = '⚠️ equals 13!';
                        statusElement.style.color = '#FF6B6B';
                    } else {
                        statusElement.textContent = '';
                        statusElement.style.color = '#4CAF50';
                    }
                }
            }
        }
    }

    refreshAllPhase2Displays() {
        // Force refresh all Phase 2 bid displays
        this.players.forEach(player => {
            this.updatePhase2BidDisplay(player, this.phase2Bids[player]);
        });
        this.updatePhase2Interface();
    }

    debugPhase2Bids() {
        // Debug method to check Phase 2 bid state
        console.log('=== PHASE 2 BID DEBUG ===');
        console.log('Current Phase:', this.currentPhase);
        console.log('Phase 2 Bids:', this.phase2Bids);
        console.log('Current Bidder:', this.currentBidder);
        console.log('Trump Winner:', this.trumpWinner);
        console.log('Trump Suit:', this.trumpSuit);
        console.log('Minimum Takes:', this.minimumTakes);
        
        // Check DOM elements
        this.players.forEach(player => {
            const bidSpan = document.querySelector(`.${player}-player .player-bid`);
        });
        
        // Check Phase 2 interface
        const phase2Interface = document.querySelector('.second-phase-bidding');
        console.log('Phase 2 interface:', phase2Interface);
        // Check bids data (debug only)
        console.log('Phase 2 Bids:', this.phase2Bids);
    }

    getPhaseDisplayText() {
        switch (this.currentPhase) {
            case 'dealing': return 'Dealing';
            case 'phase1': return 'Phase 1: Trump Bidding';
            case 'phase2': return 'Phase 2: Takes Bidding';
            case 'phase3': return 'Phase 3: Playing';
            default: return 'Unknown';
        }
    }

    bindEvents() {
        // Name modal events
        const startGameBtn = document.getElementById('start-game-btn');
        const playerNameInput = document.getElementById('player-name-input');
        
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                const name = playerNameInput.value.trim();
                if (name) {
                    this.startGameWithName(name);
                } else {
                    this.showGameNotification('Please enter your name to start the game!', 'warning');
                }
            });
        }
        
        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const name = playerNameInput.value.trim();
                    if (name) {
                        this.startGameWithName(name);
                    } else {
                        this.showGameNotification('Please enter your name to start the game!', 'warning');
                    }
                }
            });
        }

        // Fast mode checkbox
        const fastModeCheckbox = document.getElementById('fast-mode-checkbox');
        const fastModeLabel = document.querySelector('.fast-mode-label');
        
        if (fastModeCheckbox) {
            fastModeCheckbox.addEventListener('change', (e) => {
                this.fastMode = e.target.checked;
                
                if (this.fastMode) {
                    fastModeLabel.classList.add('active');
                    this.showGameNotification('⚡ Fast Mode Enabled! All animations 10x faster', 'success', 2000);
                } else {
                    fastModeLabel.classList.remove('active');
                    this.showGameNotification('🐌 Normal Speed Restored', 'info', 2000);
                }
                
                console.log(`Fast mode ${this.fastMode ? 'enabled' : 'disabled'}`);
            });
        }

        // Deal button
        const dealBtn = document.getElementById('deal-btn');
        if (dealBtn) {
            dealBtn.addEventListener('click', () => {
                this.dealCards();
            });
        }
        
        // Bid button
        const bidBtn = document.getElementById('bid-btn');
        if (bidBtn) {
            bidBtn.addEventListener('click', () => {
                if (!this.selectedTricks || !this.selectedSuit) {
                    this.showGameNotification('Please select both tricks and trump suit before bidding!', 'warning');
                    return;
                }
                
                // Check if bid is valid (higher than current highest bid)
                const currentHighestBid = this.getCurrentHighestBid();
                if (currentHighestBid) {
                    if (this.selectedTricks < currentHighestBid.minTakes) {
                        this.showGameNotification(`Your bid must be at least ${currentHighestBid.minTakes} takes (current highest bid).`, 'warning');
                        return;
                    }
                    if (this.selectedTricks === currentHighestBid.minTakes) {
                        const currentSuitRank = this.getSuitRank(currentHighestBid.trumpSuit);
                        const selectedSuitRank = this.getSuitRank(this.selectedSuit);
                        if (selectedSuitRank <= currentSuitRank) {
                            this.showGameNotification(`With ${this.selectedTricks} takes, you need a higher ranking trump suit than ${currentHighestBid.trumpSuit}.`, 'warning');
                            return;
                        }
                    }
                }
                
                this.makePhase1Bid(this.selectedTricks, this.selectedSuit);
            });
        }
        
        // Pass button
        const passBtn = document.getElementById('pass-btn');
        if (passBtn) {
            passBtn.addEventListener('click', () => {
                this.passPhase1();
            });
        }
        
        // Clear button
        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearBidSelections();
            });
        }
        
        // Extended view button
        const extendedViewBtn = document.getElementById('extended-view-btn');
        if (extendedViewBtn) {
            extendedViewBtn.addEventListener('click', () => {
                this.toggleExtendedView();
            });
        }
        
        // Phase 2 trick buttons
        const trickButtons = document.querySelectorAll('.trick-btn');
        trickButtons.forEach(button => {
            button.addEventListener('click', () => {
                const takes = parseInt(button.getAttribute('data-value'), 10);
                if (!isNaN(takes)) {
                    // Check if this would make total exactly 13
                    const currentTotal = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
                    if (currentTotal + takes === 13) {
                        this.showGameNotification('The total of all bids cannot be exactly 13. Please choose a different number.', 'warning');
                        return;
                    }
                    this.makePhase2Bid('south', takes);
                }
            });
        });

        // More button for additional trick options
        const moreBtn = document.getElementById('more-tricks-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', () => {
                this.expandPhase2Bidding();
            });
        }
        
        // Less button to collapse trick options
        const lessBtn = document.getElementById('less-tricks-btn');
        if (lessBtn) {
            lessBtn.addEventListener('click', () => {
                this.collapsePhase2Bidding();
            });
        }
        
        // Hint button - refresh Phase 2 displays
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => {
                if (this.currentPhase === 'phase2') {
                    this.refreshAllPhase2Displays();

                } else {
                    console.log('Hint button: Not in Phase 2, current phase:', this.currentPhase);
                }
            });
        }

        // Rules button - show game rules
        const rulesBtn = document.getElementById('rules-btn');
        if (rulesBtn) {
            rulesBtn.addEventListener('click', () => {
                this.showRules();
            });
        }

        // Close rules button
        const closeRulesBtn = document.getElementById('close-rules-btn');
        if (closeRulesBtn) {
            closeRulesBtn.addEventListener('click', () => {
                this.hideRules();
            });
        }

        // Close rules when clicking outside the modal
        const rulesModal = document.getElementById('rules-modal');
        if (rulesModal) {
            rulesModal.addEventListener('click', (e) => {
                if (e.target === rulesModal) {
                    this.hideRules();
                }
            });
        }

        // New Game button - starts a completely new full game
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => {
                this.resetForNewFullGame();
            });
        }
        
        // Last Hand button - shows last completed hand details
        const lastHandBtn = document.getElementById('last-hand-btn');
        if (lastHandBtn) {
            lastHandBtn.disabled = true; // Start disabled until first hand is played
            lastHandBtn.addEventListener('click', () => {
                this.animateLastHandCards();
            });
        }
        
        // Last Hand modal close buttons
        const lastHandClose = document.getElementById('last-hand-close');
        const lastHandBtnClose = document.getElementById('last-hand-btn-close');
        
        if (lastHandClose) {
            lastHandClose.addEventListener('click', () => {
                this.hideLastHand();
            });
        }
        
        if (lastHandBtnClose) {
            lastHandBtnClose.addEventListener('click', () => {
                this.hideLastHand();
            });
        }
    }

    passPhase1() {
        console.log(`${this.getPlayerDisplayName('south')} passed`);
        this.playersPassed.south = true;
        this.passCount++;
        
        // Show pass animation
        this.showBidAnimation('south', 'Pass');
        
        // Hide bidding interface after pass
        this.hideBiddingInterface();
        
        // Update the display to show the pass
        this.updateDisplay();
        
        // Check if all 4 players have passed
        if (this.passCount >= 4) {
            console.log('All players passed. Starting new hand.');
            this.showGameNotification('All players passed! Starting new hand with fresh cards.', 'info');
            setTimeout(() => this.resetForNewHand(), this.getDelay(1000));
            return;
        }
        
        // Check if 3 players have passed
        if (this.passCount >= 3) {
            // Find the player who didn't pass (the winner)
            const winner = this.players.find(p => !this.playersPassed[p]);
            if (winner && this.phase1Bids[winner]) {
                this.trumpWinner = winner;
                this.trumpSuit = this.phase1Bids[winner].trumpSuit;
                this.minimumTakes = this.phase1Bids[winner].minTakes;
                console.log(`Phase 1 complete. ${winner} won with ${this.minimumTakes} ${this.trumpSuit}`);
                setTimeout(() => this.startPhase2(), this.getDelay(1000));
                return;
            }
        }
        
        // Move to next player after animation
        setTimeout(() => {
            this.nextPhase1Bidder();
        }, 1500);
    }

    nextPhase1Bidder() {
         // Move to next player in clockwise order, skipping those who have passed
        do {
            this.currentBidder = (this.currentBidder + 1) % 4;
        } while (this.playersPassed[this.players[this.currentBidder]]);
        
        const player = this.players[this.currentBidder];
        
        // Check if all 4 players have passed
        if (this.passCount >= 4) {
            console.log('All players passed. Starting new hand.');
            this.showGameNotification('All players passed! Starting new hand with fresh cards.', 'info');
            setTimeout(() => this.resetForNewHand(), this.getDelay(1000));
            return;
        }
        
        // Check if 3 players have passed
        if (this.passCount >= 3) {
            // Find the player who didn't pass (the winner)
            const winner = this.players.find(p => !this.playersPassed[p]);
            if (winner && this.phase1Bids[winner]) {
                this.trumpWinner = winner;
                this.trumpSuit = this.phase1Bids[winner].trumpSuit;
                this.minimumTakes = this.phase1Bids[winner].minTakes;
                console.log(`Phase 1 complete. ${winner} won with ${this.minimumTakes} ${this.trumpSuit}`);
                setTimeout(() => this.startPhase2(), this.getDelay(1000));
                return;
            }
        }
        
        if (player === 'south') {
            // Human player's turn - show bidding interface
            this.promptPhase1Bidder();
        } else {
            // Bot player's turn - hide bidding interface
            this.hideBiddingInterface();
            this.botMakePhase1Bid();
        }
    }

    botMakePhase1Bid() {
        const player = this.players[this.currentBidder];
        
        // Check if this player has already passed - if so, they can't bid again
        if (this.playersPassed[player]) {
            setTimeout(() => {
                this.currentBidder = (this.currentBidder + 1) % 4;
                this.nextPhase1Bidder();
            }, 500);
            return;
        }
        
        // Get current highest bid to determine if we need to bid higher
        const currentHighestBid = this.getCurrentHighestBid();
                // Evaluate hand strength for this player
        const handStrength = this.evaluateHandStrength(player);
        
        // Decide whether to pass or bid based on hand strength and current bidding
        let shouldPass = false;
        let bidMade = false;
        
        if (currentHighestBid) {
            // If there's a current bid, evaluate whether we can/should bid higher
            const currentBidValue = currentHighestBid.minTakes;
            const currentSuit = currentHighestBid.trumpSuit;
            
            // Strategic decision: Avoid bidding the same trump suit as others unless it's significantly better
            const ourBestSuit = this.getBestTrumpSuit(player, handStrength);
            const ourSuitStrength = this.getSuitStrength(player, ourBestSuit);
            const theirSuitStrength = this.getSuitStrength(player, currentSuit);
            
            // Only bid same trump if our hand is significantly stronger in that suit
            if (ourBestSuit === currentSuit && theirSuitStrength < ourSuitStrength * 1.5) {
                // We want the same trump but don't have overwhelming strength - pass and raise in Phase 2
                shouldPass = true;
            } else {
                // Different trump suit - calculate if we can/should bid higher
                const potentialBid = this.calculateHigherBid(currentBidValue, currentSuit, player);
                
                // Validate that the potential bid is actually higher than the current highest bid
                if (potentialBid && this.isBidHigher(potentialBid, currentHighestBid)) {
                    // Be much more aggressive in competitive bidding - lower threshold for bidding higher
                    if (handStrength.score >= 14 || this.shouldBotBid(player, potentialBid, handStrength, currentHighestBid)) {
                        // Make the higher bid
                        this.phase1Bids[player] = potentialBid;
                        console.log(`🃏 PHASE 1: ${this.getPlayerDisplayName(player)} bids ${potentialBid.minTakes} ${potentialBid.trumpSuit}`);
                        const bidText = `${potentialBid.minTakes} ${this.getSuitSymbol(potentialBid.trumpSuit)}`;
                        this.showBidAnimation(player, bidText);
                        bidMade = true;
                        
                        // Update the display to show the new bid
                        this.updateDisplay();
                    } else {
                        shouldPass = true;
                    }
                } else {
                    // Can't bid higher or bid is not valid
                    shouldPass = true;
                }
            }
        } else {
            // No current bid, evaluate whether we should make an opening bid
            if (handStrength.score >= 20) { // More conservative - only strong hands open
                const openingBid = this.calculateSmartOpeningBid(player, handStrength);
                
                // Check if this opening bid would duplicate an existing bid
                const currentHighestBid = this.getCurrentHighestBid();
                if (currentHighestBid && !this.isBidHigher(openingBid, currentHighestBid)) {
                    shouldPass = true;
                } else {
                    this.phase1Bids[player] = openingBid;
                    console.log(`🃏 PHASE 1: ${this.getPlayerDisplayName(player)} opens ${openingBid.minTakes} ${openingBid.trumpSuit}`);
                    const bidText = `${openingBid.minTakes} ${this.getSuitSymbol(openingBid.trumpSuit)}`;
                    this.showBidAnimation(player, bidText);
                    bidMade = true;
                    
                    // Update the display to show the new bid
                    this.updateDisplay();
                }
            } else {
                shouldPass = true;
            }
        }
        
        if (shouldPass) {
            this.playersPassed[player] = true;
            this.passCount++;
            console.log(`🚫 PHASE 1: ${this.getPlayerDisplayName(player)} passed`);
            this.showBidAnimation(player, 'Pass');
            
            // Update the display to show the pass
            this.updateDisplay();
            
            // Check if all 4 players have passed
            if (this.passCount >= 4) {
                console.log('All players passed. Starting new hand.');
                this.showGameNotification('All players passed! Starting new hand with fresh cards.', 'info');
                setTimeout(() => this.resetForNewHand(), this.getDelay(1000));
                return;
            }
            
            // Check if 3 players have passed
            if (this.passCount >= 3) {
                const winner = this.players.find(p => !this.playersPassed[p]);
                if (winner && this.phase1Bids[winner]) {
                    this.trumpWinner = winner;
                    this.trumpSuit = this.phase1Bids[winner].trumpSuit;
                    this.minimumTakes = this.phase1Bids[winner].minTakes;
                    console.log(`Phase 1 complete. ${winner} won with ${this.minimumTakes} ${this.trumpSuit}`);
                    setTimeout(() => this.startPhase2(), this.getDelay(1000));
                    return;
                }
            }
        }
        
        // Move to next player after animation
        setTimeout(() => {
            this.nextPhase1Bidder();
        }, 1500);
    }

    promptPhase1Bidder() {
        // Human player's turn to bid
        
        // Show the bidding interface for the human player
        this.showBiddingInterface();
    }

    getCurrentHighestBid() {
        let highestBid = null;
        
        for (const player of this.players) {
            const bid = this.phase1Bids[player];
            if (bid && !this.playersPassed[player]) {
                if (!highestBid || bid.minTakes > highestBid.minTakes) {
                    highestBid = bid;
                }
            }
        }
        return highestBid;
    }

    // New function to validate if a bid is higher than the current highest bid
    isBidHigher(newBid, currentHighestBid) {
        if (!currentHighestBid) return true; // No current bid, so any bid is higher
        
        // Higher number of tricks always wins
        if (newBid.minTakes > currentHighestBid.minTakes) return true;
        
        // Same number of tricks, higher-ranking suit wins
        if (newBid.minTakes === currentHighestBid.minTakes) {
            const suitRanks = { 'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4, 'notrump': 5 };
            return suitRanks[newBid.trumpSuit] > suitRanks[currentHighestBid.trumpSuit];
        }
        
        return false; // Lower number of tricks
    }

    calculateHigherBid(currentBidValue, currentSuit, player) {
        const suits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];
        const currentSuitRank = suits.indexOf(currentSuit);
        
        // Evaluate hand strength for different trump options
        const handStrength = this.evaluateHandStrength(player);
        const hand = this.hands[player];
        
        // Get player's best trump suit to prioritize it over same-suit bidding
        const ourBestSuit = this.getBestTrumpSuit(player, handStrength);
        const ourBestSuitRank = suits.indexOf(ourBestSuit);
        
        // Prioritize bidding our best suit over just raising the current suit
        // Option 1: Same number in our best suit (if it's higher ranking than current)
        if (ourBestSuitRank > currentSuitRank && currentBidValue < 13) {
            const ourSuitBid = {
                minTakes: currentBidValue,
                trumpSuit: ourBestSuit
            };
            
            // Check if we have strong support for our best suit
            if (this.hasSuitStrength(player, ourBestSuit) && 
                this.canSupportBid(player, ourSuitBid)) {
                return ourSuitBid;
            }
        }
        
        // Option 2: Higher number in our best suit (if it's any ranking)
        if (currentBidValue < 7 && currentBidValue + 1 < 13) {
            const ourSuitHigherBid = {
                minTakes: currentBidValue + 1,
                trumpSuit: ourBestSuit
            };
            
            if (this.hasSuitStrength(player, ourBestSuit) && 
                this.canSupportBid(player, ourSuitHigherBid) &&
                handStrength.score >= 18) {
                return ourSuitHigherBid;
            }
        }
        
        // Option 3: Higher number in same suit (last resort - avoid trump suit duplication)
        if (currentBidValue < 6 && currentBidValue + 1 < 13) {
            const sameSuitBid = {
                minTakes: currentBidValue + 1,
                trumpSuit: currentSuit
            };
            
            // Only bid same suit if we have very strong support for it
            if (this.canSupportBid(player, sameSuitBid) && 
                this.hasSuitStrength(player, currentSuit) &&
                handStrength.score >= 22) {
                return sameSuitBid;
            }
        }
        
        // Option 4: Same number in other higher-ranking suits (explore alternatives)
        for (let i = currentSuitRank + 1; i < suits.length; i++) {
            const higherSuit = suits[i];
            
            // Skip our best suit as we already tried it
            if (higherSuit === ourBestSuit) continue;
            
            if (currentBidValue >= 13) continue;
            
            const higherSuitBid = {
                minTakes: currentBidValue,
                trumpSuit: higherSuit
            };
            
            // More strict requirements for bidding in a suit that's not our best
            if (this.canSupportBid(player, higherSuitBid) && 
                this.hasSuitStrength(player, higherSuit) && 
                handStrength.score >= 24) {
                return higherSuitBid;
            }
        }
        
        // Can't bid higher with any sensible combination
        return null;
    }
    
    canSupportBid(player, bid) {
        const handStrength = this.evaluateHandStrength(player);
        const requiredStrength = bid.minTakes * 3; // Rough estimate: 3 points per trick
        
        return handStrength.score >= requiredStrength;
    }
    
    hasSuitStrength(player, suit) {
        if (suit === 'notrump') {
            // For no trump, need balanced hand with high cards
            const handStrength = this.evaluateHandStrength(player);
            return handStrength.maxLength <= 5 && handStrength.score >= 25;
        }
        
        const hand = this.hands[player];
        const suitCards = hand.filter(card => card.suit === suit);
        const suitLength = suitCards.length;
        const suitHonors = suitCards.filter(card => ['A', 'K', 'Q', 'J'].includes(card.rank)).length;
        
        // Need at least 3 cards in suit with some honors, or 5+ cards
        return (suitLength >= 3 && suitHonors >= 1) || suitLength >= 5;
    }

    calculateOpeningBid() {
        const minTakes = Math.floor(Math.random() * 6) + 4; // 4-9
        const suits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];
        const trumpSuit = suits[Math.floor(Math.random() * suits.length)];
        
        const result = {
            minTakes: minTakes,
            trumpSuit: trumpSuit
        };
        console.log(`calculateOpeningBid returning:`, result);
        return result;
    }

    // Smart bot bidding functions
    evaluateHandStrength(player) {
        const hand = this.hands[player];
        
        // Add null check for hand
        if (!hand || !Array.isArray(hand)) {
            console.warn('evaluateHandStrength called with invalid hand for player:', player, hand);
            return { score: 0, longestSuit: 'clubs', suitCounts: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 }, maxLength: 0 };
        }
        
        let score = 0;
        let longestSuit = 'clubs';
        let maxLength = 0;
        const suitCounts = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
        const suitStrengths = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
        const honors = { clubs: [], diamonds: [], hearts: [], spades: [] };
        
        // Advanced hand analysis with sophisticated evaluation
        hand.forEach(card => {
            if (!card || typeof card !== 'object') {
                console.warn('Invalid card found in hand:', card);
                return;
            }
            
            suitCounts[card.suit]++;
            
            // Track honors per suit for sequence analysis
            if (['A', 'K', 'Q', 'J', '10'].includes(card.rank)) {
                honors[card.suit].push(card.rank);
            }
            
            // Enhanced high card points with positional value
            const rankValue = this.getCardValue(card);
            let cardPoints = 0;
            
            if (card.rank === 'A') cardPoints = 4;
            else if (card.rank === 'K') cardPoints = 3;
            else if (card.rank === 'Q') cardPoints = 2;
            else if (card.rank === 'J') cardPoints = 1;
            else if (card.rank === '10') cardPoints = 0.5; // 10s have some value
            
            score += cardPoints;
            suitStrengths[card.suit] += cardPoints;
        });
        
        // Find longest suit and analyze suit quality
        Object.entries(suitCounts).forEach(([suit, count]) => {
            if (count > maxLength) {
                maxLength = count;
                longestSuit = suit;
            }
        });
        
        // Advanced distribution analysis
        const distribution = Object.values(suitCounts).sort((a, b) => b - a);
        const shortSuits = Object.values(suitCounts).filter(count => count <= 2).length;
        const voids = Object.values(suitCounts).filter(count => count === 0).length;
        const singletons = Object.values(suitCounts).filter(count => count === 1).length;
        
        // Sophisticated suit quality evaluation
        const suitQualities = {};
        Object.keys(suitCounts).forEach(suit => {
            const length = suitCounts[suit];
            const strength = suitStrengths[suit];
            const honorCount = honors[suit].length;
            
            // Quality score: length + honor strength + sequence bonus
            let quality = length * 0.5 + strength + honorCount * 0.3;
            
            // Sequence bonus (A-K, K-Q, etc.)
            const sequences = this.countSequences(honors[suit]);
            quality += sequences * 0.5;
            
            // Texture bonus for intermediate cards
            const intermediates = hand.filter(card => 
                card.suit === suit && ['10', '9', '8'].includes(card.rank)
         ).length;
            quality += intermediates * 0.2;
            
            suitQualities[suit] = quality;
        });
        
        // Advanced scoring adjustments
        // 1. Distribution bonuses
        if (maxLength >= 5) score += 2 + (maxLength - 5) * 0.5; // Graduated long suit bonus
        if (voids > 0) score += voids * 2; // Void bonus for ruffing potential
        if (singletons > 0) score += singletons * 1; // Singleton bonus
        
        // 2. Quick tricks (sure winners)
        let quickTricks = 0;
        Object.keys(suitCounts).forEach(suit => {
            const suitHonors = honors[suit];
            if (suitHonors.includes('A')) quickTricks += 1;
            if (suitHonors.includes('A') && suitHonors.includes('K')) quickTricks += 0.5;
            if (suitHonors.includes('K') && suitHonors.includes('Q') && suitCounts[suit] >= 2) quickTricks += 0.5;
        });
        score += quickTricks * 1.5;
        
        // 3. Control count (aces and protected kings)
        let controls = 0;
        Object.keys(suitCounts).forEach(suit => {
            const suitHonors = honors[suit];
            if (suitHonors.includes('A')) controls += 2;
            else if (suitHonors.includes('K') && suitCounts[suit] >= 2) controls += 1;
        });
        
        // 4. Playing tricks estimation for different trump suits
        const playingTricks = {};
        ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'].forEach(trump => {
            playingTricks[trump] = this.estimatePlayingTricks(hand, trump, suitQualities);
        });
        
        // 5. Defensive strength
        const defensiveTricks = this.estimateDefensiveTricks(hand, suitQualities);
        
        return { 
            score, 
            longestSuit, 
            suitCounts, 
            maxLength,
            suitQualities,
            quickTricks,
            controls,
            playingTricks,
            defensiveTricks,
            distribution,
            voids,
            singletons,
            shortSuits
        };
    }
    
    // Advanced AI helper methods
    countSequences(honors) {
        if (honors.length < 2) return 0;
        
        const rankOrder = ['A', 'K', 'Q', 'J', '10'];
        const positions = honors.map(rank => rankOrder.indexOf(rank)).filter(pos => pos !== -1).sort((a, b) => a - b);
        
        let sequences = 0;
        for (let i = 0; i < positions.length - 1; i++) {
            if (positions[i + 1] === positions[i] + 1) {
                sequences++;
            }
        }
        return sequences;
    }
    
    estimatePlayingTricks(hand, trumpSuit, suitQualities) {
        let tricks = 0;
        
        Object.keys(suitQualities).forEach(suit => {
            const quality = suitQualities[suit];
            const isTrump = (suit === trumpSuit);
            const length = this.hands ? this.hands[Object.keys(this.hands).find(p => this.hands[p] === hand)] ? 
                         this.hands[Object.keys(this.hands).find(p => this.hands[p] === hand)].filter(c => c.suit === suit).length : 0 : 0;
            
            if (isTrump) {
                // Trump suit: length matters more
                tricks += Math.min(length * 0.7, quality * 0.5);
            } else {
                // Side suits: quality matters more
                tricks += Math.min(length * 0.3, quality * 0.4);
            }
        });
        
        return Math.round(tricks * 10) / 10; // Round to 1 decimal
    }
    
    estimateDefensiveTricks(hand, suitQualities) {
        let defensiveTricks = 0;
        
        Object.keys(suitQualities).forEach(suit => {
            const quality = suitQualities[suit];
            // Defensive tricks based on high cards and length
            defensiveTricks += quality * 0.3;
        });
        
        return Math.round(defensiveTricks * 10) / 10;
    }
    
    // Card counting and memory methods
    updateCardMemory(card, player) {
        this.botMemory.cardsSeen.push({card, player, round: this.currentRound});
        this.botMemory.cardsPlayed[player].push(card);
        
        // Update suit distribution tracking
        this.botMemory.suitDistribution[card.suit]--;
        
        // Update probability model
        this.updateProbabilityModel(card, player);
    }
    
    updateProbabilityModel(card, player) {
        // Remove card from possible holdings of other players
        Object.keys(this.botMemory.probabilityModel.playerLikelyHoldings).forEach(p => {
            if (p !== player) {
                const holdings = this.botMemory.probabilityModel.playerLikelyHoldings[p];
                if (holdings[card.suit]) {
                    holdings[card.suit] = holdings[card.suit].filter(c => 
                        !(c.rank === card.rank && c.suit === card.suit)
                    );
                }
            }
        });
    }
    
    // Opponent modeling based on observed play patterns
    analyzeOpponentPattern(player, action, context) {
        const pattern = this.botMemory.playerPatterns[player];
        
        // Update learning data
        pattern.learningData.push({
            action,
            context,
            round: this.currentRound,
            phase: this.currentPhase
        });
        
        // Analyze bidding patterns
        if (action.type === 'bid') {
            const accuracy = this.calculateBiddingAccuracy(player);
            pattern.accuracy = (pattern.accuracy * 0.8) + (accuracy * 0.2); // Weighted average
            
            const risk = this.calculateRiskTolerance(player, action, context);
            pattern.riskTolerance = (pattern.riskTolerance * 0.8) + (risk * 0.2);
        }
    }
    
    calculateBiddingAccuracy(player) {
        const recentBids = this.botMemory.playerPatterns[player].learningData
            .filter(d => d.action.type === 'bid')
            .slice(-5); // Last 5 bids
            
        if (recentBids.length === 0) return 0.5;
        
        let accuracy = 0;
        recentBids.forEach(bid => {
            const actual = bid.context.actualTricks || 0;
            const predicted = bid.action.value || 0;
            const error = Math.abs(actual - predicted);
            accuracy += Math.max(0, 1 - (error / 5)); // Scale error
        });
        
        return accuracy / recentBids.length;
    }
    
    calculateRiskTolerance(player, action, context) {
        // Analyze if player tends to bid aggressively or conservatively
        const bid = action.value;
        const handStrength = context ? (context.handStrength || 0) : 0;
        
        // Risk = bid level relative to hand strength
        const expectedBid = Math.max(0, handStrength / 5); // Simple heuristic
        const risk = bid > expectedBid ? Math.min(1, (bid - expectedBid) / 3) : 0;
        
        return risk;
    }

    calculateSmartOpeningBid(player, handStrength) {
        // Extremely realistic opening bids - most should be 5-6, rarely 7+
        let minTakes = 5; // Start with minimum bid (5 according to official rules)
        
        // Much more conservative thresholds - only exceptional hands bid higher
        if (handStrength.score >= 22) minTakes = 5;  // Decent hands still bid minimum
        if (handStrength.score >= 26) minTakes = 6;  // Good hands bid 6
        if (handStrength.score >= 32) minTakes = 7;  // Strong hands bid 7 (rare)
        if (handStrength.score >= 38) minTakes = 8;  // Exceptional hands bid 8 (very rare)
        
        // Much more conservative caps - most bids should be 5-6
        if (handStrength.score < 30) minTakes = Math.min(minTakes, 6);
        if (handStrength.score < 35) minTakes = Math.min(minTakes, 7);
        
        // Cap at 7 - bids of 8+ should be extremely rare (less than 1%)
        if (handStrength.score < 45) minTakes = Math.min(minTakes, 7);
        
        // Only exceptional hands with multiple aces can bid 8+
        const hand = this.hands[player];
        const aces = hand.filter(card => card.rank === 'A').length;
        if (aces < 3) minTakes = Math.min(minTakes, 7);
        
        // Absolute cap at 8 - no bot should ever bid 9+ in Phase 1
        minTakes = Math.min(minTakes, 8);
        
        // Strategic trump selection based on actual hand composition
        let trumpSuit = this.getBestTrumpSuit(player, handStrength);
        
        // Get suit counts for trump evaluation
        const suitCounts = handStrength.suitCounts;
        
        // Check if there are already bids for this trump suit - avoid duplication
        const existingTrumpSuits = new Set();
        Object.values(this.phase1Bids).forEach(bid => {
            if (bid && bid.trumpSuit) {
                existingTrumpSuits.add(bid.trumpSuit);
            }
        });
        
        // If our best suit is already bid, find next best alternative
        if (existingTrumpSuits.has(trumpSuit)) {
        
            // Find alternative suits that aren't already bid
            const alternativeSuits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump']
                .filter(suit => !existingTrumpSuits.has(suit));
            
            let bestAlternative = null;
            let bestAlternativeScore = 0;
            
            alternativeSuits.forEach(suit => {
                const strength = this.getSuitStrength(player, suit);
                if (strength > bestAlternativeScore) {
                    bestAlternativeScore = strength;
                    bestAlternative = suit;
                }
            });
            
            // Only switch if the alternative is reasonable (at least 60% as good)
            if (bestAlternative && bestAlternativeScore >= this.getSuitStrength(player, trumpSuit) * 0.6) {
                trumpSuit = bestAlternative;
            }
        }
        
        // Be more conservative - reduce bid if trump suit is weak
        if (trumpSuit !== 'notrump' && suitCounts[trumpSuit] < 4) {
            minTakes = Math.max(5, minTakes - 1); // Reduce bid for weak trump
        }
        
        // Remove almost all randomness - keep bids predictable
        if (Math.random() < 0.02 && minTakes < 7) {
            minTakes += 1; // Only 2% chance to bid one higher
        }
        
        return { minTakes, trumpSuit };
    }

    shouldBotBid(player, potentialBid, handStrength, currentHighestBid) {
        // Advanced strategic bidding decision with AI learning
        const playerPattern = this.botMemory.playerPatterns[player];
        const riskTolerance = playerPattern.riskTolerance;
        const biddingStyle = playerPattern.biddingStyle;
        
        // Evaluate hand for this specific bid
        const trumpSuit = potentialBid.trumpSuit;
        const minTakes = potentialBid.minTakes;
        
        // Get playing tricks estimate for this trump suit
        const playingTricks = handStrength.playingTricks[trumpSuit] || 0;
        const defensiveTricks = handStrength.defensiveTricks || 0;
        
        // Conservative threshold based on actual trick-taking potential
        let requiredTricks = minTakes * 0.8; // Need to expect 80% of bid
        
        // Adjust based on bot personality
        switch (biddingStyle) {
            case 'conservative':
                requiredTricks = minTakes * 0.9; // Need 90% confidence
                break;
            case 'aggressive':
                requiredTricks = minTakes * 0.7; // Accept 70% confidence
                break;
            case 'balanced':
                requiredTricks = minTakes * 0.8; // Standard 80%
                break;
        }
        
        // Check if hand can support the bid
        const totalTrickPotential = playingTricks + (defensiveTricks * 0.3);
        if (totalTrickPotential < requiredTricks) {
            return false; // Hand too weak
        }
        
        // Competitive pressure analysis
        if (currentHighestBid) {
            const competitionLevel = currentHighestBid.minTakes;
            
            // Don't bid too high without exceptional hands
            if (minTakes >= 8) {
                return handStrength.score >= 30 && playingTricks >= 8;
            }
            
            if (minTakes >= 7) {
                return handStrength.score >= 25 && playingTricks >= 6.5;
            }
            
            // Risk assessment for competitive bidding
            const riskFactor = (minTakes - competitionLevel) * 0.2;
            if (Math.random() > (riskTolerance + 0.3 - riskFactor)) {
                return false; // Too risky for this bot
            }
        }
        
        // Trump suit fit analysis
        const trumpFit = this.evaluateTrumpFit(handStrength, trumpSuit);
        if (trumpFit < 0.6) { // Need decent trump fit
            return false;
        }
        
        // Positional considerations
        const position = this.currentBidder;
        if (position === 3 && !currentHighestBid) {
            // Last to bid with no competition - can be more aggressive
            requiredTricks *= 0.9;
        }
        
        // Final decision with personality-based randomization
        const baseProb = Math.min(0.8, totalTrickPotential / requiredTricks - 0.2);
        const personalityAdj = riskTolerance * 0.3;
        const finalProb = Math.max(0.1, Math.min(0.9, baseProb + personalityAdj));
        
        return Math.random() < finalProb;
    }
    
    evaluateTrumpFit(handStrength, trumpSuit) {
        if (trumpSuit === 'notrump') {
            // For no trump, need balanced hand with stoppers
            const balanced = handStrength.shortSuits <= 1 && handStrength.maxLength <= 5;
            const controls = handStrength.controls >= 3;
            return (balanced && controls) ? 0.8 : 0.3;
        }
        
        // For suit contracts, evaluate trump suit quality
        const trumpLength = handStrength.suitCounts[trumpSuit] || 0;
        const trumpQuality = handStrength.suitQualities[trumpSuit] || 0;
        
        let fit = 0;
        
        // Length factor
        if (trumpLength >= 5) fit += 0.4;
        else if (trumpLength >= 4) fit += 0.3;
        else if (trumpLength >= 3) fit += 0.2;
        else return 0.1; // Too few trump
        
        // Quality factor
        fit += Math.min(0.4, trumpQuality / 10);
        
        // Distribution bonuses
        if (handStrength.voids > 0) fit += 0.1;
        if (handStrength.singletons > 0) fit += 0.05;
        
        return Math.min(1.0, fit);
    }

    getSuitRank(suit) {
        const suitRanks = {
            'clubs': 1,
            'diamonds': 2, 
            'hearts': 3,
            'spades': 4,
            'notrump': 5
        };
        return suitRanks[suit] || 0;
    }

    endPhase1() {
        // Find highest bid (only from players who didn't pass)
        let highestBid = null;
        let trumpWinner = null;
        
        for (const player of this.players) {
            const bid = this.phase1Bids[player];
            if (bid && !this.playersPassed[player]) {
                if (!highestBid || bid.minTakes > highestBid.minTakes) {
                    highestBid = bid;
                    trumpWinner = player;
                }
            }
        }
        
        if (highestBid) {
            this.trumpWinner = trumpWinner;
            this.trumpSuit = highestBid.trumpSuit;
            this.minimumTakes = highestBid.minTakes;
            const winnerDisplayName = this.getPlayerDisplayName(trumpWinner);
            console.log(`🏆 PHASE 1 WINNER: ${winnerDisplayName} won with ${highestBid.minTakes} ${highestBid.trumpSuit}`);
            
            // Show all player hands for analysis
            console.log(`\n🃏 PLAYER HANDS ANALYSIS:`);
            this.players.forEach(player => {
                const hand = this.hands[player].map(card => `${card.rank}${this.getSuitSymbol(card.suit)}`).sort();
                const handStrength = this.evaluateHandStrength(player);
                console.log(`   ${this.getPlayerDisplayName(player)}: ${hand.join(' ')} (${handStrength.score} pts)`);
            });
            console.log(''); // Empty line for readability
            
            this.startPhase2();
        } else {
            // All passed, redeal
            console.log('All players passed, redealing...');
            this.resetForNewHand();
        }
    }

    resetForNewHand() {
        this.currentPhase = 'dealing';
        
        // Ensure hands are completely cleared and reset
        this.hands = { 
            north: [], 
            east: [], 
            south: [], 
            west: [] 
        };
        
        // Verify hands are empty
        this.players.forEach(player => {
            if (this.hands[player].length !== 0) {
                console.warn(`resetForNewHand: ${player} hand not properly cleared, forcing reset`);
                this.hands[player] = [];
            }
        });
        
        this.phase1Bids = { north: null, east: null, south: null, west: null };
        this.phase2Bids = { north: null, east: null, south: null, west: null };
        this.tricksWon = { north: 0, east: 0, south: 0, west: 0 };
        this.currentTrick = [];
        this.trickLeader = 2; // Always start from South
        this.tricksPlayed = 0;
        this.currentBidder = null;
        this.passCount = 0;
        this.playersPassed = { north: false, east: false, south: false, west: false };
        this.selectedTricks = null;
        this.selectedSuit = null;
        this.phase2BiddingExpanded = false; // Reset to collapsed view for new hand
         this.handType = null;
         
        // Reset pass button state for new hand
        this.resetPassButtonState();
         
        // Update trick count display for all players
        this.players.forEach(player => {
            this.updateTrickCount(player);
        });
        
        // Reset deck and ensure it has exactly 52 cards
        this.shuffleDeck();
        
        // Verify deck integrity
        if (this.deck.length !== 52) {
            console.error(`resetForNewHand: Deck has ${this.deck.length} cards instead of 52, reshuffling...`);
            this.shuffleDeck();
        }
        
        // Show deal button for new hand
        const dealBtn = document.getElementById('deal-btn');
        if (dealBtn) {
            dealBtn.style.display = 'block';
        }
        
        this.updateDisplay();
    }
    
    showScoreAnimations(scoreChanges) {
        // Show animated score changes for each player
        this.players.forEach((player, index) => {
            const scoreChange = scoreChanges[player];
            if (scoreChange === 0) return; // Skip if no score change
            
            // Find the player's display area
            const playerElement = document.getElementById(`${player}-player`) || 
                                document.querySelector(`.${player}-player`);
            
            if (!playerElement) {
                console.warn(`Could not find player element for ${player}`);
                return;
            }
            
            // Create score animation element
            const scoreAnimation = document.createElement('div');
            scoreAnimation.className = 'score-animation';
            
            // Format score text with + or - sign
            const scoreText = scoreChange > 0 ? `+${scoreChange}` : `${scoreChange}`;
            scoreAnimation.textContent = scoreText;
            
            // Get player element position
            const playerRect = playerElement.getBoundingClientRect();
            const gameBoard = document.querySelector('.game-board');
            const gameBoardRect = gameBoard.getBoundingClientRect();
            
            // Position animation above the player (adjust for North player)
            let animationTop, animationLeft;
            
            if (player === 'north') {
                // For North player, position below instead of above
                animationTop = (playerRect.bottom - gameBoardRect.top + 10) + 'px';
                animationLeft = (playerRect.left - gameBoardRect.left + playerRect.width / 2) + 'px';
            } else {
                // For other players, position above
                animationTop = (playerRect.top - gameBoardRect.top - 50) + 'px';
                animationLeft = (playerRect.left - gameBoardRect.left + playerRect.width / 2) + 'px';
            }
            

            
            // Style the animation
            scoreAnimation.style.cssText = `
                position: absolute;
                top: ${animationTop};
                left: ${animationLeft};
                transform: translateX(-50%);
                font-size: 24px;
                font-weight: bold;
                color: ${scoreChange > 0 ? '#4CAF50' : '#FF6B6B'};
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
                z-index: 2500;
                pointer-events: none;
                animation: scoreFloat 2000ms ease-out forwards;
            `;
            
            // Add to game board
            gameBoard.appendChild(scoreAnimation);
            
            // Remove animation after completion
            setTimeout(() => {
                if (scoreAnimation.parentNode) {
                    scoreAnimation.parentNode.removeChild(scoreAnimation);
                }
            }, 2000);
        });
    }
     
     // Scoring according to official Israeli Whist rules
     calculateScore(player, bid, tricksWon) {
         if (bid === tricksWon) {
             // Exact bid: points = tricks² + 10
             return (tricksWon * tricksWon) + 10;
         } else {
             // Failed bid: lose 10 points per trick over/under
             const difference = Math.abs(bid - tricksWon);
             return -(difference * 10);
         }
     }
     
     // Special scoring for zero bids according to official rules
     calculateZeroBidScore(player, tricksWon) {
         if (tricksWon === 0) {
             // Zero bid, zero tricks: 50 points for Under, 25 for Over
             return this.handType === 'under' ? 50 : 25;
         } else if (tricksWon === 1) {
             // Zero bid, one trick: lose 50 points
             return -50;
         } else {
             // Zero bid, multiple tricks: lose 50 for first, +10 for each additional
             return -50 + ((tricksWon - 1) * 10);
         }
     }
     
     // End hand and calculate scores
     endHand() {
                 console.log('🏁 HAND COMPLETE - Final Results:');
        const results = Object.entries(this.tricksWon).map(([p, t]) => `${this.getPlayerDisplayName(p)}: ${t} tricks`).join(', ');
        console.log(`   Tricks Won: ${results}`);
         
         // Calculate scores for each player and collect score changes
         const scoreChanges = {};
         this.players.forEach(player => {
             const bid = this.phase2Bids[player];
             const tricks = this.tricksWon[player];
             
             let score;
             if (bid === 0) {
                 // Special scoring for zero bids
                 score = this.calculateZeroBidScore(player, tricks);
                 console.log(`   💯 ${this.getPlayerDisplayName(player)}: bid 0, took ${tricks} → ${score > 0 ? '+' : ''}${score} pts (${this.scores[player]} → ${this.scores[player] + score})`);
             } else {
                 // Regular scoring
                 score = this.calculateScore(player, bid, tricks);
                 const status = tricks === bid ? '✅ EXACT' : tricks > bid ? '📈 OVER' : '📉 UNDER';
                 console.log(`   ${status} ${this.getPlayerDisplayName(player)}: bid ${bid}, took ${tricks} → ${score > 0 ? '+' : ''}${score} pts (${this.scores[player]} → ${this.scores[player] + score})`);
             }
             
             scoreChanges[player] = score;
             this.scores[player] += score;
         });
         
         // Update AI learning with actual results
         this.updateAILearning();
         
         // Show score animations before updating display
         this.showScoreAnimations(scoreChanges);
         
         // Update the score table display after animations
         setTimeout(() => this.updateScoresDisplay(), this.getDelay(2000));
         
         // Store last hand data for review
         this.storeLastHandData(scoreChanges);
         
         // Always save gamlet to history after completion
         this.saveGamletToHistory(this.scores);
         
                 // Check for full game completion (200 points OR 10 gamlets)
        const winnerBy200 = this.players.find(player => this.scores[player] >= 200);
        const gameComplete = winnerBy200 || this.gamletNumber >= 10;
        
        // Check if human player won this gamlet
        const gamletWinner = this.players.reduce((leader, player) => 
            this.scores[player] > this.scores[leader] ? player : leader
        );
        
        if (gamletWinner === 'south') {
            // Human player won this gamlet - show fireworks!
            this.showFireworks();
        }
        
        if (gameComplete) {
            const winnerDisplayName = winnerBy200 ? 
                this.getPlayerDisplayName(winnerBy200) : 
                this.getPlayerDisplayName(this.players.reduce((leader, player) => 
                    this.scores[player] > this.scores[leader] ? player : leader
                ));
            
            const winReason = winnerBy200 ? 
                `with ${this.scores[winnerBy200]} points!` : 
                `after ${this.gamletNumber} gamlets!`;
            
            console.log(`🏆 FULL GAME WINNER: ${winnerDisplayName} ${winReason}`);
            
            // If human player won the full game, show extra fireworks
            const fullGameWinner = winnerBy200 || this.players.reduce((leader, player) => 
                this.scores[player] > this.scores[leader] ? player : leader
            );
            
            if (fullGameWinner === 'south') {
                setTimeout(() => this.showFireworks(true), 1000); // Extra fireworks for full game win
            }
            
            this.showGameNotification(`🎉 ${winnerDisplayName} WINS THE FULL GAME ${winReason}`, 'success', 5000);
             
             // Save current full game data to history
            const gameData = {
                 gameNumber: this.gamletsPlayed + 1,
                players: {}
            };
            
            this.players.forEach(player => {
                gameData.players[player] = {
                    finalScore: this.scores[player],
                    totalBids: this.getTotalBidsForPlayer(player)
                };
                this.cumulativeScores[player] += this.scores[player];
            });
            
             this.gamletHistory.push(gameData);
             this.gamletsPlayed++;
             
             // Show full game completion and start new full game
             this.showGameNotification(`Full Game ${this.fullGameNumber} Complete! Starting new full game in 3 seconds...`, 'info', 3000);
             setTimeout(() => {
                 this.resetForNewFullGame();
             }, this.getDelay(3000));
        } else {
             // Continue with new gamlet
             console.log(`Gamlet ${this.gamletNumber} complete. Starting next gamlet...`);
             this.showGameNotification(`Gamlet ${this.gamletNumber} Complete! Starting Gamlet ${this.gamletNumber + 1} in 2 seconds...`, 'info', 2000);
             setTimeout(() => {
                 this.resetForNewGamlet();
             }, this.getDelay(2000));
         }
     }
     
     updateAILearning() {
         // Update AI learning with actual performance vs predictions
         this.players.forEach(player => {
             if (player === 'south') return; // Skip human player
             
             const actualTricks = this.tricksWon[player] || 0;
             const predictedTricks = this.phase2Bids[player] || 0;
             const pattern = this.botMemory.playerPatterns[player];
             
             // Update recent learning data with actual results
             const recentBids = pattern.learningData
                 .filter(d => d.action.type === 'bid' && d.round === this.currentRound);
                 
             recentBids.forEach(bidData => {
                 bidData.context.actualTricks = actualTricks;
             });
             
             // Calculate accuracy for this hand
             const error = Math.abs(actualTricks - predictedTricks);
             const handAccuracy = Math.max(0, 1 - (error / 5)); // Scale 0-1
             
             // Update running accuracy (weighted average)
             pattern.accuracy = (pattern.accuracy * 0.8) + (handAccuracy * 0.2);
             
             // Update risk tolerance based on results
             if (error === 0) {
                 // Perfect prediction - can afford to be slightly more aggressive
                 pattern.riskTolerance = Math.min(1.0, pattern.riskTolerance + 0.02);
             } else if (error >= 2) {
                 // Poor prediction - become more conservative
                 pattern.riskTolerance = Math.max(0.1, pattern.riskTolerance - 0.03);
             }
             
             // Adapt bidding style based on long-term performance
             const recentAccuracy = this.calculateBiddingAccuracy(player);
             if (recentAccuracy < 0.5 && pattern.biddingStyle === 'aggressive') {
                 pattern.biddingStyle = 'balanced';
                 console.log(`🤖 ${this.getPlayerDisplayName(player)}: adapting to BALANCED (poor accuracy)`);
             } else if (recentAccuracy > 0.8 && pattern.biddingStyle === 'conservative') {
                 pattern.biddingStyle = 'balanced';
                 console.log(`🤖 ${this.getPlayerDisplayName(player)}: adapting to BALANCED (high accuracy)`);
             }
         });
     }
     
     updateRoundDisplay() {
         // Update the round indicator to show current gamlet number
         const roundIndicator = document.getElementById('round-indicator');
         if (roundIndicator) {
             roundIndicator.textContent = this.gamletNumber;
         }
         
         // Reset tricks indicator
         const tricksIndicator = document.getElementById('tricks-indicator');
         if (tricksIndicator) {
             tricksIndicator.textContent = '1';
         }
         
         // Reset turn indicator
         const turnIndicator = document.getElementById('turn-indicator');
         if (turnIndicator) {
             turnIndicator.textContent = '-';
             turnIndicator.style.color = '';
         }
         
         // Reset trump indicator
         const trumpIndicator = document.getElementById('trump-indicator');
         if (trumpIndicator) {
             trumpIndicator.textContent = '-';
             trumpIndicator.className = 'trump-none';
         }
     }
     
     resetForNewGamlet() {
         console.log('=== RESETTING FOR NEW GAMLET ===');
         
         // Increment gamlet number for next gamlet
         this.gamletNumber++;
         
         // Force immediate update of gamlet counter display
         const roundIndicator = document.getElementById('round-indicator');
         if (roundIndicator) {
             roundIndicator.textContent = this.gamletNumber;
             console.log(`Gamlet counter updated to: ${this.gamletNumber}`);
         }
         
         // Check if we have a cached player name to auto-continue
         const cachedName = localStorage.getItem('israeliWhist_playerName');
         if (cachedName && cachedName.trim()) {
             // Auto-continue with cached name - no need to show modal
             console.log(`Auto-starting new gamlet with cached name: ${cachedName}`);
             this.playerName = cachedName.trim();
         } else {
             // Show name modal for new players
         this.showNameModal();
             return; // Exit early since the modal will handle the rest
         }
         
         // DON'T reset scores for new gamlet - scores carry over until full game ends
         // this.scores = { north: 0, east: 0, south: 0, west: 0 }; // Keep current scores!
         this.currentRound = 1;
         
         // Reset game state completely
         this.currentPhase = 'dealing';
         this.trumpSuit = null;
         this.trumpWinner = null;
         this.minimumTakes = 0;
         this.handType = null;
         this.passCount = 0;
         this.playersPassed = { north: false, east: false, south: false, west: false };
         
         // Clear all displays
         this.updateScoresDisplay();
         this.updateRoundDisplay();
         this.updateDisplay(); // Ensure main display (including game number) is updated
         this.updatePlayerNameDisplay(); // Ensure player name is updated
         this.hideBiddingInterface();
         this.hidePhase2Interface();
         this.clearAllCards();
         this.clearTrickArea();
         
         // Reset pass button state for new game
         this.resetPassButtonState();
         
                 // Reset for new hand
         this.resetForNewHand();
        
        // Ensure trick counts are reset in display
        this.players.forEach(player => {
            this.updateTrickCount(player);
        });
        
        console.log('New gamlet started fresh!');
     }
     
     resetForNewFullGame() {
         console.log('=== RESETTING FOR NEW FULL GAME ===');
         
         // Increment full game number
         this.fullGameNumber++;
         
         // Reset gamlet counter to 1 for new full game
         this.gamletNumber = 1;
         
         // Force immediate update of gamlet counter display
         const roundIndicator = document.getElementById('round-indicator');
         if (roundIndicator) {
             roundIndicator.textContent = this.gamletNumber;
             console.log(`New full game started - Gamlet counter reset to: ${this.gamletNumber}`);
         }
         
         // Check if we have a cached player name to auto-continue
         const cachedName = localStorage.getItem('israeliWhist_playerName');
         if (cachedName && cachedName.trim()) {
             // Auto-continue with cached name - no need to show modal
             console.log(`Auto-starting new full game with cached name: ${cachedName}`);
             this.playerName = cachedName.trim();
         } else {
             // Show name modal for new players
             this.showNameModal();
             return; // Exit early since the modal will handle the rest
         }
         
         // Reset ALL scores for new full game
         this.scores = { north: 0, east: 0, south: 0, west: 0 };
         this.currentRound = 1;
         
         // Reset game state completely
         this.currentPhase = 'dealing';
         this.trumpSuit = null;
         this.trumpWinner = null;
         this.minimumTakes = 0;
         this.handType = null;
         this.passCount = 0;
         this.playersPassed = { north: false, east: false, south: false, west: false };
         
         // Clear all displays
         this.updateScoresDisplay();
         this.updateRoundDisplay();
         this.updateDisplay(); // Ensure main display (including gamlet number) is updated
         this.updatePlayerNameDisplay(); // Ensure player name is updated
         this.hideBiddingInterface();
         this.hidePhase2Interface();
         this.clearAllCards();
         this.clearTrickArea();
         
         // Reset pass button state for new game
         this.resetPassButtonState();
         
                 // Reset for new hand
         this.resetForNewHand();
        
        // Ensure trick counts are reset in display
        this.players.forEach(player => {
            this.updateTrickCount(player);
        });
        
         console.log('New full game started fresh!');
     }
     
     showDealButtonForNextHand() {
         // Show the deal button for the next hand
         const dealBtn = document.getElementById('deal-btn');
         if (dealBtn) {
             dealBtn.style.display = 'block';
             console.log('Deal button shown for next hand');
         }
         
         // Update the display to show new game number
         this.updateDisplay();
     }
     
     initializeHintSystem() {
         // Set up hint button click handler
         const hintBtn = document.getElementById('hint-btn');
         const hintModal = document.getElementById('hint-modal');
         const hintClose = document.getElementById('hint-close');
         const hintBtnClose = document.getElementById('hint-btn-close');
         
         if (hintBtn) {
             hintBtn.addEventListener('click', () => this.showHint());
         }
         
         if (hintClose) {
             hintClose.addEventListener('click', () => this.hideHint());
         }
         
         if (hintBtnClose) {
             hintBtnClose.addEventListener('click', () => this.hideHint());
         }
         
         // Close hint when clicking outside modal
         if (hintModal) {
             hintModal.addEventListener('click', (e) => {
                 if (e.target === hintModal) {
                     this.hideHint();
                 }
             });
         }
     }
     
     showHint() {
         const hintBody = document.getElementById('hint-body');
         const hintModal = document.getElementById('hint-modal');
         
         if (!hintBody || !hintModal) return;
         
         // Generate hint based on current game state
         const hintContent = this.generateHint();
         hintBody.innerHTML = hintContent;
         
         // Show the modal
         hintModal.style.display = 'flex';
     }
     
     hideHint() {
         const hintModal = document.getElementById('hint-modal');
         if (hintModal) {
             hintModal.style.display = 'none';
         }
         }
    
    showGameNotification(message, type = 'info', duration = 3000) {
        // Remove any existing notifications
        const existingNotification = document.querySelector('.game-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        
        // Create icon based on type
        let icon = '';
        switch(type) {
            case 'warning':
                icon = '⚠️';
                break;
            case 'error':
                icon = '❌';
                break;
            case 'success':
                icon = '✅';
                break;
            case 'info':
            default:
                icon = 'ℹ️';
                break;
        }
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'warning' ? 'linear-gradient(135deg, #ff6b6b, #ff5722)' : 
                       type === 'error' ? 'linear-gradient(135deg, #f44336, #d32f2f)' : 
                       type === 'success' ? 'linear-gradient(135deg, #4caf50, #388e3c)' : 
                       'linear-gradient(135deg, #2196f3, #1976d2)'};
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-family: 'Arial', sans-serif;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            border: 3px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            animation: notificationSlideIn 0.3s ease-out;
        `;
        
        // Add CSS animation if not already added
        if (!document.querySelector('#notification-animation-style')) {
            const style = document.createElement('style');
            style.id = 'notification-animation-style';
            style.textContent = `
                @keyframes notificationSlideIn {
                    0% { 
                        transform: translate(-50%, -50%) scale(0.7); 
                        opacity: 0; 
                    }
                    100% { 
                        transform: translate(-50%, -50%) scale(1); 
                        opacity: 1; 
                    }
                }
                
                @keyframes notificationSlideOut {
                    0% { 
                        transform: translate(-50%, -50%) scale(1); 
                        opacity: 1; 
                    }
                    100% { 
                        transform: translate(-50%, -50%) scale(0.7); 
                        opacity: 0; 
                    }
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .notification-icon {
                    font-size: 24px;
                }
                
                .notification-message {
                    font-size: 18px;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Add to body
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'notificationSlideOut 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }
    
    showRules() {
         const rulesModal = document.getElementById('rules-modal');
         if (rulesModal) {
             rulesModal.style.display = 'flex';
         }
     }

         showNameModal() {
        const nameModal = document.getElementById('name-modal');
        const playerNameInput = document.getElementById('player-name-input');
        
        if (nameModal) {
            nameModal.style.display = 'flex';
            
            // Try to load cached name from localStorage
            const cachedName = localStorage.getItem('israeliWhist_playerName');
            if (cachedName && playerNameInput) {
                playerNameInput.value = cachedName;
                playerNameInput.focus();
                playerNameInput.select(); // Select the text so user can easily change it
            }
        }
    }

     getPlayerDisplayName(player) {
         return this.botNames[player] || player;
     }

         updatePlayerNameDisplay() {
        // Update the botNames mapping for south player with position
        this.botNames.south = `${this.playerName} (S)`;

        // Update player name in the game board
        const southPlayerName = document.getElementById('south-player-name');
        if (southPlayerName) {
            southPlayerName.textContent = `${this.playerName} (S)`;
        }

        // Update player name in score display
        const southScoreLabel = document.getElementById('south-score-label');
        if (southScoreLabel) {
            southScoreLabel.textContent = `${this.playerName}:`;
        }

        // Update player name in phase 2 predictions
        const southPredictionLabel = document.getElementById('south-prediction-label');
        if (southPredictionLabel) {
            southPredictionLabel.textContent = 'S:';
        }
    }

     hideRules() {
         const rulesModal = document.getElementById('rules-modal');
         if (rulesModal) {
             rulesModal.style.display = 'none';
         }
     }
     
     showLastHand() {
         if (!this.lastHandData) {
             this.showGameNotification('No previous hand data available!', 'warning');
             return;
         }
         
         const lastHandBody = document.getElementById('last-hand-body');
         const lastHandModal = document.getElementById('last-hand-modal');
         
         if (!lastHandBody || !lastHandModal) return;
         
         // Generate the last hand summary
         const content = this.generateLastHandContent();
         lastHandBody.innerHTML = content;
         
         // Show the modal
         lastHandModal.style.display = 'flex';
     }
     
     hideLastHand() {
         const lastHandModal = document.getElementById('last-hand-modal');
         if (lastHandModal) {
             lastHandModal.style.display = 'none';
         }
     }
     
     showLastHandButton() {
         const lastHandBtn = document.getElementById('last-hand-btn');
         // Show button if we have either last trick data or full last hand data
         if (lastHandBtn && (this.lastTrickData || this.lastHandData)) {
             lastHandBtn.style.display = 'block';
         }
     }
     
     hideLastHandButton() {
         const lastHandBtn = document.getElementById('last-hand-btn');
         if (lastHandBtn) {
             lastHandBtn.style.display = 'none';
         }
     }
     
     animateLastHandCards() {
         // Use last trick data if available, otherwise use last hand data
         let cards;
         if (this.lastTrickData && this.lastTrickData.length > 0) {
             cards = this.lastTrickData;
         } else if (this.lastHandData && this.lastHandData.lastTrickCards) {
             cards = this.lastHandData.lastTrickCards;
         } else {
             this.showGameNotification('No last trick cards available!', 'warning');
             return;
         }
         
         // Hide the button during animation
         this.hideLastHandButton();
         
         // Create animation container
         const animationContainer = document.createElement('div');
         animationContainer.className = 'last-hand-animation';
         animationContainer.style.cssText = `
             position: absolute;
             top: 50%;
             left: 50%;
             transform: translate(-50%, -50%);
             z-index: 2000;
             width: 300px;
             height: 200px;
             pointer-events: none;
         `;
         
         document.body.appendChild(animationContainer);
         
         // Animate each card in sequence
         cards.forEach((cardData, index) => {
             setTimeout(() => {
                 const cardElement = document.createElement('div');
                 cardElement.className = 'animated-card';
                 cardElement.innerHTML = `
                     <div class="card-mini">
                         <div class="card-rank">${cardData.card.rank}</div>
                         <div class="card-suit" style="color: ${cardData.card.suit === 'hearts' || cardData.card.suit === 'diamonds' ? '#dc143c' : '#000'}">${this.getSuitSymbol(cardData.card.suit)}</div>
                     </div>
                     <div class="card-player">${this.getPlayerDisplayName(cardData.player)}</div>
                 `;
                 
                 // Position cards in a circle
                 const angle = (index * 90) * Math.PI / 180;
                 const radius = 80;
                 const x = Math.cos(angle) * radius;
                 const y = Math.sin(angle) * radius;
                 
                 cardElement.style.cssText = `
                     position: absolute;
                     left: 50%;
                     top: 50%;
                     transform: translate(-50%, -50%) translate(${x}px, ${y}px) scale(0);
                     animation: cardAppear 0.5s ease-out forwards;
                     text-align: center;
                 `;
                 
                 animationContainer.appendChild(cardElement);
             }, index * 200);
         });
         
         // Clean up animation after 2 seconds
         setTimeout(() => {
             if (animationContainer.parentNode) {
                 animationContainer.remove();
             }
             // Show button again if we have last trick or hand data
             if (this.lastTrickData || this.lastHandData) {
                 this.showLastHandButton();
             }
         }, 2000);
     }
     
     generateLastHandContent() {
         const data = this.lastHandData;
         
         let content = `
             <h4>Full Game ${data.fullGameNumber}, Gamlet ${data.gamletNumber}</h4>
             <div class="hand-section">
                 <strong>Trump:</strong> ${this.getSuitSymbol(data.trumpSuit)} (${data.trumpWinnerName})<br>
                 <strong>Completed:</strong> ${data.endTime}
             </div>
             
             <h4>Results Summary</h4>
             <div class="hand-section">
         `;
         
         // Generate player results
         this.players.forEach(player => {
             const playerName = player === 'south' ? data.playerName : this.getPlayerDisplayName(player);
             const bid = data.phase2Bids[player] || 0;
             const actual = data.tricksWon[player] || 0;
             const scoreChange = data.scoreChanges[player] || 0;
             const finalScore = data.finalScores[player] || 0;
             
             const status = actual === bid ? '✅ EXACT' : actual > bid ? '📈 OVER' : '📉 UNDER';
             const scoreClass = scoreChange >= 0 ? 'score-positive' : 'score-negative';
             const scoreSign = scoreChange >= 0 ? '+' : '';
             
             content += `
                 <div class="player-result">
                     <div>
                         <span class="player-name">${playerName}</span><br>
                         <span class="bid-vs-actual">${status} Bid: ${bid}, Took: ${actual}</span>
                     </div>
                     <div>
                         <span class="score-change ${scoreClass}">${scoreSign}${scoreChange}</span><br>
                         <span style="font-size: 11px; color: #ccc;">Total: ${finalScore}</span>
                     </div>
                 </div>
             `;
         });
         
         content += `
             </div>
             
             <h4>Hand Details</h4>
             <div class="hand-section">
                 <strong>Total Bids:</strong> ${Object.values(data.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0)}<br>
                 <strong>Hand Type:</strong> ${Object.values(data.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0) > 13 ? 'OVER' : 'UNDER'}<br>
                 <strong>Total Tricks:</strong> ${Object.values(data.tricksWon).reduce((sum, tricks) => sum + (tricks || 0), 0)}/13
             </div>
         `;
         
         return content;
     }
     
     generateHint() {
         // Generate strategic hints based on current game phase and state
         if (this.currentPhase === 'phase1') {
             return this.generatePhase1Hint();
         } else if (this.currentPhase === 'phase2') {
             return this.generatePhase2Hint();
         } else if (this.currentPhase === 'phase3') {
             return this.generatePhase3Hint();
         } else {
             return '<p>No hints available at this time. Deal cards to start a new hand!</p>';
         }
     }
     
     generatePhase1Hint() {
         const hand = this.hands.south;
         if (!hand || hand.length === 0) {
             return '<p>No cards dealt yet. Click "Deal Cards" to start!</p>';
         }
         
         const handStrength = this.evaluateHandStrength('south');
         const bestSuit = this.getBestTrumpSuit('south', handStrength);
         const currentBid = this.getCurrentHighestBid();
         
         let hint = '';
         
         // Hand strength assessment
         if (handStrength.score >= 20) {
             hint += '<p>🔥 <strong>Strong hand</strong> - good bidding opportunity</p>';
         } else if (handStrength.score >= 15) {
             hint += '<p>✅ <strong>Decent hand</strong> - consider bidding carefully</p>';
         } else {
             hint += '<p>⚠️ <strong>Weak hand</strong> - passing might be wise</p>';
         }
         
         // Suit recommendation
         hint += `<div class="card-suggestion">`;
         hint += `<strong>Best Trump: ${this.getSuitSymbol(bestSuit)} ${bestSuit.charAt(0).toUpperCase() + bestSuit.slice(1)}</strong><br>`;
         if (bestSuit !== 'notrump') {
             const suitCards = hand.filter(card => card.suit === bestSuit);
             hint += `${suitCards.length} cards with good strength`;
         } else {
             hint += `Balanced hand with high cards`;
         }
         hint += `</div>`;
         
         // Strategic advice
         if (currentBid) {
             const ourBestSuit = this.getBestTrumpSuit('south', handStrength);
             if (ourBestSuit === currentBid.trumpSuit) {
                 hint += '<p>💡 <strong>Same trump:</strong> Pass now, raise in Phase 2 if this wins</p>';
             } else {
                 hint += `<p>🎯 <strong>Compete:</strong> Try ${this.getSuitSymbol(bestSuit)} vs ${currentBid.minTakes} ${this.getSuitSymbol(currentBid.trumpSuit)}</p>`;
             }
         } else {
             hint += '<p>🏁 <strong>Opening:</strong> Conservative 5-6 tricks recommended</p>';
         }
         
         return hint;
     }
     
     generatePhase2Hint() {
         const hand = this.hands.south;
         const handStrength = this.evaluateHandStrength('south');
         const trumpSuit = this.trumpSuit;
         const phase2Bid = this.phase2Bids.south;
         
         if (phase2Bid !== null && phase2Bid !== undefined) {
             return '<p>✅ You have already bid. Wait for other players.</p>';
         }
         
         let hint = `<p><strong>Trump:</strong> ${this.getSuitSymbol(trumpSuit)} ${trumpSuit.charAt(0).toUpperCase() + trumpSuit.slice(1)}</p>`;
         
         // Trump analysis
         if (trumpSuit !== 'notrump') {
             const trumpCards = hand.filter(card => card.suit === trumpSuit);
             if (trumpCards.length >= 5) {
                 hint += '<p>🔥 <strong>Excellent trump support</strong> - bid aggressively</p>';
             } else if (trumpCards.length >= 3) {
                 hint += '<p>✅ <strong>Good trump support</strong> - moderate bidding</p>';
             } else {
                 hint += '<p>⚠️ <strong>Weak trump support</strong> - be conservative</p>';
             }
         }
         
         // Suggested bid
         const suggestedBid = this.calculateSmartPhase2Bid('south', handStrength, 0, 0, 7);
         hint += `<div class="card-suggestion">`;
         hint += `<strong>💡 Suggested: ${suggestedBid} tricks</strong><br>`;
         hint += `Based on hand strength and trump support`;
         hint += `</div>`;
         
         hint += '<p><strong>Key:</strong> Count Aces, Kings, and trump cards. Better to under-bid than over-bid!</p>';
         
         return hint;
     }
     
     generatePhase3Hint() {
         const hand = this.hands.south;
         const currentTrick = this.currentTrick;
         const tricksWon = this.tricksWon.south;
         const targetBid = this.phase2Bids.south;
         
         if (!hand || hand.length === 0) {
             return '<p>No cards left to play!</p>';
         }
         
         const tricksNeeded = targetBid - tricksWon;
         const tricksRemaining = 13 - this.tricksPlayed;
         
         let hint = `<p><strong>Bid:</strong> ${targetBid} | <strong>Taken:</strong> ${tricksWon} | <strong>Need:</strong> ${Math.max(0, tricksNeeded)}</p>`;
         
         // Get suggested card to play
         const suggestedCard = this.getSuggestedCard(hand, currentTrick, tricksNeeded, tricksRemaining);
         
         if (suggestedCard) {
             hint += `<div class="card-suggestion">`;
             hint += `<strong>💡 Play: ${suggestedCard.rank}${this.getSuitSymbol(suggestedCard.suit)}</strong><br>`;
             hint += `${suggestedCard.reason}`;
             hint += `</div>`;
         }
         
         // Brief strategy note
         if (tricksNeeded <= 0) {
             hint += '<p>🎯 <strong>Avoid extra tricks</strong> to prevent penalty</p>';
         } else if (tricksNeeded > tricksRemaining) {
             hint += '<p>🔥 <strong>Must win every remaining trick!</strong></p>';
         } else {
             hint += `<p>📈 <strong>Need ${tricksNeeded} from ${tricksRemaining} remaining</strong></p>`;
         }
         
         return hint;
     }
     
     getSuggestedCard(hand, currentTrick, tricksNeeded, tricksRemaining) {
         if (!hand || hand.length === 0) return null;
         
         // Leading the trick
         if (currentTrick.length === 0) {
             if (tricksNeeded <= 0) {
                 // Try to avoid winning - lead a low card
                 const lowCards = hand.filter(card => this.getCardValue(card) <= 9);
                 if (lowCards.length > 0) {
                     const lowestCard = lowCards.reduce((lowest, card) => 
                         this.getCardValue(card) < this.getCardValue(lowest) ? card : lowest
                     );
                     return { ...lowestCard, reason: "Low card to avoid winning" };
                 }
             } else {
                 // Try to win - lead a high card or trump
                 if (this.trumpSuit !== 'notrump') {
                     const trumpCards = hand.filter(card => card.suit === this.trumpSuit);
                     if (trumpCards.length > 0) {
                         const highTrump = trumpCards.reduce((highest, card) => 
                             this.getCardValue(card) > this.getCardValue(highest) ? card : highest
                         );
                         return { ...highTrump, reason: "Strong trump to lead and win" };
                     }
                 }
                 
                 // Lead highest non-trump
                 const nonTrumps = hand.filter(card => card.suit !== this.trumpSuit);
                 if (nonTrumps.length > 0) {
                     const highCard = nonTrumps.reduce((highest, card) => 
                         this.getCardValue(card) > this.getCardValue(highest) ? card : highest
                     );
                     if (this.getCardValue(highCard) >= 12) { // A, K, Q
                         return { ...highCard, reason: "High card likely to win" };
                     }
                 }
             }
             
             // Default: play any reasonable card
             return { ...hand[0], reason: "Reasonable opening lead" };
         }
         
         // Following in the trick
         const leadCard = currentTrick[0].card;
         const leadSuit = leadCard.suit;
         const suitCards = hand.filter(card => card.suit === leadSuit);
         
         if (suitCards.length > 0) {
             // Can follow suit
             const highestPlayed = this.getHighestCardInTrick();
             const canWin = suitCards.some(card => this.getCardValue(card) > this.getCardValue(highestPlayed));
             
             if (tricksNeeded > 0 && canWin) {
                 // Try to win
                 const winningCards = suitCards.filter(card => this.getCardValue(card) > this.getCardValue(highestPlayed));
                 const bestWinner = winningCards.reduce((best, card) => 
                     this.getCardValue(card) < this.getCardValue(best) ? card : best // Lowest winner
                 );
                 return { ...bestWinner, reason: "Lowest card that wins the trick" };
             } else {
                 // Play low to avoid winning or save high cards
                 const lowestSuit = suitCards.reduce((lowest, card) => 
                     this.getCardValue(card) < this.getCardValue(lowest) ? card : lowest
                 );
                 return { ...lowestSuit, reason: tricksNeeded <= 0 ? "Low to avoid winning" : "Save high cards" };
             }
         } else {
             // Cannot follow suit - can trump or discard
             if (this.trumpSuit !== 'notrump') {
                 const trumpCards = hand.filter(card => card.suit === this.trumpSuit);
                 if (trumpCards.length > 0 && tricksNeeded > 0) {
                     // Trump to win
                     const lowestTrump = trumpCards.reduce((lowest, card) => 
                         this.getCardValue(card) < this.getCardValue(lowest) ? card : lowest
                     );
                     return { ...lowestTrump, reason: "Trump to win this trick" };
                 }
             }
             
             // Discard - play lowest useless card
             const nonTrumps = hand.filter(card => card.suit !== this.trumpSuit);
             if (nonTrumps.length > 0) {
                 const lowestDiscard = nonTrumps.reduce((lowest, card) => 
                     this.getCardValue(card) < this.getCardValue(lowest) ? card : lowest
                 );
                 return { ...lowestDiscard, reason: "Safe discard" };
             }
             
             // Only trumps left
             const lowestTrump = hand.reduce((lowest, card) => 
                 this.getCardValue(card) < this.getCardValue(lowest) ? card : lowest
             );
             return { ...lowestTrump, reason: "Lowest available card" };
         }
     }
     
     getHighestCardInTrick() {
         if (this.currentTrick.length === 0) return null;
         
         let highest = this.currentTrick[0].card;
         for (let i = 1; i < this.currentTrick.length; i++) {
             const card = this.currentTrick[i].card;
             if (this.getCardValue(card) > this.getCardValue(highest)) {
                 highest = card;
             }
         }
         return highest;
    }
    
    storeLastHandData(scoreChanges) {
        this.lastHandData = {
            gamletNumber: this.gamletNumber,
            fullGameNumber: this.fullGameNumber,
            trumpSuit: this.trumpSuit,
            trumpWinner: this.trumpWinner,
            trumpWinnerName: this.getPlayerDisplayName(this.trumpWinner),
            phase2Bids: { ...this.phase2Bids },
            tricksWon: { ...this.tricksWon },
            scoreChanges: { ...scoreChanges },
            finalScores: { ...this.scores },
            endTime: new Date().toLocaleString(),
            playerName: this.playerName,
            // Store the last trick cards for animation
            lastTrickCards: this.lastTrickData ? [...this.lastTrickData] : []
        };
        
        // Enable the Last Hand button now that we have data
        const lastHandBtn = document.getElementById('last-hand-btn');
        if (lastHandBtn) {
            lastHandBtn.disabled = false;
        }
    }

    saveGamletToHistory(finalScores) {
        const gamletRecord = {
            gamletNumber: this.gamletNumber,
            fullGameNumber: this.fullGameNumber,
            finalScores: { ...finalScores },
            rounds: this.currentRound,
            endTime: new Date().toLocaleString(),
            playerName: this.playerName,
            trumpSuit: this.trumpSuit,
            trumpWinner: this.trumpWinner,
            phase2Bids: { ...this.phase2Bids },
            tricksWon: { ...this.tricksWon }
        };
        
        this.gamletHistory.push(gamletRecord);
        console.log(`Gamlet ${this.gamletNumber} saved to history:`, gamletRecord);
        

    }
    
    // Fireworks animation for when human player wins
    showFireworks(isFullGameWin = false) {
        // Create fireworks container
        const fireworksContainer = document.createElement('div');
        fireworksContainer.className = 'fireworks-container';
        document.body.appendChild(fireworksContainer);
        
        // Show victory message
        if (isFullGameWin) {
            this.showVictoryMessage('🎉 CONGRATULATIONS! 🎉<br>YOU WON THE FULL GAME!');
        } else {
            this.showVictoryMessage('🎊 GAMLET WINNER! 🎊');
        }
        
        // Create multiple fireworks
        const fireworkCount = isFullGameWin ? 15 : 8;
        
        for (let i = 0; i < fireworkCount; i++) {
            setTimeout(() => {
                this.createFirework(fireworksContainer);
            }, i * (isFullGameWin ? 200 : 300));
        }
        
        // Clean up after animation
        setTimeout(() => {
            if (fireworksContainer.parentNode) {
                fireworksContainer.parentNode.removeChild(fireworksContainer);
            }
        }, isFullGameWin ? 6000 : 4000);
    }
    
    showVictoryMessage(message) {
        const victoryMsg = document.createElement('div');
        victoryMsg.className = 'victory-message';
        victoryMsg.innerHTML = message;
        document.body.appendChild(victoryMsg);
        
        // Remove victory message after animation
        setTimeout(() => {
            if (victoryMsg.parentNode) {
                victoryMsg.parentNode.removeChild(victoryMsg);
            }
        }, 3000);
    }
    
    createFirework(container) {
        // Random position
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * (window.innerHeight * 0.6) + (window.innerHeight * 0.2);
        
        // Create trail
        this.createFireworkTrail(container, x, y);
        
        // Create explosion after trail
        setTimeout(() => {
            this.createFireworkExplosion(container, x, y);
        }, 1500);
    }
    
    createFireworkTrail(container, x, targetY) {
        const trail = document.createElement('div');
        trail.className = 'firework-trail';
        trail.style.left = x + 'px';
        trail.style.backgroundColor = this.getRandomFireworkColor();
        trail.style.setProperty('--target-y', targetY + 'px');
        container.appendChild(trail);
        
        // Remove trail after animation
        setTimeout(() => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        }, 1500);
    }
    
    createFireworkExplosion(container, x, y) {
        const colors = [this.getRandomFireworkColor(), this.getRandomFireworkColor()];
        
        // Create center explosion
        const firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = x + 'px';
        firework.style.top = y + 'px';
        firework.style.backgroundColor = colors[0];
        container.appendChild(firework);
        
        // Create particles
        const particleCount = 25;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 100 + Math.random() * 100;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.backgroundColor = colors[i % colors.length];
            particle.style.setProperty('--dx', dx + 'px');
            particle.style.setProperty('--dy', dy + 'px');
            
            container.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 3000);
        }
        
        // Remove main firework after animation
        setTimeout(() => {
            if (firework.parentNode) {
                firework.parentNode.removeChild(firework);
            }
        }, 2000);
    }
    
    getRandomFireworkColor() {
        const colors = [
            '#FFD700', // Gold
            '#FF6B35', // Orange-red
            '#FF1493', // Deep pink
            '#00BFFF', // Deep sky blue
            '#32CD32', // Lime green
            '#FF69B4', // Hot pink
            '#FFA500', // Orange
            '#4169E1', // Royal blue
            '#FF4500', // Red-orange
            '#9932CC'  // Dark orchid
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Get delay time adjusted for fast mode (10x faster when enabled)
    getDelay(normalDelay) {
        return this.fastMode ? Math.max(normalDelay / 10, 50) : normalDelay; // Minimum 50ms even in fast mode
    }

}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    try {
        window.game = new IsraeliWhist();
        console.log('Israeli Whist game loaded successfully!');
        
                 // Expose debug methods globally for console access
         window.debugPhase2Bids = () => window.game.debugPhase2Bids();
         window.refreshPhase2Displays = () => window.game.refreshAllPhase2Displays();
         window.forceUpdate = () => window.game.forceDisplayUpdate();
         window.testBidUpdate = (player, takes) => window.game.updatePhase2BidDisplay(player, takes);
         
                 // Debug helper functions available in console
    } catch (error) {
        console.error('Error initializing game:', error);
    }
});
