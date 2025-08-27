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
        
        // Advanced AI System - Enhanced card tracking and prediction
        this.botMemory = {
            cardsSeen: [], // All cards seen during play
            playerPatterns: {
                north: { biddingStyle: 'conservative', accuracy: 0.8, riskTolerance: 0.2, learningData: [] }, // Botti is very conservative
                east: { biddingStyle: 'balanced', accuracy: 0.75, riskTolerance: 0.4, learningData: [] }, // Droidi is more balanced
                south: { biddingStyle: 'human', accuracy: 0.6, riskTolerance: 0.5, learningData: [] },
                west: { biddingStyle: 'conservative', accuracy: 0.75, riskTolerance: 0.25, learningData: [] } // Chati is conservative too
            },
            // ADVANCED: Player behavior profiling
            behaviorProfiles: {
                north: { phase1History: [], phase2History: [], playingStyle: 'unknown', confidence: 0 },
                east: { phase1History: [], phase2History: [], playingStyle: 'unknown', confidence: 0 },
                south: { phase1History: [], phase2History: [], playingStyle: 'unknown', confidence: 0 },
                west: { phase1History: [], phase2History: [], playingStyle: 'unknown', confidence: 0 }
            },
            gameHistory: [], // Historical data for learning
            cardsPlayed: { north: [], east: [], south: [], west: [] },
            suitDistribution: { clubs: 13, diamonds: 13, hearts: 13, spades: 13 },
            trumpsPlayed: [], // Track all trump cards played
            suitVoids: { // Track which players are void in which suits
                north: { clubs: false, diamonds: false, hearts: false, spades: false },
                east: { clubs: false, diamonds: false, hearts: false, spades: false },
                south: { clubs: false, diamonds: false, hearts: false, spades: false },
                west: { clubs: false, diamonds: false, hearts: false, spades: false }
            },
            probabilityModel: {
                remainingCards: {},
                playerLikelyHoldings: { north: {}, east: {}, south: {}, west: {} },
                trumpEstimates: { north: 0, east: 0, south: 0, west: 0 }, // Estimated trump cards remaining
                suitLengthEstimates: {
                    north: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 },
                    east: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 },
                    south: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 },
                    west: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 }
                }
            }
        };
        
        this.bindEvents();
        this.initializeGame();
    }

    // Get player-specific color for console logging
    getPlayerColor(player) {
        const colors = {
            north: '#1976D2',   // Blue (Botti)
            east: '#F57C00',    // Orange (Droidi) 
            south: '#388E3C',   // Green (Guy/South)
            west: '#C2185B'     // Pink/Magenta (Chati)
        };
        return colors[player] || '#ffffff';
    }

    // Colored console logging for players
    logPlayer(message, player = null) {
        if (player && this.getPlayerColor(player)) {
            console.log(`%c${message}`, `color: ${this.getPlayerColor(player)}; font-weight: bold;`);
        } else {
            console.log(message);
        }
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
            this.logPlayer(`   ${this.getPlayerDisplayName(player)}: ${hand.join(' ')}`, player);
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
        // Always keep pass button enabled
        const passBtn = document.getElementById('pass-btn');
        if (passBtn) {
            passBtn.disabled = false;
            passBtn.title = '';
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
            toggleBtn.textContent = '−';
            toggleBtn.title = 'Show current scores';
            this.generateExtendedScorecard();
        } else {
            // Show normal view
            normalContent.style.display = 'flex';
            extendedContent.style.display = 'none';
            viewTitle.textContent = 'Total Score';
            toggleBtn.textContent = '+';
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
                tableHTML += `<td class="game-number">${gamlet.gamletNumber}</td>`;
            
            let totalBid = 0;
            this.players.forEach(player => {
                    const bid = gamlet.phase2Bids[player] || 0;
                    const score = gamlet.finalScores[player];
                totalBid += bid;
                    tableHTML += `<td class="bid-col player-${player}">${bid}</td>`;
                    tableHTML += `<td class="score-col player-${player}">${score}</td>`;
            });
            
            tableHTML += `<td class="total-row">${totalBid}</td>`;
                

                
            tableHTML += '</tr>';
        });
        }
        
        // Only show current gamlet row if there are no completed gamlets (i.e., very first gamlet)
        if (!hasCompletedGamlets) {
            tableHTML += '<tr class="current-gamlet">';
            tableHTML += `<td class="game-number current">${this.gamletNumber}</td>`;
            
            let currentTotalBid = 0;
            this.players.forEach(player => {
                const currentBid = this.phase2Bids[player] || '-';
                const currentScore = this.scores[player] || 0;
                if (typeof currentBid === 'number') currentTotalBid += currentBid;
                
                tableHTML += `<td class="bid-col player-${player} current">${currentBid}</td>`;
                tableHTML += `<td class="score-col player-${player} current">${currentScore}</td>`;
            });
            
            tableHTML += `<td class="total-row current">${currentTotalBid > 0 ? currentTotalBid : '-'}</td>`;
            

            
            tableHTML += '</tr>';
        }
        
        // Total row
        tableHTML += '<tr class="total-row-tr">';
        tableHTML += '<td class="total-label"><strong>Total</strong></td>';
        
        this.players.forEach(player => {
            // Calculate cumulative score by summing all individual gamlet scores from history
            let cumulativeScore = 0;
            if (hasCompletedGamlets) {
                // Sum all individual gamlet scores from history
                cumulativeScore = this.gamletHistory.reduce((sum, gamlet) => sum + (gamlet.finalScores[player] || 0), 0);
            } else {
                // For first gamlet, use current scores
                cumulativeScore = this.scores[player] || 0;
            }
            tableHTML += `<td class="player-${player} total-score-cell player-total-${player}" colspan="2"><strong>${cumulativeScore}</strong></td>`;
        });
        
        const grandTotalBids = this.gamletHistory.reduce((sum, gamlet) => {
            return sum + this.players.reduce((gamletSum, player) => gamletSum + (gamlet.phase2Bids[player] || 0), 0);
        }, 0);
        tableHTML += `<td><strong>${grandTotalBids || '-'}</strong></td>`;

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
        this.logPlayer(`🃏 PHASE 1: ${this.getPlayerDisplayName('south')} bids ${minTakes} ${trumpSuit}`, 'south');
        
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
        this.logPlayer(`🎯 PHASE 2: ${this.getPlayerDisplayName(player)} predicts ${takes} tricks`, player);
           
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
        // ADVANCED: Expert-level Phase 2 bidding with bid sum awareness
        const playerPattern = this.botMemory.playerPatterns[player];
        const trumpSuit = this.trumpSuit;
        const hand = this.hands[player];
        const playersRemaining = 4 - this.currentBidder;
        
        // STRATEGY: Calculate bid sum awareness - predict desperation plays
        const bidSumAnalysis = this.analyzeBidSumSituation(currentTotal, playersRemaining);
        
        // Base trick estimation
        let trickEstimate = this.calculateRealisticTricks(hand, trumpSuit, handStrength);
        
        // ADVANCED: Adjust bidding based on bid sum analysis
        trickEstimate = this.adjustBidForSumAwareness(trickEstimate, bidSumAnalysis, playersRemaining);
        
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
        // MUCH MORE CONSERVATIVE and realistic trick calculation
        let tricks = 0;
        
        console.log(`Calculating tricks for hand: ${hand.map(c => c.rank + c.suit).join(', ')} with trump: ${trumpSuit}`);
        
        // Count aces - more accurate evaluation
        const aces = hand.filter(card => card.rank === 'A').length;
        tricks += aces * 0.9; // Aces are very strong but can lose to trumps
        console.log(`Aces (${aces}): +${aces * 0.9} tricks`);
        
        // Trump suit analysis - improved accuracy
        if (trumpSuit !== 'notrump') {
            const trumpCards = hand.filter(card => card.suit === trumpSuit);
            const trumpLength = trumpCards.length;
            
            console.log(`Trump cards (${trumpSuit}): ${trumpCards.map(c => c.rank + c.suit).join(', ')} (${trumpLength} cards)`);
            
            // Trump length analysis - more accurate values
            if (trumpLength >= 7) {
                tricks += 2.8; // Very long trump dominance
            } else if (trumpLength >= 6) {
                tricks += 2.2; // Long trump with excellent control (was too low at 1.8)
            } else if (trumpLength >= 5) {
                tricks += 1.6; // Good trump length (was 1.2)
            } else if (trumpLength >= 4) {
                tricks += 1.0; // Decent trump length
            } else if (trumpLength >= 3) {
                tricks += 0.5; // Minimum viable trump suit
            } else if (trumpLength <= 2) {
                tricks -= 0.3; // Short trump is disadvantageous
            }
            
            // Trump honors - improved accuracy
            const trumpAce = trumpCards.some(card => card.rank === 'A');
            const trumpKing = trumpCards.some(card => card.rank === 'K');
            const trumpQueen = trumpCards.some(card => card.rank === 'Q');
            const trumpJack = trumpCards.some(card => card.rank === 'J');
            const trump10 = trumpCards.some(card => card.rank === '10');
            
            if (trumpAce) {
                tricks += 0.8; // Trump ace is very strong
                console.log(`Trump Ace: +0.8 tricks`);
            }
            if (trumpKing && trumpLength >= 3) {
                tricks += 0.5; // Trump king with protection
                console.log(`Trump King (protected): +0.5 tricks`);
            }
            if (trumpQueen && trumpLength >= 3) { // Lower protection requirement
                tricks += 0.3; // Trump queen is more valuable with length
                console.log(`Trump Queen (protected): +0.3 tricks`);
            }
            if (trumpJack && trumpLength >= 4) {
                tricks += 0.2; // Trump jack with good length
                console.log(`Trump Jack (protected): +0.2 tricks`);
            }
            if (trump10 && trumpLength >= 4) {
                tricks += 0.1; // Trump ten can be valuable
                console.log(`Trump Ten (protected): +0.1 tricks`);
            }
            
            // Trump sequence evaluation - NEW
            const trumpSequence = this.evaluateTrumpSequence(trumpCards);
            if (trumpSequence > 0) {
                tricks += trumpSequence;
                console.log(`Trump sequence value: +${trumpSequence} tricks`);
            }
            
            const lengthContribution = trumpLength >= 7 ? 2.8 : trumpLength >= 6 ? 2.2 : trumpLength >= 5 ? 1.6 : trumpLength >= 4 ? 1.0 : trumpLength >= 3 ? 0.5 : trumpLength <= 2 ? -0.3 : 0;
            console.log(`Trump contribution: +${lengthContribution} for length`);
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
                
                // Improved side suit evaluation based on protection and position
                if (suitLength >= 5) {
                    // Very long suits - excellent protection
                    tricks += kings * 0.9; // Very well-protected kings
                    tricks += queens * 0.6; // Protected queens in long suits
                    tricks += jacks * 0.4; // Protected jacks
                    tricks += tens * 0.3; // Protected tens
                    console.log(`  Very long suit (${suitLength}): K=${kings * 0.9}, Q=${queens * 0.6}, J=${jacks * 0.4}, 10=${tens * 0.3}`);
                } else if (suitLength === 4) {
                    // Long suits - well protected
                    tricks += kings * 0.8; // Well-protected kings
                    tricks += queens * 0.5; // Protected queens
                    tricks += jacks * 0.3; // Protected jacks
                    tricks += tens * 0.2; // Protected tens
                    console.log(`  Long suit (4): K=${kings * 0.8}, Q=${queens * 0.5}, J=${jacks * 0.3}, 10=${tens * 0.2}`);
                } else if (suitLength === 3) {
                    // Medium suits - decent protection
                    tricks += kings * 0.7; // Reasonably protected kings
                    tricks += queens * 0.4; // Protected queens
                    tricks += jacks * 0.2; // Protected jacks
                    console.log(`  Medium suit (3): K=${kings * 0.7}, Q=${queens * 0.4}, J=${jacks * 0.2}`);
                } else if (suitLength === 2) {
                    // Short suits - some protection
                    tricks += kings * 0.5; // Some protection
                    tricks += queens * 0.3; // Better than before
                    console.log(`  Short suit (2): K=${kings * 0.5}, Q=${queens * 0.3}`);
                } else { // singleton
                    tricks += kings * 0.3; // Singleton king still has value
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
        
        // Cap the estimate to be realistic - adjusted ceiling for better accuracy
        tricks = Math.max(0.5, Math.min(7.0, tricks));
        
        return tricks;
    }
    
    evaluateTrumpSequence(trumpCards) {
        // Evaluate trump sequence strength for better trick estimation
        if (trumpCards.length < 3) return 0;
        
        // Convert trump cards to numerical ranks for sequence analysis
        const rankValues = {
            'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, 
            '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
        };
        
        const trumpValues = trumpCards.map(card => rankValues[card.rank]).sort((a, b) => b - a);
        let sequenceValue = 0;
        
        // Count consecutive sequences starting from highest cards
        let currentSequence = 1;
        let highestInSequence = trumpValues[0];
        
        for (let i = 1; i < trumpValues.length; i++) {
            if (trumpValues[i] === trumpValues[i-1] - 1) {
                currentSequence++;
            } else {
                // Process completed sequence
                if (currentSequence >= 3) {
                    let seqBonus = (currentSequence - 2) * 0.2; // 0.2 per card beyond 2
                    if (highestInSequence >= 12) seqBonus *= 1.5; // Bonus for high sequences
                    sequenceValue += seqBonus;
                }
                currentSequence = 1;
                highestInSequence = trumpValues[i];
            }
        }
        
        // Check final sequence
        if (currentSequence >= 3) {
            let seqBonus = (currentSequence - 2) * 0.2;
            if (highestInSequence >= 12) seqBonus *= 1.5;
            sequenceValue += seqBonus;
        }
        
        return Math.min(sequenceValue, 0.8); // Cap sequence bonus
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
            this.logPlayer(`     ${this.getPlayerDisplayName(player)}: ${hand.join(' ')} (bid: ${bid})`, player);
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
            
            // Safari-specific fixes
            newCard.style.cursor = 'pointer';
            newCard.style.webkitUserSelect = 'none';
            newCard.style.userSelect = 'none';
            newCard.style.webkitTouchCallout = 'none';
            newCard.style.pointerEvents = 'auto';
            
            // Add multiple event handlers for Safari compatibility
            const clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.onCardClick(newCard);
            };
            
            newCard.addEventListener('click', clickHandler);
            newCard.addEventListener('touchend', clickHandler);
            
            // Add visual feedback for touch devices
            newCard.addEventListener('touchstart', (e) => {
                e.preventDefault();
                newCard.style.transform = 'translateY(-10px) scale(1.05)';
            });
            
            newCard.addEventListener('touchcancel', () => {
                newCard.style.transform = '';
            });
        });
    }
    
    disableCardSelection() {
        const cards = document.querySelectorAll('#south-cards .card');
        const humanCardsContainer = document.getElementById('south-cards');
        
        // Remove class to indicate it's not player's turn
        if (humanCardsContainer) {
            humanCardsContainer.classList.remove('player-turn');
        }
        
        // Remove click handlers and pointer cursor
        cards.forEach(card => {
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            newCard.style.cursor = 'default';
            newCard.style.pointerEvents = 'none';
            newCard.style.transform = '';
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
        this.logPlayer(`🃏 ${this.getPlayerDisplayName(player)} plays ${cardDisplay} (position ${trickPosition}/4)`, player);
        
        // Remove card from hand
        hand.splice(cardIndex, 1);
        
        // For human player, immediately update their card display
        if (player === 'south') {
            this.updateHumanPlayerCards();
        }
        
        // Display the played card on the table
        this.displayPlayedCard(player, card);
        
        // Update hand display
        this.updateDisplay();
        
        // Check if this completes a trick
        if (this.currentTrick.length === 4) {
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
        
        // Track the card in bot memory
        this.trackPlayedCard(player, card);
    }
    
    trackPlayedCard(player, card) {
        // Add to cards played by this player
        this.botMemory.cardsPlayed[player].push(card);
        
        // Track if it's a trump
        if (card.suit === this.trumpSuit) {
            this.botMemory.trumpsPlayed.push({player, card});
        }
        
        // Update suit distribution
        this.botMemory.suitDistribution[card.suit]--;
        
        // If this is the first trick and they don't follow suit, mark them as void
        if (this.currentTrick.length > 1) {
            const leadSuit = this.currentTrick[0].card.suit;
            if (card.suit !== leadSuit && card.suit !== this.trumpSuit) {
                // They couldn't follow suit and didn't trump - they're void in lead suit
                this.botMemory.suitVoids[player][leadSuit] = true;
                // Void detection logged silently for bot memory
            }
        }
        
        // Update trump estimates
        this.updateTrumpEstimates();
    }
    
    updateTrumpEstimates() {
        const totalTrumpsPlayed = this.botMemory.trumpsPlayed.length;
        const trumpsRemaining = 13 - totalTrumpsPlayed;
        
        // Count known trump cards for each player
        this.players.forEach(player => {
            const playerTrumpsPlayed = this.botMemory.trumpsPlayed.filter(t => t.player === player).length;
            const knownHand = this.hands[player];
            
            if (knownHand) {
                // For the current bot, count actual trump cards
                const actualTrumps = knownHand.filter(card => card.suit === this.trumpSuit).length;
                this.botMemory.probabilityModel.trumpEstimates[player] = actualTrumps;
            } else {
                // For other players, estimate based on cards played and statistical distribution
                const handSize = 13 - this.botMemory.cardsPlayed[player].length;
                const estimatedTrumps = Math.max(0, Math.round((trumpsRemaining / (handSize || 1)) * 0.8));
                this.botMemory.probabilityModel.trumpEstimates[player] = estimatedTrumps;
            }
        });
    }
     
    completeTrick() {
        // Determine trick winner according to Israeli Whist rules
        const winner = this.determineTrickWinner();
        this.tricksWon[winner]++;
        this.tricksPlayed++;
        
        // Log the complete trick
        const trickCards = this.currentTrick.map(play => 
            `${this.getPlayerDisplayName(play.player)}: ${play.card.rank}${this.getSuitSymbol(play.card.suit)}`
        ).join(', ');
        console.log(`🏆 TRICK ${this.tricksPlayed} WINNER: ${this.getPlayerDisplayName(winner)} | Cards played: ${trickCards}`);
        
        // Update round display immediately after trick completion
        this.updateDisplay();
        
        // Animate cards moving to winner
        this.animateCardsToWinner(winner);
        
        // Show +1 animation after cards reach winner, then update trick count
        setTimeout(() => {
            this.showPlusOneAnimation(winner);
            // Update trick count after +1 animation starts
            setTimeout(() => {
                this.updateTrickCount(winner);
            }, this.getDelay(500));
        }, this.getDelay(1500));
        
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
    
    showPlusOneAnimation(winner) {
        // Find the winner's name element to position the +1 animation
        const winnerNameElement = document.querySelector(`.${winner}-player .player-name`);
        
        if (!winnerNameElement) {
            console.warn(`Could not find winner's name element for ${winner}`);
            return;
        }
        
        // Create the +1 element
        const plusOneElement = document.createElement('div');
        plusOneElement.textContent = '+1';
        plusOneElement.className = 'plus-one-animation';
        
        // Position it relative to the winner's name
        const nameRect = winnerNameElement.getBoundingClientRect();
        const gameBoard = document.querySelector('.game-board');
        const boardRect = gameBoard.getBoundingClientRect();
        
        // Position relative to the game board
        plusOneElement.style.left = `${nameRect.left - boardRect.left + nameRect.width / 2}px`;
        plusOneElement.style.top = `${nameRect.top - boardRect.top + nameRect.height / 2}px`;
        
        // Add to game board
        gameBoard.appendChild(plusOneElement);
        
        // Remove the element after animation completes
        setTimeout(() => {
            if (plusOneElement.parentNode) {
                plusOneElement.parentNode.removeChild(plusOneElement);
            }
        }, this.getDelay(2000));
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
    
    // SMARTER: Assess trump potential based on Israeli Whist guidance
    getBestTrumpSuit(player, handStrength) {
        const hand = this.hands[player];
        const suits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];
        
        let bestSuit = 'clubs';
        let bestScore = 0;
        
        suits.forEach(suit => {
            const assessment = this.assessTrumpPotential(hand, suit);
            if (assessment.totalScore > bestScore) {
                bestScore = assessment.totalScore;
                bestSuit = suit;
            }
        });
        
        return bestSuit;
    }
    
    // ADVANCED: Assess trump potential for each suit with shape-based bidding
    assessTrumpPotential(hand, suit) {
        if (suit === 'notrump') {
            return this.assessNoTrumpPotential(hand);
        }
        
        const suitCards = hand.filter(card => card.suit === suit);
        const suitLength = suitCards.length;
        const highCards = suitCards.filter(card => ['A', 'K', 'Q', 'J'].includes(card.rank));
        
        // ADVANCED: Shape-based evaluation - don't just count high cards
        const handShape = this.evaluateHandShape(hand);
        const shapeBonus = this.calculateShapeBonus(suit, handShape);
        
        // Count short suits elsewhere (for trumping potential)
        const shortSuits = ['clubs', 'diamonds', 'hearts', 'spades']
            .filter(s => s !== suit)
            .filter(s => hand.filter(card => card.suit === s).length <= 2).length;
        
        let score = shapeBonus;
        
        // GUIDANCE: Look for long suit (5+ cards) - primary factor
        if (suitLength >= 6) {
            score += 4.0; // Very long suit is excellent for trump
        } else if (suitLength >= 5) {
            score += 3.0; // Long suit is good for trump
        } else if (suitLength >= 4) {
            score += 1.5; // Decent length
        } else if (suitLength <= 2) {
            score -= 2.0; // Too short for effective trump
        }
        
        // GUIDANCE: High cards (A, K, Q, J) in trump suit
        const aces = highCards.filter(card => card.rank === 'A').length;
        const kings = highCards.filter(card => card.rank === 'K').length;
        const queens = highCards.filter(card => card.rank === 'Q').length;
        const jacks = highCards.filter(card => card.rank === 'J').length;
        
        score += aces * 1.5;    // Ace is very powerful
        score += kings * 1.0;   // King is strong
        score += queens * 0.7;  // Queen is decent
        score += jacks * 0.4;   // Jack has some value
        
        // GUIDANCE: Short suits elsewhere (to allow trumping)
        score += shortSuits * 0.8; // Each short suit allows ruffing
        
        // Bonus for having both length and high cards
        if (suitLength >= 5 && highCards.length >= 2) {
            score += 1.5; // Excellent trump combination
        }
        
        return {
            length: suitLength,
            honors: highCards.length,
            shortSuits: shortSuits,
            totalScore: Math.max(0, score)
        };
    }
    
    // ADVANCED: NT Precision - control in at least 3 suits required
    assessNoTrumpPotential(hand) {
        const suitCounts = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
        const suitHighCards = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
        const suitControl = { clubs: false, diamonds: false, hearts: false, spades: false };
        
        hand.forEach(card => {
            suitCounts[card.suit]++;
            if (['A', 'K', 'Q', 'J'].includes(card.rank)) {
                suitHighCards[card.suit]++;
            }
            // ADVANCED: Define "control" as A, K, or protected Q/J
            if (card.rank === 'A' || card.rank === 'K') {
                suitControl[card.suit] = true;
            }
        });
        
        // Check for protected Queens/Jacks (with 3+ cards in suit)
        Object.keys(suitCounts).forEach(suit => {
            if (suitCounts[suit] >= 3) {
                const hasQueen = hand.some(card => card.suit === suit && card.rank === 'Q');
                const hasJack = hand.some(card => card.suit === suit && card.rank === 'J');
                if (hasQueen || hasJack) {
                    suitControl[suit] = true;
                }
            }
        });
        
        const totalHighCards = Object.values(suitHighCards).reduce((sum, count) => sum + count, 0);
        const suitsWithControl = Object.values(suitControl).filter(control => control).length;
        const handShape = this.evaluateHandShape(hand);
        
        let score = 0;
        
        // STRATEGY: Only bid NT if you have control in at least 3 suits
        if (suitsWithControl >= 3 && handShape.isBalanced) {
            if (totalHighCards >= 7) {
                score = 5.0; // Excellent NT hand with control
            } else if (totalHighCards >= 6) {
                score = 4.0; // Good NT hand with control
            } else if (totalHighCards >= 5) {
                score = 3.0; // Decent NT hand with control
            }
        } else if (suitsWithControl >= 2) {
            // Insufficient control for NT
            score = 1.0; // Poor NT candidate
        } else {
            score = 0.2; // Very poor NT candidate
        }
        
        // STRATEGY: NT demands finesse and card-counting, not brute force
        // Penalty for unbalanced hands or minimal reliance on trumping
        if (!handShape.isBalanced) {
            score *= 0.4; // Severe penalty for unbalanced
        }
        
        // Bonus for very balanced distribution (4-3-3-3, 4-4-3-2)
        if (handShape.pattern === '4-3-3-3' || handShape.pattern === '4-4-3-2') {
            score *= 1.2;
        }
        
        return {
            length: 13,
            honors: totalHighCards,
            shortSuits: 0,
            totalScore: score,
            suitControl: suitsWithControl
        };
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
        
        // Strategy logging removed for cleaner output
        
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
        
        // Strategy logging removed for cleaner output
        
        return bestCardIndex;
    }
    
    evaluateLeadCardChoice(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const hand = this.hands[player];
        const suitLength = hand.filter(c => c.suit === card.suit).length;
        
        // ADVANCED: Predictive defense based on bidding patterns
        const isTrumpDeclarer = (player === this.trumpWinner);
        if (isTrumpDeclarer) {
            score += this.evaluateTrumpDeclarerLeadStrategy(card, player, context);
        } else {
            // ADVANCED: Predictive defense - watch bidding patterns and respond
            score += this.evaluatePredictiveDefense(card, player, context);
            
            // ADVANCED: Declarer behavior profiling - use learned patterns to predict moves
            score += this.evaluatePlayerBehaviorProfiling(card, player, context);
            
            score += this.evaluateDefensiveLeadStrategy(card, player, context);
        }
        
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
        
        // Apply zero-bid targeting strategy (works for all bid types)
        const zeroBidScore = this.evaluateZeroBidTargeting(card, player, context);
        
        // If there's a strong zero-bid opportunity, prioritize it over normal strategy
        if (zeroBidScore > 100) {
            // Zero-bid targeting overrides normal strategy
            score = zeroBidScore;
            // Zero-bid strategy override applied silently
        } else {
            score += zeroBidScore;
        }
        
        // Apply urgency multiplier based on how desperate the situation is
        score *= (1 + context.urgencyLevel * 0.5);
        
        return score;
    }
    
    // GUIDANCE: Lead with strength when declaring trump
    evaluateTrumpDeclarerLeadStrategy(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const hand = this.hands[player];
        const suitLength = hand.filter(c => c.suit === card.suit).length;
        const suitHighCards = hand.filter(c => c.suit === card.suit && ['A', 'K', 'Q', 'J'].includes(c.rank)).length;
        
        // GUIDANCE: Lead with your strongest suit to establish dominance
        if (isTrump && this.trumpSuit !== 'notrump') {
            // Lead trump to establish control and draw out opponent trumps
            if (cardStrength >= 12) { // A, K
                score += 30; // High trump lead is excellent for declarer
            } else if (cardStrength >= 10) { // Q, J
                score += 20; // Medium trump lead is good
            } else {
                score += 10; // Even low trump can be effective
            }
            
            // Bonus for long trump suits - establish dominance
            if (suitLength >= 5) {
                score += 15; // Long trump suit should be led
            }
        } else if (!isTrump) {
            // Lead strong side suits to establish tricks before opponents can ruff
            if (suitHighCards >= 2 && suitLength >= 4) {
                score += 25; // Excellent side suit - establish it
            } else if (cardStrength >= 12) { // Aces
                score += 20; // High cards establish tricks
                
                // GUIDANCE: Use high card tracking to make better decisions
                const highCardInfo = this.getHighCardInformation(card.suit);
                if (highCardInfo && !highCardInfo.aceRemaining && card.rank === 'A') {
                    // This shouldn't happen, but defensive check
                    score += 5;
                } else if (highCardInfo && card.rank === 'K' && highCardInfo.aceRemaining) {
                    score -= 5; // King might lose to ace
                }
            } else if (cardStrength >= 11 && suitLength >= 3) { // Protected Kings
                // GUIDANCE: Check if ace is still out there
                const highCardInfo = this.getHighCardInformation(card.suit);
                if (highCardInfo && !highCardInfo.aceRemaining) {
                    score += 20; // King is now top card in suit
                } else {
                    score += 15; // Good protected high cards
                }
            }
            
            // Bonus for suits where we have sequence strength
            const hasSequence = this.hasSequenceInSuit(hand, card.suit);
            if (hasSequence) {
                score += 10; // Sequences are powerful for establishing suit
            }
        }
        
        return score;
    }
    
    // GUIDANCE: Play disruptively when defending against declarer
    evaluateDefensiveLeadStrategy(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const hand = this.hands[player];
        const suitLength = hand.filter(c => c.suit === card.suit).length;
        
        // ADVANCED: Trump control play - force short trump declarers to use trump early
        if (!isTrump) {
            const declarerTrumpLength = this.estimateDeclarerTrumpLength();
            
            // Lead suits where declarer might be weak
            const declarerHand = this.hands[this.trumpWinner];
            if (declarerHand) {
                const declarerSuitLength = declarerHand.filter(c => c.suit === card.suit).length;
                
                // If we suspect declarer is short in this suit, lead it to force trump usage
                if (declarerSuitLength <= 2) {
                    let forceScore = 20; // Base score for forcing declarer
                    
                    // STRATEGY: If declarer has short trump, be more aggressive
                    if (declarerTrumpLength <= 4) {
                        forceScore += 15; // Extra aggressive against short trump
                    }
                    
                    score += forceScore;
                }
            } else {
                // Use bidding patterns to guess declarer's weak suits
                const weakSuits = this.identifyDeclarerWeakSuits();
                if (weakSuits.includes(card.suit)) {
                    score += 15; // Lead their suspected weak suits
                }
            }
            
            // Lead through strength - if we have high cards in sequence
            if (cardStrength >= 11 && suitLength >= 3) {
                score += 15; // Lead through with protected honors
            }
            
            // Attack declarer's weak suits early
            if (cardStrength >= 10 && suitLength >= 4) {
                score += 12; // Establish our long suit before declarer takes control
            }
        } else {
            // Leading trump as defender
            if (cardStrength >= 12) {
                score += 10; // High trump leads can draw out declarer's trumps
            } else {
                score -= 10; // Don't waste low trumps when defending
            }
        }
        
        // GUIDANCE: Disruptive play - force declarer to lose control
        const tricksLeft = 13 - this.tricksPlayed;
        if (tricksLeft > 8) {
            // Early in the hand - be more aggressive in disruption
            score += 5;
        }
        
        // If declarer is under-bid, help make their job harder
        const declarerBid = this.phase2Bids[this.trumpWinner] || 0;
        const declarerTricks = this.tricksWon[this.trumpWinner] || 0;
        const declarerNeeds = declarerBid - declarerTricks;
        
        if (declarerNeeds > 0) {
            // Declarer needs tricks - be defensive
            if (!isTrump && cardStrength <= 9) {
                score += 8; // Lead low cards to avoid giving declarer easy tricks
            }
        } else {
            // Declarer doesn't need tricks - force them to take unwanted ones
            if (cardStrength >= 11) {
                score += 10; // Force declarer to win with high cards
            }
        }
        
        return score;
    }
    
    // Helper function to detect sequences in a suit
    hasSequenceInSuit(hand, suit) {
        const suitCards = hand.filter(c => c.suit === suit);
        const ranks = suitCards.map(c => this.getCardValue(c)).sort((a, b) => b - a);
        
        // Check for sequences of 2+ high cards
        for (let i = 0; i < ranks.length - 1; i++) {
            if (ranks[i] - ranks[i + 1] === 1 && ranks[i] >= 10) {
                return true; // Found a sequence with high cards
            }
        }
        return false;
    }
    
    // ADVANCED: Shape-based bidding - evaluate hand distribution
    evaluateHandShape(hand) {
        const suitCounts = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
        
        hand.forEach(card => {
            suitCounts[card.suit]++;
        });
        
        const lengths = Object.values(suitCounts).sort((a, b) => b - a);
        const pattern = lengths.join('-');
        
        return {
            suitCounts: suitCounts,
            distribution: lengths,
            pattern: pattern,
            longest: lengths[0],
            shortest: lengths[3],
            isBalanced: lengths[0] - lengths[3] <= 2,
            isUnbalanced: lengths[0] >= 6 || lengths[3] === 0,
            voids: lengths.filter(len => len === 0).length,
            singletons: lengths.filter(len => len === 1).length,
            doubletons: lengths.filter(len => len === 2).length
        };
    }
    
    // ADVANCED: Calculate shape bonus for trump potential
    calculateShapeBonus(suit, handShape) {
        const suitLength = handShape.suitCounts[suit];
        let bonus = 0;
        
        // STRATEGY: 6-3-2-2 distribution with strong 6-card suit is powerful
        if (suitLength >= 6) {
            if (handShape.pattern.includes('6-3') || handShape.pattern.includes('6-2')) {
                bonus += 2.5; // Excellent shape for trump
            } else {
                bonus += 2.0; // Good long suit
            }
        } else if (suitLength >= 5) {
            if (handShape.singletons >= 1 || handShape.doubletons >= 2) {
                bonus += 1.8; // Good distribution for trump
            } else {
                bonus += 1.2; // Decent length
            }
        }
        
        // Bonus for unbalanced hands with this as the long suit
        if (handShape.isUnbalanced && suitLength === handShape.longest) {
            bonus += 1.0; // Unbalanced favors trump contracts
        }
        
        // Penalty for balanced hands unless NT
        if (handShape.isBalanced && suitLength < 5) {
            bonus -= 0.5; // Balanced hands better for NT
        }
        
        return bonus;
    }
    
    // ADVANCED: Trump bluffing - bid lower suit to bait opponents into overbidding
    considerTrumpBluff(player, currentBidValue, currentSuit, handStrength) {
        const suits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];
        const currentSuitRank = suits.indexOf(currentSuit);
        const hand = this.hands[player];
        
        // Only consider bluffing if we have a reasonable but not exceptional hand
        if (handStrength.score < 15 || handStrength.score > 25) {
            return null; // Too weak or too strong for bluffing
        }
        
        // Don't bluff if the current bid is already high
        if (currentBidValue >= 7) {
            return null;
        }
        
        // STRATEGY: Bid lower suit (e.g., 6♦) to bait opponents into 6♥ or 6♠
        // Look for a suit lower than current that we have some support in
        for (let suitRank = 0; suitRank < currentSuitRank; suitRank++) {
            const bluffSuit = suits[suitRank];
            const bluffAssessment = this.assessTrumpPotential(hand, bluffSuit);
            
            // Need some minimum support to make the bluff credible
            if (bluffAssessment.totalScore >= 2.0) {
                // Check if opponents are likely to have higher suits
                const remainingPlayers = this.players.filter(p => 
                    p !== player && !this.playersPassed[p] && !this.phase1Bids[p]
                ).length;
                
                // Only bluff if there are players left who might take the bait
                if (remainingPlayers >= 1) {
                    const bluffBid = {
                        minTakes: currentBidValue,
                        trumpSuit: bluffSuit,
                        isBluff: true // Mark for strategy tracking
                    };
                    
                    // 30% chance of attempting bluff (don't be too predictable)
                    if (Math.random() < 0.3) {
                        return bluffBid;
                    }
                }
            }
        }
        
        return null; // No suitable bluff opportunity
    }

    // GUIDANCE: Save trump cards for strategic moments
    evaluateStrategicTrumpUsage(card, player, context) {
        const hand = this.hands[player];
        const cardStrength = this.getCardValue(card);
        const trumpCount = hand.filter(c => c.suit === this.trumpSuit).length;
        const tricksLeft = 13 - this.tricksPlayed;
        const canWinTrick = this.canCardWinTrick(card, context.currentTrick);
        
        let score = 0;
        
        // ADVANCED: Timing your trump - hold back until opponents play off-suit
        const opponentsOffSuit = this.checkOpponentsPlayedOffSuit(context);
        if (!opponentsOffSuit && tricksLeft > 6) {
            score -= 25; // Strong penalty for early trump use
        } else if (tricksLeft > 8 && cardStrength < 10) {
            score -= 20; // Save low trumps for later rounds
        } else if (tricksLeft > 5 && cardStrength < 12) {
            score -= 10; // Be conservative with medium trumps
        }
        
        // Strategic trump usage - when it's good to trump
        if (canWinTrick) {
            // Trump to win is good if:
            if (context.isUnderBid && context.urgencyLevel > 0.6) {
                score += 25; // Desperate for tricks
            } else if (context.isUnderBid && cardStrength <= 9) {
                score += 15; // Win with low trump when under-bid
            } else if (context.isExactBid && tricksLeft <= 4) {
                score -= 15; // Avoid winning when exact bid near end
            }
        } else {
            // Trump when can't win - generally bad unless getting rid of high trump
            if (cardStrength >= 12) {
                score += 5; // High trump discard can be good
            } else {
                score -= 15; // Don't waste trump unnecessarily
            }
        }
        
        // GUIDANCE: Trump wisely - don't use unless sure to win or strategic need
        const highestTrumpInTrick = this.getHighestTrumpInTrick(context.currentTrick);
        if (highestTrumpInTrick && cardStrength <= this.getCardValue(highestTrumpInTrick)) {
            score -= 25; // Don't trump if we can't win the trump battle
        }
        
        // Keep trump for later control if we have good trump holding
        if (trumpCount >= 4 && tricksLeft > 6) {
            score -= 10; // Preserve trump strength for later
        }
        
        return score;
    }
    
    // Helper to find highest trump card in current trick
    getHighestTrumpInTrick(currentTrick) {
        if (!currentTrick || currentTrick.length === 0) return null;
        
        let highestTrump = null;
        currentTrick.forEach(play => {
            if (play.card.suit === this.trumpSuit) {
                if (!highestTrump || this.getCardValue(play.card) > this.getCardValue(highestTrump)) {
                    highestTrump = play.card;
                }
            }
        });
        
        return highestTrump;
    }
    
    // ADVANCED: Check if opponents have been forced to play off-suit
    checkOpponentsPlayedOffSuit(context) {
        if (!context.currentTrick || context.currentTrick.length === 0) {
            return false; // No trick in progress
        }
        
        const leadSuit = context.currentTrick[0].card.suit;
        
        // Check if any opponent in this trick couldn't follow suit
        for (let i = 1; i < context.currentTrick.length; i++) {
            const play = context.currentTrick[i];
            if (play.card.suit !== leadSuit && play.card.suit !== this.trumpSuit) {
                return true; // Opponent discarded (couldn't follow suit or trump)
            }
        }
        
        // Also check historical data - have we seen opponents void in suits recently?
        const recentVoids = this.countRecentSuitVoids();
        return recentVoids > 0;
    }
    
    // Helper to count recent void discoveries
    countRecentSuitVoids() {
        let voidCount = 0;
        const recentTricks = Math.max(0, this.tricksPlayed - 3); // Look at last 3 tricks
        
        this.players.forEach(player => {
            Object.keys(this.botMemory.suitVoids[player]).forEach(suit => {
                if (this.botMemory.suitVoids[player][suit]) {
                    voidCount++;
                }
            });
        });
        
        return voidCount;
    }
    
    // ADVANCED: Estimate declarer's trump length based on bidding
    estimateDeclarerTrumpLength() {
        const declarerBid = this.phase1Bids[this.trumpWinner];
        if (!declarerBid) return 5; // Default estimate
        
        const declarerHand = this.hands[this.trumpWinner];
        if (declarerHand) {
            // If we can see declarer's hand, count actual trumps
            return declarerHand.filter(card => card.suit === this.trumpSuit).length;
        }
        
        // Estimate based on bidding aggressiveness
        const minTakes = declarerBid.minTakes;
        if (minTakes >= 8) {
            return 6; // High bid suggests long trump
        } else if (minTakes >= 6) {
            return 5; // Medium bid suggests decent trump
        } else {
            return 4; // Low bid might be short trump
        }
    }
    
    // ADVANCED: Identify declarer's likely weak suits based on bidding patterns
    identifyDeclarerWeakSuits() {
        const declarerBid = this.phase1Bids[this.trumpWinner];
        if (!declarerBid) return [];
        
        const trumpSuit = declarerBid.trumpSuit;
        const weakSuits = [];
        
        // If declarer bid a specific trump, they're likely weak in other suits
        // Especially if they bid aggressively (suggesting unbalanced hand)
        if (declarerBid.minTakes >= 6) {
            ['clubs', 'diamonds', 'hearts', 'spades'].forEach(suit => {
                if (suit !== trumpSuit) {
                    // Probability they're weak in this suit
                    if (Math.random() < 0.4) { // 40% chance per suit
                        weakSuits.push(suit);
                    }
                }
            });
        }
        
        return weakSuits;
    }
    
    // ADVANCED: Bid sum awareness - predict desperation plays
    analyzeBidSumSituation(currentTotal, playersRemaining) {
        const analysis = {
            isUnderSituation: currentTotal < 10, // Likely to go under 13
            isOverSituation: currentTotal > 15,  // Likely to go over 13
            desperationLevel: 0,
            predictedFinalTotal: currentTotal + (playersRemaining * 2.5), // Rough estimate
            strategy: 'normal'
        };
        
        // STRATEGY: If sum is under 13, someone will be forced to take extra tricks
        if (analysis.isUnderSituation) {
            analysis.desperationLevel = (13 - currentTotal) / playersRemaining;
            analysis.strategy = 'expect_under_bids'; // Players will bid conservatively
        }
        
        // STRATEGY: If sum is over 13, someone will fail their bid
        if (analysis.isOverSituation) {
            analysis.desperationLevel = (currentTotal - 13) / playersRemaining;
            analysis.strategy = 'expect_over_bids'; // Players will struggle to make bids
        }
        
        // Special case: exactly on track for 13
        if (currentTotal >= 10 && currentTotal <= 12 && playersRemaining <= 2) {
            analysis.strategy = 'avoid_thirteen'; // Critical to avoid exactly 13
        }
        
        return analysis;
    }
    
    // ADVANCED: Adjust bidding based on bid sum awareness
    adjustBidForSumAwareness(originalEstimate, bidSumAnalysis, playersRemaining) {
        let adjustedBid = originalEstimate;
        
        // STRATEGY: React to expected desperation plays
        switch (bidSumAnalysis.strategy) {
            case 'expect_under_bids':
                // Others will bid low, we might need to bid higher
                adjustedBid += 0.3;
                break;
                
            case 'expect_over_bids':
                // Others will struggle, we can bid more conservatively
                adjustedBid -= 0.2;
                break;
                
            case 'avoid_thirteen':
                // Critical to avoid exactly 13 total - adjust if needed
                // This will be handled in the final bid selection
                break;
                
            default:
                // Normal bidding
                break;
        }
        
        // Additional adjustment based on desperation level
        if (bidSumAnalysis.desperationLevel > 2) {
            // High desperation - others will make unusual plays
            adjustedBid += 0.2; // Bid slightly higher to compensate
        }
        
        return Math.max(0, adjustedBid);
    }
    
    // ADVANCED: Calculate zero bid disruption value
    calculateZeroBidDisruption(card, player, zeroBidder, analysis, context) {
        let disruptionScore = 0;
        const cardStrength = this.getCardValue(card);
        
        // STRATEGY: Lead suits they're likely to hold (based on bidding silence)
        const zeroBidderHand = this.hands[zeroBidder];
        if (zeroBidderHand) {
            const zeroBidderSuitLength = zeroBidderHand.filter(c => c.suit === card.suit).length;
            
            // If zero bidder has cards in this suit, good for disruption
            if (zeroBidderSuitLength > 0) {
                disruptionScore += 10;
                
                // If they have many cards in this suit, even better
                if (zeroBidderSuitLength >= 4) {
                    disruptionScore += 15; // They likely have to follow suit
                }
            }
        } else {
            // Estimate based on bidding patterns - zero bidders often have balanced hands
            // Lead middle-strength cards in non-trump suits
            if (card.suit !== this.trumpSuit && cardStrength >= 8 && cardStrength <= 11) {
                disruptionScore += 12; // Good disruption potential
            }
        }
        
        // STRATEGY: Force them to win tricks by leading cards they can't avoid
        const tricksLeft = 13 - this.tricksPlayed;
        if (tricksLeft <= 6) {
            // Late in hand - more pressure on zero bidder
            disruptionScore += 8;
        }
        
        // If we're in a trick where zero bidder must play
        if (context.currentTrick && this.isPlayerInCurrentTrick(zeroBidder)) {
            // Lead low cards to force them to win
            if (cardStrength <= 7) {
                disruptionScore += 20; // Force them to take the trick
            }
        }
        
        return disruptionScore;
    }
    
    // ADVANCED: Predictive defense - watch bidding patterns and respond accordingly
    evaluatePredictiveDefense(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        
        // STRATEGY: If someone bid 7♠ confidently, they likely have long spades
        const declarerBid = this.phase1Bids[this.trumpWinner];
        if (declarerBid) {
            const declarerSuit = declarerBid.trumpSuit;
            const declarerMinTakes = declarerBid.minTakes;
            
            // High bid suggests long trump suit - attack their weak suits
            if (declarerMinTakes >= 7) {
                if (card.suit !== declarerSuit && !isTrump) {
                    score += 15; // Lead non-trump suits to force them to trump
                }
            }
            
            // Aggressive bid suggests unbalanced hand - exploit weaknesses
            if (declarerMinTakes >= 6 && card.suit !== declarerSuit) {
                score += 10; // Attack their likely short suits
            }
        }
        
        // STRATEGY: Watch other players' Phase 2 bid patterns
        this.players.forEach(opponent => {
            if (opponent !== player) {
                const opponentBid = this.phase2Bids[opponent];
                const opponentTricks = this.tricksWon[opponent] || 0;
                
                if (opponentBid !== null) {
                    // High bidder under pressure - might make desperate plays
                    if (opponentBid >= 4 && opponentTricks < opponentBid) {
                        const desperation = (opponentBid - opponentTricks) / (13 - this.tricksPlayed);
                        if (desperation > 0.7) {
                            // Opponent is desperate - adjust our strategy
                            if (cardStrength >= 10) {
                                score -= 5; // They might trump our high cards
                            } else {
                                score += 8; // Low cards are safer against desperate players
                            }
                        }
                    }
                    
                    // Conservative bidders (0-2) - predict their defensive play
                    if (opponentBid <= 2) {
                        if (cardStrength >= 11) {
                            score += 5; // High cards work well against conservative players
                        }
                    }
                }
            }
        });
        
        // STRATEGY: Based on bidding confidence, predict suit holdings
        const totalBids = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
        if (totalBids < 11) {
            // Under-bid situation - everyone will be conservative
            if (cardStrength >= 12) {
                score += 8; // High cards more likely to hold up
            }
        } else if (totalBids > 15) {
            // Over-bid situation - someone will fail
            if (cardStrength <= 8) {
                score += 6; // Low cards avoid unwanted tricks
            }
        }
        
        return score;
    }
    
    // ADVANCED: Endgame planning - think ahead to last 3-4 tricks
    evaluateEndgamePlanning(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const tricksLeft = 13 - this.tricksPlayed;
        const hand = this.hands[player];
        
        // STRATEGY: Track suit exhaustion for squeeze plays
        const suitExhaustion = this.analyzeSuitExhaustion();
        
        // STRATEGY: Engineer squeeze - force opponents to discard winning cards
        if (tricksLeft <= 3 && suitExhaustion.totalVoids >= 2) {
            // Multiple suits are exhausted - squeeze potential
            if (this.canCreateSqueeze(card, player, suitExhaustion)) {
                score += 25; // High value for squeeze opportunity
            }
        }
        
        // Count remaining high cards by suit
        const remainingHighCards = this.countRemainingHighCards();
        
        // If we have the last high card in a suit, it's very valuable
        Object.keys(remainingHighCards).forEach(suit => {
            if (card.suit === suit && remainingHighCards[suit].length === 1 && 
                remainingHighCards[suit][0] === card.rank) {
                score += 20; // Last high card in suit is guaranteed winner
            }
        });
        
        // Endgame trump management
        if (isTrump && tricksLeft <= 3) {
            const trumpsRemaining = hand.filter(c => c.suit === this.trumpSuit).length;
            const otherPlayersHaveTrump = this.estimateOpponentTrumps() > 0;
            
            if (!otherPlayersHaveTrump && trumpsRemaining > 0) {
                score += 30; // We control remaining trumps - very powerful
            } else if (cardStrength >= 12 && trumpsRemaining === 1) {
                score += 15; // Last high trump is valuable
            }
        }
        
        // Exact bid pressure in endgame
        const playerBid = this.phase2Bids[player] || 0;
        const tricksTaken = this.tricksWon[player] || 0;
        const tricksNeeded = playerBid - tricksTaken;
        
        if (tricksNeeded === 0 && tricksLeft <= 2) {
            // Must avoid all remaining tricks
            if (cardStrength <= 7) {
                score += 15; // Low cards help avoid tricks
            } else {
                score -= 10; // High cards are dangerous
            }
        } else if (tricksNeeded === tricksLeft) {
            // Must win all remaining tricks
            if (cardStrength >= 11) {
                score += 20; // High cards essential
            }
        }
        
        return score;
    }
    
    // Helper: Analyze which suits are exhausted
    analyzeSuitExhaustion() {
        const exhaustion = {
            voidPlayers: { clubs: [], diamonds: [], hearts: [], spades: [] },
            totalVoids: 0,
            exhaustedSuits: []
        };
        
        ['clubs', 'diamonds', 'hearts', 'spades'].forEach(suit => {
            this.players.forEach(player => {
                if (this.botMemory && this.botMemory.suitVoids && 
                    this.botMemory.suitVoids[player] && this.botMemory.suitVoids[player][suit]) {
                    exhaustion.voidPlayers[suit].push(player);
                    exhaustion.totalVoids++;
                }
            });
            
            // If 3+ players are void, suit is mostly exhausted
            if (exhaustion.voidPlayers[suit].length >= 3) {
                exhaustion.exhaustedSuits.push(suit);
            }
        });
        
        return exhaustion;
    }
    
    // Helper: Check if we can create a squeeze play
    canCreateSqueeze(card, player, suitExhaustion) {
        // Safety check
        if (!suitExhaustion || !suitExhaustion.voidPlayers || !suitExhaustion.exhaustedSuits) {
            return false;
        }
        
        // Simple squeeze detection - if we can force discards in multiple suits
        const nonVoidSuits = ['clubs', 'diamonds', 'hearts', 'spades'].filter(suit => 
            suitExhaustion.voidPlayers[suit] && !suitExhaustion.voidPlayers[suit].includes(player)
        );
        
        // If we have cards in multiple non-void suits and opponents are squeezed
        return nonVoidSuits.length >= 2 && suitExhaustion.exhaustedSuits.length >= 1;
    }
    
    // Helper: Count remaining high cards by suit
    countRemainingHighCards() {
        const remaining = { clubs: [], diamonds: [], hearts: [], spades: [] };
        
        if (this.botMemory && this.botMemory.highCardsPlayed) {
            ['clubs', 'diamonds', 'hearts', 'spades'].forEach(suit => {
                ['A', 'K', 'Q', 'J'].forEach(rank => {
                    const rankKey = rank.toLowerCase() + 's';
                    const rankArray = this.botMemory.highCardsPlayed[rankKey];
                    
                    let wasPlayed = false;
                    if (rankArray && Array.isArray(rankArray)) {
                        wasPlayed = rankArray.some(cardInfo => cardInfo && cardInfo.suit === suit);
                    }
                    
                    if (!wasPlayed) {
                        remaining[suit].push(rank);
                    }
                });
            });
        } else {
            // Default: assume all high cards are still in play
            ['clubs', 'diamonds', 'hearts', 'spades'].forEach(suit => {
                remaining[suit] = ['A', 'K', 'Q', 'J'];
            });
        }
        
        return remaining;
    }
    
    // Helper: Estimate how many trumps opponents still have
    estimateOpponentTrumps() {
        let estimate = 0;
        if (!this.botMemory || !this.botMemory.trumpsPlayed || !this.botMemory.cardsPlayed) {
            return 2; // Default estimate
        }
        
        this.players.forEach(player => {
            if (player !== this.currentPlayerName) {
                const trumpsPlayed = this.botMemory.trumpsPlayed
                    .filter(t => t && t.player === player).length;
                const cardsPlayedByPlayer = this.botMemory.cardsPlayed[player] || [];
                const handSize = 13 - cardsPlayedByPlayer.length;
                
                // Simple estimation based on remaining hand size
                estimate += Math.max(0, (handSize / 4) - trumpsPlayed);
            }
        });
        
        return estimate;
    }
    
    // ADVANCED: Suit exhaustion awareness - strategic use of dead suits
    evaluateSuitExhaustionStrategy(card, player, context) {
        let score = 0;
        const cardSuit = card.suit;
        const cardStrength = this.getCardValue(card);
        
        // STRATEGY: If three players have shown void in a suit, it's dead
        const voidCount = this.countOpponentVoidsInSuit(cardSuit);
        
        if (voidCount >= 3) {
            // Suit is effectively dead - only one other player can follow
            if (context.isLeading) {
                score += 30; // Very safe to lead dead suits
                
                // If we have high cards in dead suit, they're guaranteed winners
                if (cardStrength >= 11) {
                    score += 20; // High cards in dead suits are gold
                }
            } else {
                // Following in dead suit - can discard safely
                if (cardStrength <= 8) {
                    score += 15; // Low cards perfect for dead suit discards
                }
            }
        } else if (voidCount === 2) {
            // Suit is becoming exhausted - good strategic value
            if (context.isLeading) {
                score += 15; // Pretty safe to lead
                
                // Force the last player with this suit to play high
                if (cardStrength >= 9) {
                    score += 10; // Medium-high cards can force good discards
                }
            }
        }
        
        // STRATEGY: Use suit exhaustion to force discards
        const opponentsWithSuit = 4 - voidCount - 1; // Minus self
        if (opponentsWithSuit <= 1 && context.isLeading) {
            // Only one opponent left with this suit - force them to play it
            score += this.evaluateForceDiscardOpportunity(card, player, cardSuit);
        }
        
        // Check if we're void in the lead suit but others aren't
        if (!context.isLeading && context.leadSuit !== cardSuit) {
            const leadSuitVoids = this.countOpponentVoidsInSuit(context.leadSuit);
            if (leadSuitVoids <= 1) {
                // We're void but others must follow - good discard opportunity
                if (this.isPlayerVoidInSuit(player, context.leadSuit)) {
                    score += this.evaluateDiscardOpportunity(card, player, context);
                }
            }
        }
        
        return score;
    }
    
    // Helper: Evaluate opportunity to force specific discard
    evaluateForceDiscardOpportunity(card, player, suit) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        
        // Find who still has cards in this suit
        let targetPlayer = null;
        this.players.forEach(p => {
            if (p !== player && !this.isPlayerVoidInSuit(p, suit)) {
                targetPlayer = p;
            }
        });
        
        if (targetPlayer) {
            const targetBid = this.phase2Bids[targetPlayer] || 0;
            const targetTricks = this.tricksWon[targetPlayer] || 0;
            
            // If target is over/under their bid, force them to make tough choices
            if (targetTricks > targetBid) {
                // They're over - force them to play low
                if (cardStrength >= 10) {
                    score += 15; // High card forces them to waste a high card or lose
                }
            } else if (targetTricks < targetBid) {
                // They're under - they need tricks
                if (cardStrength <= 9) {
                    score += 12; // Low card might give them an unwanted trick
                }
            }
        }
        
        return score;
    }
    
    // Helper: Evaluate discard opportunity when void in lead suit
    evaluateDiscardOpportunity(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        
        if (isTrump) {
            // Discarding trump when void - be strategic
            const trumpCount = this.hands[player].filter(c => c.suit === this.trumpSuit).length;
            if (trumpCount > 2 && cardStrength <= 8) {
                score += 10; // Safe to discard low trump when we have many
            } else if (cardStrength >= 12) {
                score -= 15; // Don't waste high trump on discards
            }
        } else {
            // Discarding non-trump when void
            if (cardStrength <= 7) {
                score += 20; // Perfect discard opportunity
            } else if (cardStrength >= 11) {
                // Check if this might be the last high card in suit
                const remainingHigh = this.countRemainingHighCardsInSuit(card.suit);
                if (remainingHigh <= 2) {
                    score -= 10; // Don't waste potentially winning high cards
                } else {
                    score += 5; // OK to discard if plenty of high cards remain
                }
            }
        }
        
        return score;
    }
    
    // Helper: Check if specific player is void in suit
    isPlayerVoidInSuit(player, suit) {
        return this.botMemory && this.botMemory.suitVoids && 
               this.botMemory.suitVoids[player] && this.botMemory.suitVoids[player][suit];
    }
    
    // Helper: Count remaining high cards in specific suit
    countRemainingHighCardsInSuit(suit) {
        let count = 0;
        if (this.botMemory && this.botMemory.highCardsPlayed) {
            ['A', 'K', 'Q', 'J'].forEach(rank => {
                const rankKey = rank.toLowerCase() + 's';
                const rankArray = this.botMemory.highCardsPlayed[rankKey];
                
                let wasPlayed = false;
                if (rankArray && Array.isArray(rankArray)) {
                    wasPlayed = rankArray.some(cardInfo => cardInfo && cardInfo.suit === suit);
                }
                
                if (!wasPlayed) {
                    count++;
                }
            });
        } else {
            count = 4; // Default if tracking not available
        }
        return count;
    }
    
    // ADVANCED: Player behavior profiling - use learned patterns to predict moves
    evaluatePlayerBehaviorProfiling(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        
        // Profile opponents and adjust strategy accordingly
        this.players.forEach(opponent => {
            if (opponent !== player) {
                const profile = this.botMemory.behaviorProfiles[opponent];
                const pattern = this.analyzePlayerPattern(opponent, profile);
                
                score += this.adjustStrategyForOpponent(card, player, opponent, pattern, context);
            }
        });
        
        return score;
    }
    
    // ADVANCED: Analyze player patterns based on historical data
    analyzePlayerPattern(player, profile) {
        const analysis = {
            biddingTendency: 'unknown', // 'overbid', 'underbid', 'accurate'
            suitPreference: 'unknown',  // 'long_suits', 'balanced', 'trump_heavy'
            riskProfile: 'unknown',     // 'aggressive', 'conservative', 'adaptive'
            confidence: profile.confidence || 0
        };
        
        // Analyze Phase 1 bidding patterns
        if (profile.phase1History.length >= 3) {
            const phase1Patterns = this.analyzePhase1Patterns(profile.phase1History);
            analysis.biddingTendency = phase1Patterns.tendency;
            analysis.suitPreference = phase1Patterns.suitPreference;
            analysis.confidence = Math.min(1.0, profile.phase1History.length / 10);
        }
        
        // Analyze Phase 2 bidding accuracy
        if (profile.phase2History.length >= 3) {
            const phase2Patterns = this.analyzePhase2Patterns(profile.phase2History);
            analysis.riskProfile = phase2Patterns.riskProfile;
        }
        
        return analysis;
    }
    
    // Helper: Analyze Phase 1 bidding patterns
    analyzePhase1Patterns(history) {
        let longSuitBids = 0;
        let aggressiveBids = 0;
        const suitCounts = { clubs: 0, diamonds: 0, hearts: 0, spades: 0, notrump: 0 };
        
        history.forEach(bid => {
            if (bid.minTakes >= 7) aggressiveBids++;
            if (bid.handLength >= 6) longSuitBids++;
            suitCounts[bid.trumpSuit]++;
        });
        
        const tendency = aggressiveBids / history.length > 0.6 ? 'overbid' : 
                        aggressiveBids / history.length < 0.3 ? 'underbid' : 'accurate';
        
        const suitPreference = longSuitBids / history.length > 0.7 ? 'long_suits' : 'balanced';
        
        return { tendency, suitPreference };
    }
    
    // Helper: Analyze Phase 2 bidding accuracy
    analyzePhase2Patterns(history) {
        let accurateCount = 0;
        let conservativeCount = 0;
        
        history.forEach(result => {
            const accuracy = Math.abs(result.bid - result.actualTricks);
            if (accuracy <= 1) accurateCount++;
            if (result.bid < result.actualTricks) conservativeCount++;
        });
        
        const riskProfile = conservativeCount / history.length > 0.6 ? 'conservative' :
                           accurateCount / history.length > 0.7 ? 'adaptive' : 'aggressive';
        
        return { riskProfile };
    }
    
    // ADVANCED: Adjust strategy based on opponent patterns
    adjustStrategyForOpponent(card, player, opponent, pattern, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        
        if (pattern.confidence < 0.3) return 0; // Not enough data
        
        // STRATEGY: Some overbid with long suits, others underbid with balanced hands
        if (pattern.biddingTendency === 'overbid' && pattern.suitPreference === 'long_suits') {
            // Opponent likely overbids with long suits - they may be trump heavy
            if (card.suit !== this.trumpSuit && cardStrength >= 9) {
                score += 8; // Force them to trump with side suits
            }
        } else if (pattern.biddingTendency === 'underbid' && pattern.suitPreference === 'balanced') {
            // Opponent underbids balanced hands - they may have hidden strength
            if (cardStrength <= 8) {
                score += 6; // Low cards might be safer against hidden strength
            }
        }
        
        // Risk profile adjustments
        if (pattern.riskProfile === 'aggressive') {
            // Aggressive players take risks - be more defensive
            if (cardStrength >= 11) {
                score -= 3; // High cards might be trumped aggressively
            }
        } else if (pattern.riskProfile === 'conservative') {
            // Conservative players avoid risks - high cards more likely to hold
            if (cardStrength >= 11) {
                score += 5; // High cards safer against conservative players
            }
        }
        
        // Current bid situation awareness
        const opponentBid = this.phase2Bids[opponent] || 0;
        const opponentTricks = this.tricksWon[opponent] || 0;
        
        if (pattern.biddingTendency === 'overbid' && opponentTricks < opponentBid) {
            // Overbidding player is under - they'll be desperate
            if (cardStrength <= 7) {
                score += 10; // Low cards might give them unwanted tricks
            }
        }
        
        return score * pattern.confidence; // Scale by confidence in pattern
    }
    

    
    
    // ADVANCED: Update behavior profiles when bids are made
    updateBehaviorProfile(player, phase, bidData) {
        if (!this.botMemory || !this.botMemory.behaviorProfiles || !this.botMemory.behaviorProfiles[player]) {
            return; // Safety check
        }
        
        const profile = this.botMemory.behaviorProfiles[player];
        
        if (phase === 'phase1') {
            profile.phase1History.push({
                minTakes: bidData.minTakes,
                trumpSuit: bidData.trumpSuit,
                handLength: bidData.handLength || 0,
                confidence: bidData.confidence || 0.5
            });
            
            // Keep only last 20 entries
            if (profile.phase1History.length > 20) {
                profile.phase1History.shift();
            }
        } else if (phase === 'phase2') {
            profile.phase2History.push({
                bid: bidData.bid,
                actualTricks: bidData.actualTricks || 0,
                handStrength: bidData.handStrength || 0
            });
            
            // Keep only last 20 entries
            if (profile.phase2History.length > 20) {
                profile.phase2History.shift();
            }
        }
        
        // Update confidence based on amount of data
        profile.confidence = Math.min(1.0, 
            (profile.phase1History.length + profile.phase2History.length) / 20
        );
    }

    // Helper function to count how many opponents are void in a suit
    countOpponentVoidsInSuit(suit) {
        let voidCount = 0;
        this.players.forEach(player => {
            if (this.botMemory.suitVoids[player] && this.botMemory.suitVoids[player][suit]) {
                voidCount++;
            }
        });
        return voidCount;
    }

    // Helper function to compare two cards
    // Returns > 0 if card1 beats card2, < 0 if card2 beats card1, 0 if equal
    compareCards(card1, card2, leadSuit) {
        // Trump beats everything except higher trump
        if (this.trumpSuit !== 'notrump') {
            // If card1 is trump and card2 is not trump
            if (card1.suit === this.trumpSuit && card2.suit !== this.trumpSuit) {
                return 1;
            }
            // If card2 is trump and card1 is not trump
            if (card2.suit === this.trumpSuit && card1.suit !== this.trumpSuit) {
                return -1;
            }
            // If both are trump, higher trump wins
            if (card1.suit === this.trumpSuit && card2.suit === this.trumpSuit) {
                return this.getCardValue(card1) - this.getCardValue(card2);
            }
        }
        
        // Neither is trump or no trump game
        // Only cards of the lead suit can win
        if (card1.suit === leadSuit && card2.suit !== leadSuit) {
            return 1;
        }
        if (card2.suit === leadSuit && card1.suit !== leadSuit) {
            return -1;
        }
        if (card1.suit === leadSuit && card2.suit === leadSuit) {
            return this.getCardValue(card1) - this.getCardValue(card2);
        }
        
        // Neither follows suit, they're equal
        return 0;
    }

    // Helper function to get current trick winner
    getCurrentTrickWinner(trick) {
        if (!trick || trick.length === 0) return null;
        
        let winner = trick[0];
        const leadSuit = trick[0].card.suit;
        
        for (let i = 1; i < trick.length; i++) {
            const play = trick[i];
            if (this.compareCards(play.card, winner.card, leadSuit) > 0) {
                winner = play;
            }
        }
        
        return winner;
    }

    // Helper function to assess trick value
    assessTrickValue(trick) {
        if (!trick || trick.length === 0) return 0;
        
        let value = 0;
        trick.forEach(play => {
            value += this.getCardValue(play.card) * 0.5;
            if (play.card.suit === this.trumpSuit) value += 5;
        });
        
        return value;
    }
    
    evaluateUnderBidLeadStrategy(card, player, context) {
        let score = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const hand = this.hands[player];
        const suitLength = hand.filter(c => c.suit === card.suit).length;
        const trumpCount = hand.filter(c => c.suit === this.trumpSuit).length;
        const tricksLeft = 13 - this.tricksPlayed;
        
        // IMPROVED TRUMP MANAGEMENT
        if (isTrump) {
            // Don't waste trump early unless necessary
            if (tricksLeft > 8 && trumpCount >= 3 && cardStrength < 11) {
                score -= 15; // Conserve low trumps for later
            } else if (cardStrength >= 12) {
                score += 20; // High trump leads are strong
                // But prefer to save trump for later control unless desperate
                if (context.urgencyLevel < 0.6 && tricksLeft > 5) {
                    score -= 10; // Save for endgame control
                }
            } else {
                score += 8; // Medium trump leads
            }
        }
        
        // SUIT ESTABLISHMENT STRATEGY
        if (!isTrump) {
            // Look for suits where we can establish length
            const opponentVoids = this.countOpponentVoidsInSuit(card.suit);
            
            if (cardStrength >= 12) { // Aces and Kings
                if (suitLength >= 4) {
                    score += 25; // Excellent suit establishment opportunity
                } else if (suitLength >= 3) {
                    score += 15; // Good suit establishment
                } else {
                    score += 8; // Still good to lead high cards
                }
                
                // Bonus if opponents are already void (we'll win for sure)
                if (opponentVoids > 0) {
                    score += opponentVoids * 10;
                }
            } else if (cardStrength >= 10) { // Queens and Jacks
                if (suitLength >= 4) {
                    score += 15;
                } else if (suitLength >= 3) {
                    score += 8;
                } else {
                    score += 3;
                }
            }
        }
        
        // ENDGAME CONSIDERATIONS
        if (tricksLeft <= 5) {
            // In endgame, be more aggressive with high cards
            if (cardStrength >= 12) score += 10;
            if (isTrump && cardStrength >= 10) score += 15;
        }
        
        // DESPERATION MODE
        if (context.urgencyLevel > 0.8) {
            // When desperate, prioritize any potential winners
            if (cardStrength >= 10) score += 20;
            if (isTrump) score += 25;
        }
        
        // Avoid weak leads unless desperate
        if (cardStrength <= 6 && context.urgencyLevel < 0.7) {
            score -= 12;
        }
        
        // SUIT SEQUENCE ANALYSIS - look for building runs
        const suitCards = hand.filter(c => c.suit === card.suit).sort((a, b) => this.getCardValue(b) - this.getCardValue(a));
        if (suitCards.length >= 3) {
            // Check if we have a good sequence to establish
            let sequenceBonus = 0;
            for (let i = 0; i < suitCards.length - 1; i++) {
                if (this.getCardValue(suitCards[i]) - this.getCardValue(suitCards[i + 1]) <= 2) {
                    sequenceBonus += 3; // Good sequence
                }
            }
            score += sequenceBonus;
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
        
        // GUIDANCE: Save trump cards for strategic moments
        if (isTrump) {
            score += this.evaluateStrategicTrumpUsage(card, player, context);
        }
        
        // ADVANCED: Suit exhaustion awareness - use dead suits strategically
        score += this.evaluateSuitExhaustionStrategy(card, player, context);
        
        // ADVANCED: Endgame planning - think ahead to last 3-4 tricks
        const tricksLeft = 13 - this.tricksPlayed;
        if (tricksLeft <= 4) {
            score += this.evaluateEndgamePlanning(card, player, context);
        }
        
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
        
        // Apply zero-bid targeting strategy (works for all bid types)
        const zeroBidScore = this.evaluateZeroBidTargeting(card, player, context);
        
        // If there's a strong zero-bid opportunity, prioritize it over normal strategy
        if (zeroBidScore > 100) {
            // Zero-bid targeting overrides normal strategy
            score = zeroBidScore;
            // Zero-bid follow strategy override applied silently
        } else {
            score += zeroBidScore;
        }
        
        // Apply urgency multiplier
        score *= (1 + context.urgencyLevel * 0.3);
        
        return score;
    }
    
    evaluateUnderBidFollowStrategy(card, player, context, canWinTrick, isLeadSuit, isTrump, cardStrength) {
        let score = 0;
        const hand = this.hands[player];
        const trumpCount = hand.filter(c => c.suit === this.trumpSuit).length;
        const tricksLeft = 13 - this.tricksPlayed;
        
            if (canWinTrick) {
            // Excellent - we can win this trick
            score += 25;
            
            // IMPROVED CARD SELECTION for winning
            if (isLeadSuit) {
                score += (20 - cardStrength); // Win cheaply in suit
                
                // But if this is a high card in a long suit, consider saving it
                const suitLength = hand.filter(c => c.suit === card.suit).length;
                if (cardStrength >= 12 && suitLength >= 3 && tricksLeft > 5) {
                    score -= 8; // Save high cards in long suits for leading later
                }
            } else if (isTrump) {
                score += 20; // Trump wins are good
                
                // MUCH BETTER TRUMP MANAGEMENT
                if (cardStrength <= 8) {
                    score += 15; // Low trump wins are excellent
                } else if (cardStrength >= 12) {
                    // High trump - be more careful
                    if (trumpCount <= 2 || tricksLeft <= 4) {
                        score += 10; // Use it if we're short on trumps or near endgame
                    } else {
                        score -= 5; // Save high trumps for later control
                    }
                }
                
                // Don't waste trump if opponents will likely trump over us
                const currentWinner = this.getCurrentTrickWinner(context.currentTrick);
                if (currentWinner && currentWinner.card.suit === this.trumpSuit && 
                    this.getCardValue(currentWinner.card) > cardStrength) {
                    score -= 20; // Don't undertrump
                }
            }
            
            } else {
            // Can't win - minimize loss and save good cards
            if (isLeadSuit) {
                score += (15 - cardStrength); // Play lowest possible in suit
                
                // Special case: if we have a very long suit, keep some middle cards
                const suitLength = hand.filter(c => c.suit === card.suit).length;
                if (suitLength >= 5 && cardStrength >= 8 && cardStrength <= 11) {
                    score -= 5; // Keep middle cards in very long suits
                }
            } else {
                // Not following suit - opportunity to discard or trump
                if (isTrump) {
                    // SMARTER TRUMP DECISIONS
                    const trickValue = this.assessTrickValue(context.currentTrick);
                    
                    // Only trump if it's worth it
                    if (context.urgencyLevel > 0.6 || trickValue > 10 || tricksLeft <= 5) {
                        score += 15; // Trump when desperate or valuable trick
                        if (cardStrength <= 8) score += 10; // Prefer low trumps
                    } else {
                        score -= 15; // Save trump for better opportunities
                    }
                } else {
                    // Discard safely - IMPROVED DISCARD STRATEGY
                    score += 12;
                    
                    // Priority: dump dangerous singletons and high cards from short suits
                    const suitLength = hand.filter(c => c.suit === card.suit).length;
                    if (suitLength === 1) {
                        score += 15; // Dump singletons
                        if (cardStrength >= 12) score += 10; // Especially high singletons
                    } else if (suitLength === 2 && cardStrength >= 11) {
                        score += 8; // Dump high cards from short suits
                    }
                    
                    // Keep middle cards from long suits
                    if (suitLength >= 4 && cardStrength >= 8 && cardStrength <= 11) {
                        score -= 8; // Keep working cards in long suits
                    }
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
            maxUrgency: 0,
            zeroBidders: [], // Players who bid 0
            isUnderGame: false
        };
        
        // Calculate total bids to determine if this is an "under" game
        const totalBids = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
        situations.isUnderGame = totalBids < 13;
        
        this.players.forEach(player => {
            const bid = this.phase2Bids[player] || 0;
            const taken = this.tricksWon[player] || 0;
            const needed = bid - taken;
            const remaining = 13 - this.tricksPlayed;
            
            // Track players who bid 0 (especially important in under games)
            if (bid === 0 && taken === 0) {
                situations.zeroBidders.push(player);
            }
            
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
    
    evaluateZeroBidTargeting(card, player, context) {
        let targetingScore = 0;
        const opponentSituations = context.opponentSituations;
        
        // Only apply zero-bid targeting in under games where it's most effective
        if (!opponentSituations.isUnderGame || opponentSituations.zeroBidders.length === 0) {
            return 0;
        }
        
        // ADVANCED: Enhanced zero-bidder disruption analysis
        for (const zeroBidder of opponentSituations.zeroBidders) {
            const zeroBidderAnalysis = this.analyzeZeroBidder(zeroBidder);
            
            // STRATEGY: Force zero bidders to win tricks they don't want
            const disruptionValue = this.calculateZeroBidDisruption(card, player, zeroBidder, zeroBidderAnalysis, context);
            
            if (this.isPlayerInCurrentTrick(zeroBidder)) {
                const strategicValue = this.calculateZeroBidderStrategy(card, player, zeroBidder, zeroBidderAnalysis, context);
                targetingScore += strategicValue + disruptionValue;
            } else {
                // Even if not in current trick, plan for future disruption
                targetingScore += disruptionValue * 0.3;
            }
        }
        
        return targetingScore;
    }
    
    analyzeZeroBidder(zeroBidder) {
        const cardsPlayed = this.botMemory.cardsPlayed[zeroBidder];
        const trumpsPlayed = this.botMemory.trumpsPlayed.filter(t => t.player === zeroBidder);
        const estimatedTrumps = this.botMemory.probabilityModel.trumpEstimates[zeroBidder];
        const suitVoids = this.botMemory.suitVoids[zeroBidder];
        
        // Estimate remaining hand composition
        const remainingCards = 13 - cardsPlayed.length;
        const playedSuits = {
            clubs: cardsPlayed.filter(c => c.suit === 'clubs').length,
            diamonds: cardsPlayed.filter(c => c.suit === 'diamonds').length,
            hearts: cardsPlayed.filter(c => c.suit === 'hearts').length,
            spades: cardsPlayed.filter(c => c.suit === 'spades').length
        };
        
        return {
            remainingCards,
            estimatedTrumps,
            playedSuits,
            suitVoids,
            trumpsPlayed: trumpsPlayed.length,
            isLikelyToHaveTrumps: estimatedTrumps > 0,
            dangerLevel: this.calculateZeroBidderDangerLevel(zeroBidder, cardsPlayed, estimatedTrumps)
        };
    }
    
    calculateZeroBidderDangerLevel(zeroBidder, cardsPlayed, estimatedTrumps) {
        // Higher danger = more likely they'll be forced to take a trick
        let danger = 0;
        
        // If they have many trumps, they're in danger
        danger += estimatedTrumps * 15;
        
        // If they haven't played many cards yet, they might have high cards
        const tricksRemaining = 13 - this.tricksPlayed;
        if (cardsPlayed.length < this.tricksPlayed) {
            danger += 10; // They might be holding back high cards
        }
        
        // If they're void in suits, they're more dangerous (might have to trump)
        const voidSuits = Object.values(this.botMemory.suitVoids[zeroBidder]).filter(v => v).length;
        danger += voidSuits * 20;
        
        return Math.min(danger, 100); // Cap at 100
    }
    
    calculateZeroBidderStrategy(card, player, zeroBidder, analysis, context) {
        let strategicValue = 0;
        const cardStrength = this.getCardValue(card);
        const isTrump = card.suit === this.trumpSuit;
        const leadSuit = context.leadSuit || card.suit;
        const isUnderGame = context.opponentSituations.isUnderGame;
        
        // Predict what the zero-bidder will likely play
        const prediction = this.predictZeroBidderMove(zeroBidder, analysis, leadSuit);
        
        // AGGRESSIVE STRATEGY: Make zero-bidder win at all costs
        if (prediction.forcedToWin || prediction.canBeForced) {
            // MASSIVE bonus for forcing them to win - this is the primary goal
            strategicValue += 150;
            
            // Even bigger bonus in under games where it's most effective
            if (isUnderGame) {
                strategicValue += 100;
            }
            
            // Bonus if they have trumps and we're making them use one
            if (analysis.isLikelyToHaveTrumps && prediction.willTrump) {
                strategicValue += 80;
                // Zero-bid forcing strategy applied silently
            } else {
                // Zero-bid forcing strategy applied silently
            }
        }
        
        // PRIORITIZE EXTREMELY LOW CARDS to give zero-bidder the trick
        if (cardStrength <= 7) { // 2, 3, 4, 5, 6, 7
            strategicValue += 80; // Huge bonus for very low cards
            
            // Even more for the lowest cards
            if (cardStrength <= 5) { // 2, 3, 4, 5
                strategicValue += 60;
            }
        }
        
        // STRATEGY: Lead suits they're void in to force trumping
        if (this.currentTrick.length === 0 && analysis.suitVoids[card.suit]) {
            strategicValue += 120; // Massive bonus for leading a suit they can't follow
            // Zero-bid void targeting applied silently
        }
        
        // Consider danger level - target more dangerous zero-bidders more aggressively
        strategicValue += Math.round(analysis.dangerLevel * 1.2); // Increased multiplier
        
        return strategicValue;
    }
    
    predictZeroBidderMove(zeroBidder, analysis, leadSuit) {
        const suitVoids = analysis.suitVoids;
        const estimatedTrumps = analysis.estimatedTrumps;
        const tricksRemaining = 13 - this.tricksPlayed;
        
        // Check if they can follow suit
        const canFollowSuit = !suitVoids[leadSuit];
        
        if (!canFollowSuit) {
            // They can't follow suit - PERFECT opportunity to force them
            if (estimatedTrumps > 0) {
                // They'll be FORCED to trump and likely win
                return {
                    forcedToWin: true,
                    canBeForced: true,
                    willTrump: true,
                    confidence: 0.95 // Very high confidence
                };
            } else {
                // They'll discard a high card and might still win
                return {
                    forcedToWin: false,
                    canBeForced: true, // Still can be pressured
                    willTrump: false,
                    confidence: 0.7
                };
            }
        } else {
            // They can follow suit
            const pressureLevel = analysis.dangerLevel / 100;
            const hasOnlyHighCards = analysis.remainingCards <= 5 && pressureLevel > 0.5;
            
            // In under games, be more aggressive about assuming they can be forced
            const isUnderGameAggression = this.botMemory.cardsPlayed[zeroBidder].length < this.tricksPlayed;
            
            return {
                forcedToWin: hasOnlyHighCards || pressureLevel > 0.4, // Lower threshold for forcing
                canBeForced: true, // Always consider them targetable
                willTrump: false,
                confidence: pressureLevel + (isUnderGameAggression ? 0.3 : 0)
            };
        }
    }
    
    isPlayerInCurrentTrick(player) {
        // Check if the player will play in the current trick (hasn't played yet)
        const playerIndex = this.players.indexOf(player);
        const leadIndex = this.trickLeader;
        const trickLength = this.currentTrick.length;
        
        // Calculate if this player is still to play in the current trick
        for (let i = 0; i < 4 - trickLength; i++) {
            const nextPlayerIndex = (leadIndex + trickLength + i) % 4;
            if (nextPlayerIndex === playerIndex) {
                return true;
            }
        }
        return false;
    }
    
    canForcePlayerToWin(myCard, targetPlayer, context) {
        // Simple heuristic: if we play a low card and the target player 
        // will be forced to follow suit or trump, they might win
        const targetHand = this.hands[targetPlayer];
        if (!targetHand) return false;
        
        const leadSuit = context.leadSuit || myCard.suit;
        const targetCanFollow = targetHand.some(card => card.suit === leadSuit);
        
        // If they can't follow suit, they might have to trump and win
        // If they can follow suit with only high cards, they might be forced to win
        if (!targetCanFollow) {
            return targetHand.some(card => card.suit === this.trumpSuit);
        }
        
        // Check if their lowest card in suit is still high
        const suitCards = targetHand.filter(card => card.suit === leadSuit);
        const lowestSuitCard = suitCards.reduce((lowest, card) => 
            this.getCardValue(card) < this.getCardValue(lowest) ? card : lowest, suitCards[0]);
        
        return this.getCardValue(lowestSuitCard) > this.getCardValue(myCard);
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
        

    }

    passPhase1() {
        this.logPlayer(`${this.getPlayerDisplayName('south')} passed`, 'south');
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
                        this.logPlayer(`🃏 PHASE 1: ${this.getPlayerDisplayName(player)} bids ${potentialBid.minTakes} ${potentialBid.trumpSuit}`, player);
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
                    this.logPlayer(`🃏 PHASE 1: ${this.getPlayerDisplayName(player)} opens ${openingBid.minTakes} ${openingBid.trumpSuit}`, player);
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
            this.logPlayer(`🚫 PHASE 1: ${this.getPlayerDisplayName(player)} passed`, player);
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
        
        // ADVANCED: Trump bluffing strategy - bid lower suit to bait opponents
        const bluffBid = this.considerTrumpBluff(player, currentBidValue, currentSuit, handStrength);
        if (bluffBid) {
            return bluffBid;
        }
        
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
        
        // GUIDANCE: Track high cards - note which high cards have been played
        this.trackHighCardPlayed(card, player);
        
        // Update suit distribution tracking
        this.botMemory.suitDistribution[card.suit]--;
        
        // Update probability model
        this.updateProbabilityModel(card, player);
    }
    
    // GUIDANCE: Track high cards for better prediction
    trackHighCardPlayed(card, player) {
        // Initialize high card tracking if not exists
        if (!this.botMemory.highCardsPlayed) {
            this.botMemory.highCardsPlayed = {
                aces: [],
                kings: [],
                queens: [],
                jacks: [],
                byPlayer: { north: [], east: [], south: [], west: [] },
                remaining: {
                    aces: ['clubs', 'diamonds', 'hearts', 'spades'],
                    kings: ['clubs', 'diamonds', 'hearts', 'spades'],
                    queens: ['clubs', 'diamonds', 'hearts', 'spades'],
                    jacks: ['clubs', 'diamonds', 'hearts', 'spades']
                }
            };
        }
        
        // Track if this is a high card
        if (['A', 'K', 'Q', 'J'].includes(card.rank)) {
            const cardInfo = { suit: card.suit, rank: card.rank, player: player, trick: this.tricksPlayed + 1 };
            
            // Add to appropriate rank list
            if (card.rank === 'A') {
                this.botMemory.highCardsPlayed.aces.push(cardInfo);
                this.botMemory.highCardsPlayed.remaining.aces = 
                    this.botMemory.highCardsPlayed.remaining.aces.filter(suit => suit !== card.suit);
            } else if (card.rank === 'K') {
                this.botMemory.highCardsPlayed.kings.push(cardInfo);
                this.botMemory.highCardsPlayed.remaining.kings = 
                    this.botMemory.highCardsPlayed.remaining.kings.filter(suit => suit !== card.suit);
            } else if (card.rank === 'Q') {
                this.botMemory.highCardsPlayed.queens.push(cardInfo);
                this.botMemory.highCardsPlayed.remaining.queens = 
                    this.botMemory.highCardsPlayed.remaining.queens.filter(suit => suit !== card.suit);
            } else if (card.rank === 'J') {
                this.botMemory.highCardsPlayed.jacks.push(cardInfo);
                this.botMemory.highCardsPlayed.remaining.jacks = 
                    this.botMemory.highCardsPlayed.remaining.jacks.filter(suit => suit !== card.suit);
            }
            
            // Add to player-specific list
            this.botMemory.highCardsPlayed.byPlayer[player].push(cardInfo);
        }
    }
    
    // GUIDANCE: Use high card tracking for better decision making
    getHighCardInformation(suit) {
        if (!this.botMemory.highCardsPlayed) return null;
        
        const remaining = this.botMemory.highCardsPlayed.remaining;
        return {
            aceRemaining: remaining.aces.includes(suit),
            kingRemaining: remaining.kings.includes(suit),
            queenRemaining: remaining.queens.includes(suit),
            jackRemaining: remaining.jacks.includes(suit),
            highCardsRemaining: [
                remaining.aces.includes(suit) ? 'A' : null,
                remaining.kings.includes(suit) ? 'K' : null,
                remaining.queens.includes(suit) ? 'Q' : null,
                remaining.jacks.includes(suit) ? 'J' : null
            ].filter(rank => rank !== null)
        };
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
                this.logPlayer(`   ${this.getPlayerDisplayName(player)}: ${hand.join(' ')} (${handStrength.score} pts)`, player);
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
         
         // Reset bot memory for new hand
         this.resetBotMemory();
        
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
         const gamletScores = {};
         this.players.forEach(player => {
             const bid = this.phase2Bids[player];
             const tricks = this.tricksWon[player];
             
             let score;
             if (bid === 0) {
                 // Special scoring for zero bids
                 score = this.calculateZeroBidScore(player, tricks);
                 this.logPlayer(`   💯 ${this.getPlayerDisplayName(player)}: bid 0, took ${tricks} → ${score > 0 ? '+' : ''}${score} pts (${this.scores[player]} → ${this.scores[player] + score})`, player);
             } else {
                 // Regular scoring
                 score = this.calculateScore(player, bid, tricks);
                 const status = tricks === bid ? '✅ EXACT' : tricks > bid ? '📈 OVER' : '📉 UNDER';
                 this.logPlayer(`   ${status} ${this.getPlayerDisplayName(player)}: bid ${bid}, took ${tricks} → ${score > 0 ? '+' : ''}${score} pts (${this.scores[player]} → ${this.scores[player] + score})`, player);
             }
             
             scoreChanges[player] = score;
             gamletScores[player] = score; // Store individual gamlet score
             this.scores[player] += score;
         });
         
         // Update AI learning with actual results
         this.updateAILearning();
         
         // Show score animations before updating display
         this.showScoreAnimations(scoreChanges);
         
         // Update the score table display after animations
         setTimeout(() => this.updateScoresDisplay(), this.getDelay(2000));
         

         
         // Always save gamlet to history after completion
         this.saveGamletToHistory(gamletScores);
         
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
                 this.logPlayer(`🤖 ${this.getPlayerDisplayName(player)}: adapting to BALANCED (poor accuracy)`, player);
             } else if (recentAccuracy > 0.8 && pattern.biddingStyle === 'conservative') {
                 pattern.biddingStyle = 'balanced';
                 this.logPlayer(`🤖 ${this.getPlayerDisplayName(player)}: adapting to BALANCED (high accuracy)`, player);
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
        
        // Reset bot memory for new gamlet
        this.resetBotMemory();
        
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
     
     resetBotMemory() {
         // Reset all tracking for new hand
         this.botMemory.cardsPlayed = { north: [], east: [], south: [], west: [] };
         this.botMemory.trumpsPlayed = [];
         this.botMemory.suitDistribution = { clubs: 13, diamonds: 13, hearts: 13, spades: 13 };
         this.botMemory.suitVoids = {
             north: { clubs: false, diamonds: false, hearts: false, spades: false },
             east: { clubs: false, diamonds: false, hearts: false, spades: false },
             south: { clubs: false, diamonds: false, hearts: false, spades: false },
             west: { clubs: false, diamonds: false, hearts: false, spades: false }
         };
                   this.botMemory.probabilityModel.trumpEstimates = { north: 0, east: 0, south: 0, west: 0 };
          this.botMemory.probabilityModel.suitLengthEstimates = {
              north: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 },
              east: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 },
              south: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 },
              west: { clubs: 0, diamonds: 0, hearts: 0, spades: 0 }
          };
          
          // GUIDANCE: Initialize high card tracking for new round
          this.botMemory.highCardsPlayed = {
              aces: [],
              kings: [],
              queens: [],
              jacks: [],
              byPlayer: { north: [], east: [], south: [], west: [] },
              remaining: {
                  aces: ['clubs', 'diamonds', 'hearts', 'spades'],
                  kings: ['clubs', 'diamonds', 'hearts', 'spades'],
                  queens: ['clubs', 'diamonds', 'hearts', 'spades'],
                  jacks: ['clubs', 'diamonds', 'hearts', 'spades']
              }
          };
         
         console.log('🧠 Bot memory reset for new hand');
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
         const currentBid = this.getCurrentHighestBid();
         const suits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];
         
         let hint = '';
         
         // === COMPACT BIDDING RECOMMENDATIONS ===
         hint += '<h4 style="margin: 8px 0 12px 0; font-size: 1.2em;">🎯 Bidding Options</h4>';
         
         if (this.playersPassed.south) {
             hint += '<p>You have already passed this round.</p>';
             return hint;
         }
         
         const biddingOptions = this.calculateBiddingOptions(hand, handStrength, currentBid);
         
         if (biddingOptions.length === 0 || (biddingOptions.length > 0 && biddingOptions[0].successRate < 70)) {
             // Recommend PASS if no options or top option has <70% success rate
             hint += `<div class="hint-pass-recommendation">`;
             hint += '<strong>🚫 PASS</strong> ';
 
             if (biddingOptions.length === 0) {
                 if (currentBid) {
                     hint += `(can't compete with ${currentBid.minTakes}${this.getSuitSymbol(currentBid.trumpSuit)})`;
                 } else {
                     hint += '(hand too weak)';
                 }
             } else {
                 const topOption = biddingOptions[0];
                 hint += `(${topOption.minTakes}${this.getSuitSymbol(topOption.trumpSuit)} only ${topOption.successRate}% - risky)`;
             }
             hint += `</div>`;
             
             // Show compact risky alternatives
             if (biddingOptions.length > 0) {
                 hint += '<div class="hint-alternatives"><strong>Risky:</strong> ';
                 biddingOptions.slice(0, 2).forEach((option, index) => {
                     hint += `${option.minTakes}${this.getSuitSymbol(option.trumpSuit)} (${option.successRate}%)`;
                     if (index < Math.min(biddingOptions.length, 2) - 1) hint += ', ';
                 });
                 hint += '</div>';
             }
         } else {
             // Top recommendation first (>=70% success rate)
             const topOption = biddingOptions[0];
             hint += `<div class="hint-recommendation">`;
             hint += `<strong>💡 ${topOption.minTakes} ${this.getSuitSymbol(topOption.trumpSuit)}</strong> `;
 
             hint += `<span style="color: ${this.getConfidenceLevel(topOption.successRate).color};">(${topOption.successRate}%)</span><br>`;
             hint += `<div class="hint-reasoning">${topOption.reasoning}</div>`;
             hint += `</div>`;
             
             // Show compact alternatives
             if (biddingOptions.length > 1) {
                 const alternatives = biddingOptions.slice(1, 3); // Max 2 alternatives for space
                 hint += '<div class="hint-alternatives"><strong>Alternatives:</strong> ';
                 alternatives.forEach((option, index) => {
                     hint += `${option.minTakes}${this.getSuitSymbol(option.trumpSuit)} (${option.successRate}%)`;
                     if (index < alternatives.length - 1) hint += ', ';
                 });
                 hint += '</div>';
             }
         }
         
         // === COMPACT COMPETITIVE STRATEGY ===
         if (currentBid) {
             hint += '<div class="hint-competitive">';
            hint += '<strong>⚔️ vs ' + this.getPlayerDisplayName(this.findBidWinner()) + ':</strong> ';
 
             const competitiveAdvice = this.getCompetitiveAdviceCompact(hand, handStrength, currentBid, biddingOptions);
             hint += competitiveAdvice;
             hint += '</div>';
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
     
     getCompetitiveAdviceCompact(hand, handStrength, currentBid, biddingOptions) {
         if (biddingOptions.length === 0) {
             return 'Cannot compete safely';
         }
         
         const bestOption = biddingOptions[0];
         const samesuit = bestOption.trumpSuit === currentBid.trumpSuit;
         
         if (samesuit) {
             if (bestOption.successRate >= 65) {
                 return `Outbid with ${bestOption.minTakes}${this.getSuitSymbol(bestOption.trumpSuit)} (${bestOption.successRate}%)`;
             } else {
                 return 'Pass, raise in Phase 2 if they win';
             }
         } else {
             if (bestOption.successRate >= 60) {
                 return `Compete with ${bestOption.minTakes}${this.getSuitSymbol(bestOption.trumpSuit)} (${bestOption.successRate}%)`;
             } else {
                 return `Risky to compete (${bestOption.successRate}%)`;
             }
         }
     }
     
     // Supporting functions for enhanced Phase 1 hints
     getDetailedSuitAnalysis(hand) {
         const analysis = {
             clubs: { count: 0, honors: 0, strength: 0 },
             diamonds: { count: 0, honors: 0, strength: 0 },
             hearts: { count: 0, honors: 0, strength: 0 },
             spades: { count: 0, honors: 0, strength: 0 },
             notrump: { strength: 0 }
         };
         
         const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
         const honorCards = ['A', 'K', 'Q', 'J'];
         const cardValues = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1, '10': 0.5 };
         
         suits.forEach(suit => {
             const suitCards = hand.filter(card => card.suit === suit);
             analysis[suit].count = suitCards.length;
             
             suitCards.forEach(card => {
                 if (honorCards.includes(card.rank)) {
                     analysis[suit].honors++;
                 }
                 analysis[suit].strength += cardValues[card.rank] || 0;
             });
             
             // Length bonus for trump potential
             if (suitCards.length >= 5) {
                 analysis[suit].strength += (suitCards.length - 4) * 1.5;
             }
         });
         
         // No Trump strength = balanced distribution + high card points
         const lengths = suits.map(suit => analysis[suit].count);
         const maxLength = Math.max(...lengths);
         const minLength = Math.min(...lengths);
         const totalHCP = suits.reduce((sum, suit) => sum + analysis[suit].strength, 0);
         
         if (maxLength <= 4 && minLength >= 2) {
             analysis.notrump.strength = totalHCP * 0.8; // Penalty for no trump
         } else {
             analysis.notrump.strength = totalHCP * 0.4; // Heavy penalty for unbalanced
         }
         
         return analysis;
     }
     
     calculateBiddingOptions(hand, handStrength, currentBid) {
         const options = [];
         const suits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];
         const suitAnalysis = this.getDetailedSuitAnalysis(hand);
         
         // Determine the minimum bid needed
         let minTricks = 4;
         let minSuitRank = -1;
         
         if (currentBid) {
             minTricks = currentBid.minTakes;
             minSuitRank = suits.indexOf(currentBid.trumpSuit);
         }
         
         // Evaluate each possible bid (excluding 4 tricks unless competing against existing 4-bid)
         for (let tricks = minTricks; tricks <= Math.min(8, 13); tricks++) {
             suits.forEach((suit, suitRank) => {
                 // Check if this bid is higher than current
                 if (currentBid) {
                     if (tricks < currentBid.minTakes) return;
                     if (tricks === currentBid.minTakes && suitRank <= minSuitRank) return;
                 }
                 
                 // Skip 4-trick bids unless we're competing against an existing 4-bid
                 if (tricks === 4 && (!currentBid || currentBid.minTakes !== 4)) return;
                 
                 const assessment = this.assessBidViability(hand, suitAnalysis, suit, tricks, handStrength);
                 
                 // Only include viable options (reasonable success chance)
                 if (assessment.successRate >= 35) {
                     options.push({
                         minTakes: tricks,
                         trumpSuit: suit,
                         successRate: assessment.successRate,
                         expectedTricks: assessment.expectedTricks,
                         reasoning: assessment.reasoning,
                         score: assessment.score
                     });
                 }
             });
         }
         
         // Sort by success rate and expected outcome
         options.sort((a, b) => {
             const aScore = a.successRate * 0.7 + (a.expectedTricks / a.minTakes) * 30;
             const bScore = b.successRate * 0.7 + (b.expectedTricks / b.minTakes) * 30;
             return bScore - aScore;
         });
         
         // Ensure trump suit diversity - don't show 3 options with same trump
         const diversifiedOptions = this.diversifyTrumpOptions(options);
         
         return diversifiedOptions.slice(0, 3); // Return top 3 diversified options
     }
     
     diversifyTrumpOptions(options) {
         if (options.length <= 1) return options;
         
         const diversified = [];
         const usedTrumps = new Set();
         
         // First pass: Add options with different trump suits
         for (const option of options) {
             if (!usedTrumps.has(option.trumpSuit)) {
                 diversified.push(option);
                 usedTrumps.add(option.trumpSuit);
                 
                 // Stop if we have 3 different trump suits
                 if (diversified.length >= 3) break;
             }
         }
         
         // If we still need more options and haven't filled 3 slots
         if (diversified.length < 3) {
             // Add remaining options (which may have duplicate trump suits)
             for (const option of options) {
                 if (!diversified.includes(option)) {
                     diversified.push(option);
                     if (diversified.length >= 3) break;
                 }
             }
         }
         
         // If we only have 1-2 viable options, that's fine - quality over quantity
         return diversified;
     }
     
     assessBidViability(hand, suitAnalysis, suit, tricks, handStrength) {
         const assessment = {
             successRate: 0,
             expectedTricks: 0,
             reasoning: '',
             score: 0
         };
         
         if (suit === 'notrump') {
             return this.assessNoTrumpBid(hand, suitAnalysis, tricks, handStrength);
         }
         
         const suitInfo = suitAnalysis[suit];
         const trumpLength = suitInfo.count;
         const trumpHonors = suitInfo.honors;
         const trumpStrength = suitInfo.strength;
         
         // Base expected tricks from trump suit
         let expectedTricks = Math.min(trumpLength - 1, 6); // Trump tricks (keeping one for emergencies)
         expectedTricks += trumpHonors * 0.7; // Honor tricks in trump
         
         // Add non-trump honors
         const otherSuits = ['clubs', 'diamonds', 'hearts', 'spades'].filter(s => s !== suit);
         otherSuits.forEach(otherSuit => {
             const otherInfo = suitAnalysis[otherSuit];
             expectedTricks += otherInfo.honors * 0.6; // Lower probability in side suits
         });
         
         assessment.expectedTricks = Math.round(expectedTricks * 10) / 10;
         
         // Calculate success rate
         let successRate = 0;
         
         if (trumpLength >= 6) {
             successRate = 85; // Excellent trump length
             assessment.reasoning = `Excellent ${suit} length (${trumpLength} cards)`;
         } else if (trumpLength >= 4 && trumpHonors >= 2) {
             successRate = 70; // Good trump suit
             assessment.reasoning = `Strong ${suit} suit (${trumpLength} cards, ${trumpHonors} honors)`;
         } else if (trumpLength >= 4) {
             successRate = 55; // Adequate trump length
             assessment.reasoning = `Adequate ${suit} length (${trumpLength} cards)`;
         } else if (trumpLength >= 3 && trumpHonors >= 2) {
             successRate = 45; // Short but strong
             assessment.reasoning = `Short but strong ${suit} (${trumpHonors} honors)`;
         } else {
             successRate = 25; // Risky
             assessment.reasoning = `Risky ${suit} bid (only ${trumpLength} cards)`;
         }
         
         // Adjust for overall hand strength
         if (handStrength.score >= 25) {
             successRate += 15;
         } else if (handStrength.score >= 20) {
             successRate += 10;
         } else if (handStrength.score < 15) {
             successRate -= 15;
         }
         
         // Adjust for bid level
         if (tricks <= 5) {
             successRate += 10; // Conservative bids are safer
         } else if (tricks >= 7) {
             successRate -= (tricks - 6) * 8; // Aggressive bids are riskier
         }
         
         // Reality check
         if (assessment.expectedTricks < tricks - 1.5) {
             successRate = Math.max(20, successRate - 30);
             assessment.reasoning += ` (optimistic - need ${tricks} but expect ~${assessment.expectedTricks})`;
         }
         
         assessment.successRate = Math.max(0, Math.min(95, Math.round(successRate)));
         assessment.score = successRate + (assessment.expectedTricks / tricks) * 20;
         
         return assessment;
     }
     
     assessNoTrumpBid(hand, suitAnalysis, tricks, handStrength) {
         const assessment = {
             successRate: 0,
             expectedTricks: 0,
             reasoning: '',
             score: 0
         };
         
         // No Trump requires balanced hand and high cards
         const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
         const lengths = suits.map(suit => suitAnalysis[suit].count);
         const maxLength = Math.max(...lengths);
         const minLength = Math.min(...lengths);
         
         if (maxLength > 5 || minLength < 2) {
             assessment.successRate = 20;
             assessment.reasoning = 'Unbalanced hand - No Trump risky';
             assessment.expectedTricks = handStrength.score / 4;
             return assessment;
         }
         
         // Count stoppers (honors in each suit)
         let stoppers = 0;
         let totalHonors = 0;
         suits.forEach(suit => {
             if (suitAnalysis[suit].honors >= 1) stoppers++;
             totalHonors += suitAnalysis[suit].honors;
         });
         
         assessment.expectedTricks = totalHonors * 0.8 + 2; // Base tricks from honors
         
         if (stoppers >= 3 && totalHonors >= 8) {
             assessment.successRate = 75;
             assessment.reasoning = `Strong balanced hand (${totalHonors} honors, ${stoppers} suits covered)`;
         } else if (stoppers >= 3 && totalHonors >= 6) {
             assessment.successRate = 60;
             assessment.reasoning = `Decent balanced hand (${totalHonors} honors)`;
         } else {
             assessment.successRate = 35;
             assessment.reasoning = `Weak for No Trump (only ${totalHonors} honors, ${stoppers} suits covered)`;
         }
         
         // Adjust for bid level
         if (tricks >= 7) {
             assessment.successRate -= (tricks - 6) * 10;
         }
         
         assessment.score = assessment.successRate + (assessment.expectedTricks / tricks) * 20;
         return assessment;
     }
     
     getCompetitiveAdvice(hand, handStrength, currentBid, biddingOptions) {
         let advice = '';
         const currentBidder = this.findBidWinner();
         const currentBidderName = this.getPlayerDisplayName(currentBidder);
         
         advice += `<p><strong>Against ${currentBidderName}'s ${currentBid.minTakes} ${this.getSuitSymbol(currentBid.trumpSuit)}:</strong></p>`;
         
         if (biddingOptions.length === 0) {
             advice += '<p>🛑 <strong>Cannot compete</strong> - your hand lacks the strength to overcall safely.</p>';
             advice += '<p>💡 <strong>Strategy:</strong> Pass now, but consider raising in Phase 2 if they win and you have trump support.</p>';
         } else {
             const bestOption = biddingOptions[0];
             const samesuit = bestOption.trumpSuit === currentBid.trumpSuit;
             
             if (samesuit) {
                 advice += `<p>🔄 <strong>Same trump suit (${this.getSuitSymbol(currentBid.trumpSuit)})</strong> - you'd need to bid ${bestOption.minTakes} vs their ${currentBid.minTakes}.</p>`;
                 if (bestOption.successRate >= 65) {
                     advice += '<p>✅ <strong>Recommended:</strong> You have stronger trump support - outbid them!</p>';
                 } else {
                     advice += '<p>⚠️ <strong>Risky:</strong> Consider passing and raising in Phase 2 instead.</p>';
                 }
             } else {
                 advice += `<p>🆚 <strong>Different trump (${this.getSuitSymbol(bestOption.trumpSuit)} vs ${this.getSuitSymbol(currentBid.trumpSuit)})</strong> - competing suits.</p>`;
                 if (bestOption.successRate >= 60) {
                     advice += '<p>💪 <strong>Compete:</strong> Your suit is strong enough to challenge theirs.</p>';
                 } else {
                     advice += '<p>🤔 <strong>Marginal:</strong> Consider your risk tolerance.</p>';
                 }
             }
         }
         
         // Positional advice
         const playersLeft = this.players.filter(p => 
             !this.playersPassed[p] && !this.phase1Bids[p] && p !== 'south'
         ).length;
         
         if (playersLeft > 0) {
             advice += `<p><strong>⏳ ${playersLeft} player(s) still to bid</strong> - they might outbid you both!</p>`;
         }
         
         return advice;
     }
     
     getConfidenceLevel(successRate) {
         if (successRate >= 75) {
             return { text: 'High Confidence', color: '#4CAF50' };
         } else if (successRate >= 60) {
             return { text: 'Good Chance', color: '#8BC34A' };
         } else if (successRate >= 45) {
             return { text: 'Moderate Risk', color: '#FF9800' };
         } else {
             return { text: 'High Risk', color: '#F44336' };
         }
     }
     
     findBidWinner() {
         // Find who made the current highest bid
         for (const player of this.players) {
             const bid = this.phase1Bids[player];
             if (bid && !this.playersPassed[player]) {
                 const currentHighest = this.getCurrentHighestBid();
                 if (currentHighest && bid.minTakes === currentHighest.minTakes && 
                     bid.trumpSuit === currentHighest.trumpSuit) {
                     return player;
                 }
             }
         }
         return null;
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
        
        // Victory message removed - only showing fireworks
        
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
