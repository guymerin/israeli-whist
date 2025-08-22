// Israeli Whist Game Implementation - Complete Rebuild
// Following proper Israeli Whist rules with 3 phases

class IsraeliWhist {
    constructor() {
        this.players = ['north', 'east', 'south', 'west'];
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
        
        // Button selection state
        this.selectedTricks = null;
        this.selectedSuit = null;
        
        this.bindEvents();
        this.initializeGame();
    }

    initializeGame() {
        console.log('=== INITIALIZING GAME ===');
        this.shuffleDeck();
        this.updateDisplay();
    }

    shuffleDeck() {
        this.deck = [];
        const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        for (const suit of suits) {
            for (let i = 0; i < ranks.length; i++) {
                this.deck.push({
                    suit: suit,
                    rank: ranks[i],
                    value: i + 2
                });
            }
        }
        
        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        console.log('=== DEALING CARDS ===');
        this.currentPhase = 'phase1';
        this.currentBidder = 2; // Start with South (human player)
        
        // Deal 13 cards to each player
        for (let i = 0; i < 13; i++) {
            for (let j = 0; j < 4; j++) {
                const player = this.players[j];
                this.hands[player].push(this.deck.pop());
            }
        }
        
        this.displayCards();
        this.showBiddingInterface();
        this.updateDisplay();
    }

    showBiddingInterface() {
        const biddingInterface = document.getElementById('bidding-interface');
        if (biddingInterface) {
            biddingInterface.style.display = 'block';
        }
        
        this.populateBiddingButtons();
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
        
        // Add trick buttons (4-13)
        for (let i = 4; i <= 13; i++) {
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
        console.log(`Tricks selected: ${tricks}`);
        this.selectedTricks = tricks;
        this.updateButtonSelection('tricks', tricks);
    }

    selectSuit(suit) {
        console.log(`Suit selected: ${suit}`);
        this.selectedSuit = suit;
        this.updateButtonSelection('suit', suit);
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

    makePhase1Bid(minTakes, trumpSuit) {
        if (!this.selectedTricks || !this.selectedSuit) {
            console.error('Please select both tricks and trump suit');
            return;
        }
        
        // Validate minimum bid of 4
        if (minTakes < 4) {
            console.error('Minimum bid must be 4 or higher');
            return;
        }
        
        console.log(`South bids: ${minTakes} ${trumpSuit}`);
        
        // Record the bid
        this.phase1Bids.south = {
            minTakes: minTakes,
            trumpSuit: trumpSuit
        };
        
        // Update the display to show the new bid
        this.updateDisplay();
        
        // Show bid animation
        this.showBidAnimation('south', `${minTakes} ${this.getSuitSymbol(this.selectedSuit)}`);
        
        // Move to next player after animation
        setTimeout(() => {
            this.nextPhase1Bidder();
        }, 1500);
    }

    startPhase2() {
        console.log('=== STARTING PHASE 2 ===');
        this.currentPhase = 'phase2';
        this.hideBiddingInterface();
        
        // Clear Phase 1 display and show Phase 2 status
        this.updateDisplay();
        
        // Start Phase 2 bidding with trump winner
        this.currentBidder = this.players.indexOf(this.trumpWinner);
        this.promptPhase2Bidder();
    }

    promptPhase2Bidder() {
        if (this.currentBidder === 2) { // South (human)
            this.showPhase2Interface();
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
            
            // Show current player's prediction controls if it's their turn
            if (this.currentBidder === 2) { // South (human)
                this.showHumanPhase2Controls();
            }
        }
    }

    showHumanPhase2Controls() {
        const yourPredictionControls = document.getElementById('your-prediction-controls');
        if (yourPredictionControls) {
            yourPredictionControls.style.display = 'block';
        }
        
        // Set minimum bid for trump winner
        if (this.currentBidder === this.players.indexOf(this.trumpWinner)) {
            // Trump winner must bid at least their Phase 1 minimum
            const predictionSelect = document.getElementById('prediction-select');
            if (predictionSelect) {
                // Remove options below minimum
                for (let i = 0; i < this.minimumTakes; i++) {
                    const option = predictionSelect.querySelector(`option[value="${i}"]`);
                    if (option) option.style.display = 'none';
                }
            }
        }
    }

    makePhase2Bid(player, takes) {
        // Validate minimum bid for trump winner
        if (player === this.trumpWinner && takes < this.minimumTakes) {
            console.error(`${player} must bid at least ${this.minimumTakes} as trump winner`);
            return;
        }
        
        this.phase2Bids[player] = takes;
        console.log(`${player} predicts ${takes} takes`);
        
        // Update display immediately after bid
        this.updateDisplay();
        
        // Move to next player
        this.currentBidder = (this.currentBidder + 1) % 4;
        
        if (this.currentBidder === 2) { // Back to South
            this.startPhase3();
        } else {
            this.botMakePhase2Bid();
        }
    }

    botMakePhase2Bid() {
        const player = this.players[this.currentBidder];
        
        // Calculate current total bids
        const currentTotal = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
        
        // Determine valid bid range
        let minBid = 0;
        let maxBid = 13;
        
        // Trump winner must bid at least their Phase 1 minimum
        if (player === this.trumpWinner) {
            minBid = this.minimumTakes;
        }
        
        // Last player cannot make total exactly 13
        if (this.currentBidder === 3) { // Last player (West)
            if (currentTotal + minBid === 13) {
                // Must bid higher to avoid exactly 13
                minBid = Math.min(13, minBid + 1);
            }
            if (currentTotal + maxBid === 13) {
                // Must bid lower to avoid exactly 13
                maxBid = Math.max(minBid, 12);
            }
        }
        
        // Smart bidding based on hand strength and current situation
        const handStrength = this.evaluateHandStrength(player);
        let takes = this.calculateSmartPhase2Bid(player, handStrength, currentTotal, minBid, maxBid);
        
        // Ensure bid is within valid range
        takes = Math.max(minBid, Math.min(maxBid, takes));
        
        console.log(`${player} Phase 2 bid: ${takes} (min: ${minBid}, max: ${maxBid}, current total: ${currentTotal})`);
        this.makePhase2Bid(player, takes);
    }

    calculateSmartPhase2Bid(player, handStrength, currentTotal, minBid, maxBid) {
        // Base bid on hand strength
        let baseBid = Math.floor(handStrength.score / 8); // Rough conversion from points to tricks
        
        // Adjust based on trump suit
        if (this.trumpSuit !== 'notrump') {
            const trumpCards = this.hands[player].filter(card => card.suit === this.trumpSuit).length;
            if (trumpCards >= 4) baseBid += 1;
            if (trumpCards >= 6) baseBid += 1;
        }
        
        // Adjust based on current bidding situation
        if (currentTotal < 8) {
            // Early in bidding, be more aggressive
            baseBid = Math.min(maxBid, baseBid + 1);
        } else if (currentTotal > 18) {
            // Late in bidding, be more conservative
            baseBid = Math.max(minBid, baseBid - 1);
        }
        
        // Ensure bid is within valid range
        return Math.max(minBid, Math.min(maxBid, baseBid));
    }

    startPhase3() {
        console.log('=== STARTING PHASE 3 ===');
        this.currentPhase = 'phase3';
        this.hidePhase2Interface();
        this.updateDisplay();
        
        // Start first trick
        this.startTrick();
    }

    startTrick() {
        this.currentTrick = [];
        this.trickLeader = 2; // South leads first trick
        
        if (this.trickLeader === 2) {
            this.enableCardSelection();
        } else {
            this.botPlayCard();
        }
    }

    enableCardSelection() {
        const cards = document.querySelectorAll('#south-cards .card');
        cards.forEach(card => {
            card.addEventListener('click', () => this.onCardClick(card));
        });
    }

    onCardClick(cardElement) {
        const cardIndex = Array.from(cardElement.parentNode.children).indexOf(cardElement);
        this.playCard('south', cardIndex);
    }

    playCard(player, cardIndex) {
        const hand = this.hands[player];
        if (cardIndex >= hand.length) return;
        
        const card = hand[cardIndex];
        this.currentTrick.push({ player, card });
        
        // Remove card from hand
        hand.splice(cardIndex, 1);
        
        // Update display
        this.updateDisplay();
        
        // Move to next player
        this.nextPlayerInTrick();
    }

    nextPlayerInTrick() {
        const nextPlayerIndex = (this.players.indexOf(this.currentTrick[this.currentTrick.length - 1].player) + 1) % 4;
        const nextPlayerName = this.players[nextPlayerIndex];
        
        if (nextPlayerIndex === 2) {
            // Human player's turn
            this.enableCardSelection();
        } else {
            // Bot player's turn
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
        
        // Play first card for now (simple AI)
        this.playCard(playerName, 0);
    }

    getCurrentPlayerIndex() {
        if (this.currentTrick.length === 0) {
            return this.trickLeader;
        }
        
        const lastPlayer = this.currentTrick[this.currentTrick.length - 1].player;
        return (this.players.indexOf(lastPlayer) + 1) % 4;
    }

    displayCards() {
        // Display human player cards (sorted)
        const southCardsDiv = document.getElementById('south-cards');
        if (southCardsDiv) {
            southCardsDiv.innerHTML = '';
            const sortedCards = this.sortCards(this.hands.south);
            sortedCards.forEach((card, index) => {
                const cardElement = this.createCardElement(card);
                southCardsDiv.appendChild(cardElement);
            });
        }
        
        // Display bot player cards (face down)
        ['north', 'east', 'west'].forEach(player => {
            const cardsDiv = document.getElementById(`${player}-cards`);
            if (cardsDiv) {
                cardsDiv.innerHTML = '';
                for (let i = 0; i < this.hands[player].length; i++) {
                    const cardElement = this.createCardBack();
                    cardsDiv.appendChild(cardElement);
                }
            }
        });
        
        this.cardsDisplayed = true;
    }

    createCardElement(card) {
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
        rank.textContent = card.rank;
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
        
        // Create content with player name and bid
        const playerName = player.toUpperCase();
        const isPass = bidText === 'Pass';
        
        bidAnimation.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 12px; margin-bottom: 4px; color: #333;">${playerName}</div>
                <div style="font-size: 18px; font-weight: bold; color: ${isPass ? '#FF6B6B' : '#4CAF50'};">
                    ${bidText}
                </div>
            </div>
        `;
        
        // Position the animation above the player's name
        const playerInfo = document.querySelector(`.${player}-player`);
        let animationTop = '50%';
        let animationLeft = '50%';
        
        if (playerInfo) {
            const rect = playerInfo.getBoundingClientRect();
            const gameBoardRect = document.querySelector('.game-board').getBoundingClientRect();
            
            // Position above the player info panel
            animationTop = `${rect.top - gameBoardRect.top - 120}px`;
            animationLeft = `${rect.left - gameBoardRect.left + rect.width / 2}px`;
        }
        
        bidAnimation.style.cssText = `
            position: absolute;
            top: ${animationTop};
            left: ${animationLeft};
            transform: translate(-50%, -50%);
            background: rgba(255, 215, 0, 0.95);
            color: #000;
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1000;
            animation: bidPulse 2s ease-in-out;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            border: 2px solid #FFD700;
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
        
        return cards.sort((a, b) => {
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
        // Update round display
        const roundIndicator = document.getElementById('round-indicator');
        if (roundIndicator) {
            roundIndicator.textContent = this.currentRound;
        }
        
        // Update trump display
        const trumpIndicator = document.getElementById('trump-indicator');
        if (trumpIndicator) {
            if (this.trumpSuit) {
                trumpIndicator.textContent = this.getSuitSymbol(this.trumpSuit);
            } else {
                trumpIndicator.textContent = '-';
            }
        }
        
        // Update player info panels with current bids
        this.updatePlayerInfoPanels();
    }

    updatePlayerInfoPanels() {
        // Update each player's bid display in their info panel
        this.players.forEach(player => {
            const bidSpan = document.querySelector(`.${player}-player .player-bid`);
            if (bidSpan) {
                if (this.currentPhase === 'phase2') {
                    if (this.phase2Bids[player] !== null) {
                        // Show Phase 2 takes prediction
                        bidSpan.textContent = `takes: ${this.phase2Bids[player]}`;
                    } else {
                        // Phase 2 but no bid yet - show waiting status
                        bidSpan.textContent = 'waiting...';
                    }
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
            }
        });
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
                    console.error('Please select both tricks and trump suit');
                    return;
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
        
        // Phase 2 prediction button
        const predictBtn = document.getElementById('predict-btn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => {
                const takes = parseInt(document.getElementById('prediction-select').value, 10);
                if (!isNaN(takes)) {
                    // Check if this would make total exactly 13
                    const currentTotal = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
                    if (currentTotal + takes === 13) {
                        alert('The total of all bids cannot be exactly 13. Please choose a different number.');
                        return;
                    }
                    this.makePhase2Bid('south', takes);
                }
            });
        }
    }

    passPhase1() {
        console.log('South passed');
        this.playersPassed.south = true;
        this.passCount++;
        
        // Show pass animation
        this.showBidAnimation('south', 'Pass');
        
        // Update the display to show the pass
        this.updateDisplay();
        
        // Check if all 4 players have passed
        if (this.passCount >= 4) {
            console.log('All players passed. Starting new hand.');
            alert('All players passed! Starting new hand with fresh cards.');
            setTimeout(() => this.resetForNewHand(), 1000);
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
                setTimeout(() => this.startPhase2(), 1000);
                return;
            }
        }
        
        // Move to next player after animation
        setTimeout(() => {
            this.nextPhase1Bidder();
        }, 1500);
    }

    nextPhase1Bidder() {
        // Move to next player, skipping those who have passed
        do {
            this.currentBidder = (this.currentBidder + 1) % 4;
        } while (this.playersPassed[this.players[this.currentBidder]]);
        
        const player = this.players[this.currentBidder];
        
        // Check if all 4 players have passed
        if (this.passCount >= 4) {
            console.log('All players passed. Starting new hand.');
            alert('All players passed! Starting new hand with fresh cards.');
            setTimeout(() => this.resetForNewHand(), 1000);
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
                setTimeout(() => this.startPhase2(), 1000);
                return;
            }
        }
        
        if (player === 'south') {
            this.promptPhase1Bidder();
        } else {
            this.botMakePhase1Bid();
        }
    }

    botMakePhase1Bid() {
        const player = this.players[this.currentBidder];
        
        // Check if this player has already passed - if so, they can't bid again
        if (this.playersPassed[player]) {
            console.log(`${player} has already passed, moving to next player`);
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
        console.log(`${player} hand strength: ${handStrength.score} points, ${handStrength.longestSuit} longest suit`);
        
        // Decide whether to pass or bid based on hand strength and current bidding
        let shouldPass = false;
        let bidMade = false;
        
        if (currentHighestBid) {
            // If there's a current bid, evaluate whether we can/should bid higher
            const currentBidValue = currentHighestBid.minTakes;
            const currentSuit = currentHighestBid.trumpSuit;
            
            // Calculate our potential bid
            const potentialBid = this.calculateHigherBid(currentBidValue, currentSuit);
            
            if (potentialBid && this.shouldBotBid(player, potentialBid, handStrength, currentHighestBid)) {
                // Make the higher bid
                this.phase1Bids[player] = potentialBid;
                console.log(`${player} bids ${potentialBid.minTakes} ${potentialBid.trumpSuit}`);
                const bidText = `${potentialBid.minTakes} ${this.getSuitSymbol(potentialBid.trumpSuit)}`;
                this.showBidAnimation(player, bidText);
                bidMade = true;
                
                // Update the display to show the new bid
                this.updateDisplay();
            } else {
                shouldPass = true;
            }
        } else {
            // No current bid, evaluate whether we should make an opening bid
            if (handStrength.score >= 25) { // Only bid with decent hands
                const openingBid = this.calculateSmartOpeningBid(player, handStrength);
                this.phase1Bids[player] = openingBid;
                console.log(`${player} bids ${openingBid.minTakes} ${openingBid.trumpSuit}`);
                const bidText = `${openingBid.minTakes} ${this.getSuitSymbol(openingBid.trumpSuit)}`;
                this.showBidAnimation(player, bidText);
                bidMade = true;
                
                // Update the display to show the new bid
                this.updateDisplay();
            } else {
                shouldPass = true;
            }
        }
        
        if (shouldPass) {
            this.playersPassed[player] = true;
            this.passCount++;
            console.log(`${player} passed`);
            this.showBidAnimation(player, 'Pass');
            
            // Update the display to show the pass
            this.updateDisplay();
            
            // Check if all 4 players have passed
            if (this.passCount >= 4) {
                console.log('All players passed. Starting new hand.');
                alert('All players passed! Starting new hand with fresh cards.');
                setTimeout(() => this.resetForNewHand(), 1000);
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
                    setTimeout(() => this.startPhase2(), 1000);
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
        console.log('Human player turn to bid');
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

    calculateHigherBid(currentBidValue, currentSuit) {
        console.log(`calculateHigherBid called with: currentBidValue=${currentBidValue}, currentSuit=${currentSuit}`);
        const suits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];
        const suitRank = suits.indexOf(currentSuit);
        
        // Try to bid higher in the same suit first
        if (currentBidValue < 13) {
            const result = {
                minTakes: currentBidValue + 1,
                trumpSuit: currentSuit
            };
            console.log(`Returning higher bid in same suit:`, result);
            return result;
        }
        
        // If at max tricks, try higher suit with same number
        if (suitRank < 4) {
            const result = {
                minTakes: currentBidValue,
                trumpSuit: suits[suitRank + 1]
            };
            console.log(`Returning higher bid with higher suit:`, result);
            return result;
        }
        
        // Can't bid higher
        console.log(`Cannot bid higher, returning null`);
        return null;
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
        let score = 0;
        let longestSuit = 'clubs';
        let maxLength = 0;
        const suitCounts = { clubs: 0, diamonds: 0, hearts: 0, spades: 0 };
        
        // Count cards by suit and calculate high card points
        hand.forEach(card => {
            suitCounts[card.suit]++;
            
            // High card points (A=4, K=3, Q=2, J=1)
            if (card.rank === 'A') score += 4;
            else if (card.rank === 'K') score += 3;
            else if (card.rank === 'Q') score += 2;
            else if (card.rank === 'J') score += 1;
        });
        
        // Find longest suit
        Object.entries(suitCounts).forEach(([suit, count]) => {
            if (count > maxLength) {
                maxLength = count;
                longestSuit = suit;
            }
        });
        
        // Bonus for long suits and balanced distribution
        if (maxLength >= 5) score += 3; // Long suit bonus
        if (maxLength >= 6) score += 2; // Very long suit bonus
        
        // Distribution bonus
        const shortSuits = Object.values(suitCounts).filter(count => count <= 2).length;
        if (shortSuits >= 2) score += 2; // Short suit bonus
        
        return { score, longestSuit, suitCounts, maxLength };
    }

    calculateSmartOpeningBid(player, handStrength) {
        // According to Israeli Whist rules, minimum bid is 5
        let minTakes = 5;
        
        // Adjust based on hand strength
        if (handStrength.score >= 30) minTakes = 6;
        if (handStrength.score >= 35) minTakes = 7;
        if (handStrength.score >= 40) minTakes = 8;
        
        // Prefer the longest suit as trump
        let trumpSuit = handStrength.longestSuit;
        
        // If longest suit is weak, consider no trump
        if (handStrength.suitCounts[handStrength.longestSuit] <= 3 && handStrength.score >= 28) {
            trumpSuit = 'notrump';
        }
        
        return { minTakes, trumpSuit };
    }

    shouldBotBid(player, potentialBid, handStrength, currentHighestBid) {
        // Don't bid if our hand is too weak
        if (handStrength.score < 20) return false;
        
        // Don't bid if we're already at a very high level
        if (potentialBid.minTakes > 10) return false;
        
        // Be more aggressive with strong hands
        if (handStrength.score >= 35) return true;
        
        // Be more conservative with moderate hands
        if (handStrength.score >= 25) {
            // 70% chance to bid with moderate hands
            return Math.random() < 0.7;
        }
        
        // Be very conservative with weak hands
        if (handStrength.score >= 20) {
            // 30% chance to bid with weak hands
            return Math.random() < 0.3;
        }
        
        return false;
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
            console.log(`Phase 1 complete. ${trumpWinner} won with ${highestBid.minTakes} ${highestBid.trumpSuit}`);
            this.startPhase2();
        } else {
            // All passed, redeal
            console.log('All players passed, redealing...');
            this.resetForNewHand();
        }
    }

    resetForNewHand() {
        this.currentPhase = 'dealing';
        this.hands = { north: [], east: [], south: [], west: [] };
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
        
        this.shuffleDeck();
        this.updateDisplay();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    try {
        window.game = new IsraeliWhist();
        console.log('Israeli Whist game loaded successfully!');
    } catch (error) {
        console.error('Error initializing game:', error);
    }
});
