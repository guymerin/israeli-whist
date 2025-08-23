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
         this.handType = null; // 'over' or 'under' based on Phase 2 total
        
        // Button selection state
        this.selectedTricks = null;
        this.selectedSuit = null;
        
        this.bindEvents();
        this.initializeGame();
    }

    initializeGame() {
        console.log('=== INITIALIZING GAME ===');
        
        // Ensure hands are properly initialized
        this.hands = {
            north: [],
            east: [],
            south: [],
            west: []
        };
        
        this.shuffleDeck();
        this.updateDisplay();
        
        // Initialize hint system
        this.initializeHintSystem();
        
        // Verify initialization
        if (this.deck.length === 52 && Object.keys(this.hands).length === 4) {
            console.log('Game initialized successfully');
        } else {
            console.error('Game initialization failed');
        }
    }

    shuffleDeck() {
        this.deck = [];
        const suits = ['clubs', 'diamonds', 'hearts', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
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
        
        // Verify deck integrity
        if (this.deck.length !== 52) {
            console.error('Deck creation failed, expected 52 cards, got:', this.deck.length);
            return;
        }
        
        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        
        console.log('Deck shuffled successfully, cards:', this.deck.length);
    }

    dealCards() {
        console.log('=== DEALING CARDS ===');
          
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
                        console.error('Failed to get replacement card, game may be corrupted');
                    }
                }
            }
        }
        
        // Verify each player has exactly 13 cards
        this.players.forEach(player => {
            if (this.hands[player].length !== 13) {
                console.error(`${player} has ${this.hands[player].length} cards instead of 13!`);
            }
        });
        
        console.log('Dealing complete. Cards per player:', {
            north: this.hands.north.length,
            east: this.hands.east.length,
            south: this.hands.south.length,
            west: this.hands.west.length
        });
        
        // Log actual cards for each player for debugging
        console.log('=== PLAYER HANDS ===');
        this.players.forEach(player => {
            console.log(`${player.toUpperCase()} hand:`, this.hands[player].map(card => `${card.rank}${this.getSuitSymbol(card.suit)}`).join(' '));
        });
        console.log('=== END PLAYER HANDS ===');
        
        this.displayCards();
        this.updateDisplay();
        
        // Since we start with South (human player), show the bidding interface immediately
        this.promptPhase1Bidder();
    }

    showBiddingInterface() {
        console.log('showBiddingInterface called');
        const biddingInterface = document.getElementById('bidding-interface');
        if (biddingInterface) {
            biddingInterface.style.display = 'block';
            console.log('Bidding interface shown');
        } else {
            console.error('Bidding interface element not found!');
        }
        
        this.populateBiddingButtons();
    }

    hideBiddingInterface() {
        const biddingInterface = document.getElementById('bidding-interface');
        if (biddingInterface) {
            biddingInterface.style.display = 'none';
        }
    }

    populateBiddingButtons() {
        console.log('populateBiddingButtons called');
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
        
                 // Validate minimum bid of 5 according to official Israeli Whist rules
         if (minTakes < 5) {
             console.error('Minimum bid must be 5 or higher');
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
        
        // Hide bidding interface after bid
        this.hideBiddingInterface();
        
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
         
         // Force immediate refresh of all Phase 2 displays to clear Phase 1 state
         this.forceDisplayUpdate();
        
        // Start Phase 2 bidding with trump winner
         // Then go clockwise (left) from there
        this.currentBidder = this.players.indexOf(this.trumpWinner);
         console.log(`Phase 2 bidding starts with ${this.trumpWinner} (player index: ${this.currentBidder})`);
         
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
            console.error(`${player} must bid at least ${this.minimumTakes} as trump winner`);
            return;
        }
        
        this.phase2Bids[player] = takes;
        console.log(`${player} predicts ${takes} takes`);
          
          // Update Phase 2 bid display immediately
          this.updatePhase2BidDisplay(player, takes);
          
          // Force immediate DOM update
          this.forceDisplayUpdate();
        
        // Update display immediately after bid
        this.updateDisplay();
        
          // Check if all players have now bid
          const allPlayersBid = this.players.every(p => this.phase2Bids[p] !== null && this.phase2Bids[p] !== undefined);
          
          if (allPlayersBid) {
              console.log('All players have bid in Phase 2, moving to Phase 3...');
              // Small delay to show the final bid before transitioning
              setTimeout(() => this.startPhase3(), 1000);
              return;
          }
          
          // Move to next player in clockwise order
        this.currentBidder = (this.currentBidder + 1) % 4;
          console.log(`Phase 2 bidding: ${player} -> ${this.players[this.currentBidder]} (clockwise)`);
        
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
             console.log(`${player} adjusted bid from ${takes} to avoid total of 13`);
         }
        
        console.log(`${player} Phase 2 bid: ${takes} (min: ${minBid}, max: ${maxBid}, current total: ${currentTotal})`);
        this.makePhase2Bid(player, takes);
    }

    calculateSmartPhase2Bid(player, handStrength, currentTotal, minBid, maxBid) {
        // Smart Phase 2 bidding based on actual trick-taking potential with declared trump
        
        const hand = this.hands[player];
        let trickEstimate = 0;
        
        console.log(`Calculating Phase 2 bid for ${player} with trump: ${this.trumpSuit}`);
        
        // 1. Count guaranteed/likely winners based on declared trump
        
        // High cards in non-trump suits (Aces and protected Kings)
        ['clubs', 'diamonds', 'hearts', 'spades'].forEach(suit => {
            if (suit !== this.trumpSuit) {
                const suitCards = hand.filter(card => card.suit === suit);
                const aces = suitCards.filter(card => card.rank === 'A').length;
                const kings = suitCards.filter(card => card.rank === 'K').length;
                const queens = suitCards.filter(card => card.rank === 'Q').length;
                
                // Aces in side suits are almost guaranteed tricks
                trickEstimate += aces * 0.9;
                
                // Kings: more valuable if protected or in long suits
                if (suitCards.length >= 3) {
                    trickEstimate += kings * 0.7; // Protected kings
                } else {
                    trickEstimate += kings * 0.4; // Unprotected kings
                }
                
                // Queens only count in long suits
                if (suitCards.length >= 4) {
                    trickEstimate += queens * 0.3;
                }
                
                // Long suit potential (can establish lower cards)
                if (suitCards.length >= 6) {
                    trickEstimate += (suitCards.length - 5) * 0.4; // Extra tricks from length
                }
            }
        });
        
        // 2. Trump suit analysis (most important for trick-taking)
        if (this.trumpSuit !== 'notrump') {
            const trumpCards = hand.filter(card => card.suit === this.trumpSuit);
            const trumpCount = trumpCards.length;
            
            if (trumpCount > 0) {
                const trumpAces = trumpCards.filter(card => card.rank === 'A').length;
                const trumpKings = trumpCards.filter(card => card.rank === 'K').length;
                const trumpQueens = trumpCards.filter(card => card.rank === 'Q').length;
                const trumpJacks = trumpCards.filter(card => card.rank === 'J').length;
                
                // Trump honors are very valuable
                trickEstimate += trumpAces * 1.0; // Trump ace is guaranteed
                trickEstimate += trumpKings * 0.8; // Trump king is very likely
                trickEstimate += trumpQueens * 0.5; // Trump queen is decent
                trickEstimate += trumpJacks * 0.3; // Trump jack has some value
                
                // Trump length gives ruffing power
                if (trumpCount >= 4) {
                    trickEstimate += (trumpCount - 3) * 0.4; // Extra trumps for ruffing
                } else if (trumpCount <= 2) {
                    trickEstimate -= 0.5; // Penalty for short trump
                }
                
                console.log(`${player} has ${trumpCount} trumps with ${trumpAces} aces, ${trumpKings} kings`);
            } else {
                // No trump cards - penalty
                trickEstimate -= 1;
                console.log(`${player} has NO trump cards - risky!`);
            }
        } else {
            // No trump game - balanced high cards are key
            console.log(`No trump game - evaluating balanced strength`);
            if (handStrength.maxLength <= 4 && handStrength.score >= 25) {
                trickEstimate += 1; // Bonus for balanced strong hand
            }
        }
        
        // 3. Adjust based on overall hand quality
        if (handStrength.score >= 30) {
            trickEstimate += 0.5; // Strong hand bonus
        } else if (handStrength.score < 15) {
            trickEstimate -= 0.5; // Weak hand penalty
        }
        
        // 4. Trump winner must bid realistically but at least their minimum
        if (player === this.trumpWinner) {
            trickEstimate = Math.max(trickEstimate, this.minimumTakes - 0.5);
            console.log(`${player} is trump winner, minimum bid: ${this.minimumTakes}`);
        }
        
        // 5. Convert to whole number and apply caps
        let baseBid = Math.round(trickEstimate);
        
        // Conservative caps but allow reasonable bids
        baseBid = Math.max(0, Math.min(7, baseBid)); // 0-7 range
        
        // Avoid bidding 0 unless hand is truly terrible
        if (baseBid === 0 && handStrength.score >= 10) {
            baseBid = 1; // Even weak hands should try for 1 trick
        }
        
        // Small strategic randomness (±1 occasionally)
        if (Math.random() < 0.2) {
            const adjustment = Math.random() < 0.5 ? -1 : 1;
            baseBid = Math.max(0, Math.min(7, baseBid + adjustment));
        }
        
        console.log(`${player} estimates ${trickEstimate.toFixed(1)} tricks, bidding ${baseBid}`);
        
        return Math.max(minBid, Math.min(maxBid, baseBid));
    }

    startPhase3() {
        console.log('=== STARTING PHASE 3 ===');
        this.currentPhase = 'phase3';
        this.hidePhase2Interface();
        this.updateDisplay();
         
         // Calculate if this will be an Over or Under hand
         const totalBids = Object.values(this.phase2Bids).reduce((sum, bid) => sum + (bid || 0), 0);
         this.handType = totalBids > 13 ? 'over' : 'under';
         console.log(`Hand type: ${this.handType} (total bids: ${totalBids})`);
        
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
            this.botPlayCard();
        }
    }

    enableCardSelection() {
        console.log('Enabling card selection for human player');
        const cards = document.querySelectorAll('#south-cards .card');
        
        // Remove any existing click handlers and add new ones
        cards.forEach(card => {
            // Remove existing listeners by cloning the element
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // Add click handler to the new card
            newCard.addEventListener('click', () => this.onCardClick(newCard));
            newCard.style.cursor = 'pointer';
        });
        
        console.log(`${cards.length} cards are now clickable`);
    }

    onCardClick(cardElement) {
        // Get the card data from the element's content using correct selectors
        const cardRankElement = cardElement.querySelector('.card-rank');
        const cardSuitElement = cardElement.querySelector('.card-center-suit');
        
        if (!cardRankElement || !cardSuitElement) {
            console.error('Could not find rank or suit elements in clicked card');
            console.log('Card element structure:', cardElement.innerHTML);
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
            console.log('Available cards:', hand.map(c => `${c.rank} of ${c.suit}`));
            return;
        }
        
        console.log(`Player clicked on ${cardRank} of ${cardSuit} (index ${cardIndex})`);
        this.playCard('south', cardIndex);
    }

    playCard(player, cardIndex) {
        const hand = this.hands[player];
        if (cardIndex >= hand.length) return;
        
        const card = hand[cardIndex];
        
        // Validate card play according to Israeli Whist rules
        if (!this.isValidCardPlay(player, card)) {
            console.error(`Invalid card play: ${player} cannot play ${card.rank}${this.getSuitSymbol(card.suit)}`);
            if (player === 'south') {
                alert('You must follow suit if you can!');
            }
            return;
        }
        
        console.log(`${player} plays ${card.rank}${this.getSuitSymbol(card.suit)}`);
        
        // Add card to current trick
        this.currentTrick.push({ player, card });
        
        // Remove card from hand
        console.log(`${player} had ${hand.length} cards, removing ${card.rank}${this.getSuitSymbol(card.suit)}`);
        hand.splice(cardIndex, 1);
        console.log(`${player} now has ${hand.length} cards remaining`);
        
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
            setTimeout(() => this.completeTrick(), 1000);
        } else {
        // Move to next player
            setTimeout(() => this.nextPlayerInTrick(), 500);
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
        
        console.log(`Card ${card.rank}${this.getSuitSymbol(card.suit)} displayed on table for ${player}`);
    }
     
    completeTrick() {
        // Determine trick winner according to Israeli Whist rules
        const winner = this.determineTrickWinner();
        this.tricksWon[winner]++;
        this.tricksPlayed++;
        
        console.log(`Trick ${this.tricksPlayed} won by ${winner}. Cards: ${this.currentTrick.map(c => `${c.player}: ${c.card.rank}${this.getSuitSymbol(c.card.suit)}`).join(', ')}`);
        
        // Update the winner's trick count display immediately
        this.updateTrickCount(winner);
        
        // Update round display immediately after trick completion
        this.updateDisplay();
        
        // Animate cards moving to winner
        this.animateCardsToWinner(winner);
        
        // Check if all 13 tricks have been played
        if (this.tricksPlayed >= 13) {
            console.log('=== PHASE 3 COMPLETE ===');
            console.log('All 13 tricks completed, calculating scores...');
            this.currentPhase = 'scoring';
            this.updateDisplay();
            setTimeout(() => this.endHand(), 3000);
            return;
        }
        
        // Set trick leader to the winner for next trick
        this.trickLeader = this.players.indexOf(winner);
        this.currentTrick = [];
        
        console.log(`Next trick will be led by ${winner}`);
        
        // Start next trick after animation completes
        setTimeout(() => {
            if (this.trickLeader === 2) { // South (human player)
                this.enableCardSelection();
            } else {
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
        console.log(`Animating cards to ${winner}'s name`);
        
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
            setTimeout(() => this.clearPlayedCards(), 1500);
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
            
            console.log(`Human player card display updated: ${this.hands.south.length} cards remaining`);
            
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

    nextPlayerInTrick() {
         // Move to next player in clockwise order
         const lastPlayer = this.currentTrick[this.currentTrick.length - 1].player;
         const lastPlayerIndex = this.players.indexOf(lastPlayer);
         const nextPlayerIndex = (lastPlayerIndex + 1) % 4; // Clockwise progression
        const nextPlayerName = this.players[nextPlayerIndex];
         
         console.log(`Trick progression: ${lastPlayer} -> ${nextPlayerName} (clockwise)`);
        
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
        
        // Smart card selection that follows suit rules
        let cardIndex = this.selectValidBotCard(playerName);
        
        this.playCard(playerName, cardIndex);
    }
    
    selectValidBotCard(player) {
        const hand = this.hands[player];
        
        // If this is the first card of the trick, any card is valid
        if (this.currentTrick.length === 0) {
            return 0; // Play first card
        }
        
        // Get the lead suit
        const leadSuit = this.currentTrick[0].card.suit;
        
        // First, try to find a card of the lead suit
        for (let i = 0; i < hand.length; i++) {
            if (hand[i].suit === leadSuit) {
                return i; // Play first card of lead suit
            }
        }
        
        // If no cards of lead suit, can play any card
        return 0; // Play first available card
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
        
         // Position the animation directly above the player's name
        const playerInfo = document.querySelector(`.${player}-player`);
        let animationTop = '50%';
        let animationLeft = '50%';
        
        if (playerInfo) {
            const rect = playerInfo.getBoundingClientRect();
            const gameBoardRect = document.querySelector('.game-board').getBoundingClientRect();
            
             // Position above the player name (not the entire panel)
             // Look for the player name element specifically
             const playerNameElement = playerInfo.querySelector('.player-name') || 
                                     playerInfo.querySelector('[class*="name"]') ||
                                     playerInfo.querySelector('h3') ||
                                     playerInfo.querySelector('h4');
             
             if (playerNameElement) {
                 const nameRect = playerNameElement.getBoundingClientRect();
                 // Position above the player name with smaller offset
                 animationTop = `${nameRect.top - gameBoardRect.top - 40}px`;
                 animationLeft = `${nameRect.left - gameBoardRect.left + nameRect.width / 2}px`;
             } else {
                 // Fallback: position above the player info panel with smaller offset
                 animationTop = `${rect.top - gameBoardRect.top - 60}px`;
            animationLeft = `${rect.left - gameBoardRect.left + rect.width / 2}px`;
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
            z-index: 1000;
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
        // Update each player's score display in the Total Score panel
        this.players.forEach(player => {
            const scoreElement = document.getElementById(`${player}-total-score`);
            if (scoreElement) {
                scoreElement.textContent = this.scores[player];
            } else {
                console.warn(`Could not find score element for ${player}: ${player}-total-score`);
            }
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
         console.log(`Updating Phase 2 bid display for ${player}: ${takes}`);
         
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
                
                // Update status
                const statusElement = document.getElementById('prediction-status');
                if (statusElement) {
                    if (currentTotal === 13) {
                        statusElement.textContent = '⚠️ equals 13!';
                        statusElement.style.color = '#FF6B6B';
                    } else if (currentTotal > 13) {
                        statusElement.textContent = 'over';
                        statusElement.style.color = '#FF6B6B';
                    } else if (currentTotal < 13) {
                        statusElement.textContent = 'under';
                        statusElement.style.color = '#4CAF50';
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
        console.log('Refreshing all Phase 2 bid displays...');
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
            console.log(`${player} bid span:`, bidSpan);
            if (bidSpan) {
                console.log(`${player} bid span text:`, bidSpan.textContent);
            }
        });
        
        // Check Phase 2 interface
        const phase2Interface = document.querySelector('.second-phase-bidding');
        console.log('Phase 2 interface:', phase2Interface);
        if (phase2Interface) {
            console.log('Phase 2 interface display:', phase2Interface.style.display);
        }
        
        // Additional debugging for Phase 2 bid updates
        console.log('=== PHASE 2 BID UPDATE DEBUG ===');
        this.players.forEach(player => {
            console.log(`${player}: phase2Bids[${player}] = ${this.phase2Bids[player]} (type: ${typeof this.phase2Bids[player]})`);
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
                
                // Check if bid is valid (higher than current highest bid)
                const currentHighestBid = this.getCurrentHighestBid();
                if (currentHighestBid) {
                    if (this.selectedTricks < currentHighestBid.minTakes) {
                        alert(`Your bid must be at least ${currentHighestBid.minTakes} takes (current highest bid).`);
                        return;
                    }
                    if (this.selectedTricks === currentHighestBid.minTakes) {
                        const currentSuitRank = this.getSuitRank(currentHighestBid.trumpSuit);
                        const selectedSuitRank = this.getSuitRank(this.selectedSuit);
                        if (selectedSuitRank <= currentSuitRank) {
                            alert(`With ${this.selectedTricks} takes, you need a higher ranking trump suit than ${currentHighestBid.trumpSuit}.`);
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
        
        // Phase 2 trick buttons
        const trickButtons = document.querySelectorAll('.trick-btn');
        trickButtons.forEach(button => {
            button.addEventListener('click', () => {
                const takes = parseInt(button.getAttribute('data-value'), 10);
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
        });

        // More button for additional trick options
        const moreBtn = document.getElementById('more-tricks-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', () => {
                const extraButtons = document.getElementById('tricks-buttons-extra');
                const mainButtons = document.querySelector('.tricks-buttons-main');
                if (extraButtons && mainButtons) {
                    // Add expanded class to both containers for unified grid layout
                    mainButtons.classList.add('expanded');
                    extraButtons.classList.add('expanded');
                    
                    // Add expanded class to parent container for unified grid
                    const parentContainer = mainButtons.closest('.tricks-prediction');
                    if (parentContainer) {
                        parentContainer.classList.add('expanded');
                    }
                    
                    // Show the extra buttons
                    extraButtons.style.display = 'grid';
                    // Hide the More button after clicking it
                    moreBtn.style.display = 'none';
                    
                    // Ensure proper grid layout by forcing reflow
                    mainButtons.offsetHeight;
                    extraButtons.offsetHeight;
                }
            });
        }
        
        // Hint button - refresh Phase 2 displays
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => {
                if (this.currentPhase === 'phase2') {
                    this.refreshAllPhase2Displays();
                    console.log('Hint button: Refreshed Phase 2 displays');
                } else {
                    console.log('Hint button: Not in Phase 2, current phase:', this.currentPhase);
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
        
        // Hide bidding interface after pass
        this.hideBiddingInterface();
        
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
         // Move to next player in clockwise order, skipping those who have passed
        do {
            this.currentBidder = (this.currentBidder + 1) % 4;
        } while (this.playersPassed[this.players[this.currentBidder]]);
        
        const player = this.players[this.currentBidder];
         console.log(`Phase 1 bidding: next player is ${player} (clockwise progression)`);
        
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
            console.log(`${player} has already passed, moving to next player`);
            setTimeout(() => {
                this.currentBidder = (this.currentBidder + 1) % 4;
                this.nextPhase1Bidder();
            }, 500);
            return;
        }
        
        // Get current highest bid to determine if we need to bid higher
        const currentHighestBid = this.getCurrentHighestBid();
        console.log(`${player} evaluating bid. Current highest bid:`, currentHighestBid);
        
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
            
            // Strategic decision: Check if we want the same trump suit as the current bid
            const ourBestSuit = this.getBestTrumpSuit(player, handStrength);
            
            if (ourBestSuit === currentSuit) {
                // We want the same trump - should pass and raise in Phase 2 if this trump wins
                console.log(`${player} wants same trump (${currentSuit}) as current bid - passing to raise in Phase 2`);
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
                    // Can't bid higher or bid is not valid
                    console.log(`${player} cannot bid higher than current bid, passing`);
                    shouldPass = true;
                }
            }
        } else {
            // No current bid, evaluate whether we should make an opening bid
            if (handStrength.score >= 15) { // Lowered from 20 to 15 for much more aggressive opening bids
                const openingBid = this.calculateSmartOpeningBid(player, handStrength);
                
                // Check if this opening bid would duplicate an existing bid
                const currentHighestBid = this.getCurrentHighestBid();
                if (currentHighestBid && !this.isBidHigher(openingBid, currentHighestBid)) {
                    console.log(`${player} opening bid would not be higher than current bid, passing instead`);
                    shouldPass = true;
                } else {
                    this.phase1Bids[player] = openingBid;
                    console.log(`${player} bids ${openingBid.minTakes} ${openingBid.trumpSuit}`);
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
        
        // Show the bidding interface for the human player
        console.log('About to call showBiddingInterface');
        this.showBiddingInterface();
        console.log('showBiddingInterface called');
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
        console.log(`calculateHigherBid called with: currentBidValue=${currentBidValue}, currentSuit=${currentSuit} for ${player}`);
        const suits = ['clubs', 'diamonds', 'hearts', 'spades', 'notrump'];
        const currentSuitRank = suits.indexOf(currentSuit);
        
        // Evaluate hand strength for different trump options
        const handStrength = this.evaluateHandStrength(player);
        const hand = this.hands[player];
        
        // Option 1: Higher number in same suit (always valid if within limits)
        if (currentBidValue < 8 && currentBidValue + 1 < 13) {
            const sameSuitBid = {
                minTakes: currentBidValue + 1,
                trumpSuit: currentSuit
            };
            
            // Check if this player can actually support this bid
            if (this.canSupportBid(player, sameSuitBid)) {
                console.log(`Bot can bid higher in same suit:`, sameSuitBid);
                return sameSuitBid;
            }
        }
        
        // Option 2: Same number in higher-ranking suit (only if we have strong suit support)
        for (let i = currentSuitRank + 1; i < suits.length; i++) {
            const higherSuit = suits[i];
            
            // Never allow bids of 13
            if (currentBidValue >= 13) continue;
            
            const higherSuitBid = {
                minTakes: currentBidValue,
                trumpSuit: higherSuit
            };
            
            // More strict requirements for bidding same tricks in higher suit
            // Need both good suit support AND strong overall hand
            if (this.canSupportBid(player, higherSuitBid) && 
                this.hasSuitStrength(player, higherSuit) && 
                handStrength.score >= 20) { // Require stronger hand for this type of bid
                console.log(`Bot can bid in higher suit:`, higherSuitBid);
                return higherSuitBid;
            }
        }
        
        // Option 3: Higher number in higher suit (double escalation - most aggressive)
        if (currentBidValue < 7 && currentBidValue + 1 < 13) {
            for (let i = currentSuitRank + 1; i < suits.length; i++) {
                const higherSuit = suits[i];
                const higherBothBid = {
                    minTakes: currentBidValue + 1,
                    trumpSuit: higherSuit
                };
                
                // Most strict requirements for double escalation
                if (this.canSupportBid(player, higherBothBid) && 
                    this.hasSuitStrength(player, higherSuit) && 
                    handStrength.score >= 25) { // Require very strong hand
                    console.log(`Bot can bid higher tricks in higher suit:`, higherBothBid);
                    return higherBothBid;
                }
            }
        }
        
        // Can't bid higher
        console.log(`Bot cannot bid higher than ${currentBidValue} ${currentSuit}`);
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
        
        // Count cards by suit and calculate high card points
        hand.forEach(card => {
            // Add null check for individual cards
            if (!card || typeof card !== 'object') {
                console.warn('Invalid card found in hand:', card);
                return; // Skip this card
            }
            
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
        
                          // Realistic bonuses for long suits and distribution
         if (maxLength >= 5) score += 3; // Long suit bonus (reduced from 4)
         if (maxLength >= 6) score += 2; // Very long suit bonus (reduced from 3)
         if (maxLength >= 7) score += 1; // Extremely long suit bonus (reduced from 2)
         
         // Distribution bonus - more conservative
        const shortSuits = Object.values(suitCounts).filter(count => count <= 2).length;
         if (shortSuits >= 2) score += 2; // Short suit bonus (reduced from 3)
         
         // Strategic bonuses - more realistic
         if (suitCounts[longestSuit] >= 4 && score >= 18) {
             score += 1; // Reduced bonus for having a long suit with decent high cards
         }
         
         // Bonus for having multiple honors in the same suit - more realistic
         const honorsInLongestSuit = hand.filter(card => 
             card.suit === longestSuit && 
             ['A', 'K', 'Q', 'J'].includes(card.rank)
         ).length;
         if (honorsInLongestSuit >= 2) score += 1; // Reduced from 2
         
         // Penalty for very unbalanced hands
         if (maxLength >= 8) score -= 1; // Too long suits can be a liability
         if (shortSuits >= 3) score -= 1; // Too many short suits is bad
        
        return { score, longestSuit, suitCounts, maxLength };
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
        let trumpSuit = handStrength.longestSuit;
        
        // Analyze trump suitability more carefully
        // hand is already declared above
        const suitCounts = handStrength.suitCounts;
        
        // Check for strong suits (4+ cards with honors)
        let bestSuit = null;
        let bestSuitScore = 0;
        
        ['clubs', 'diamonds', 'hearts', 'spades'].forEach(suit => {
            const suitCards = hand.filter(card => card.suit === suit);
            const suitLength = suitCards.length;
            const honors = suitCards.filter(card => ['A', 'K', 'Q', 'J'].includes(card.rank)).length;
            
            // Score based on length and honors
            let suitScore = 0;
            if (suitLength >= 4) suitScore += suitLength;
            if (suitLength >= 5) suitScore += 2; // Bonus for 5+ cards
            if (suitLength >= 6) suitScore += 3; // Bonus for 6+ cards
            suitScore += honors * 2; // Honor cards are important
            
            if (suitScore > bestSuitScore) {
                bestSuitScore = suitScore;
                bestSuit = suit;
            }
        });
        
        // Choose trump suit
        if (bestSuitScore >= 8 && suitCounts[bestSuit] >= 5) {
            // Strong long suit - use as trump
            trumpSuit = bestSuit;
        } else if (handStrength.score >= 28 && handStrength.maxLength <= 4) {
            // Balanced hand with high cards - consider no trump
            trumpSuit = 'notrump';
        } else if (handStrength.maxLength >= 5) {
            // Use longest suit as trump
            trumpSuit = handStrength.longestSuit;
        } else {
            // Weak hand - default to longest suit or clubs
            trumpSuit = handStrength.longestSuit || 'clubs';
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
        // Much more realistic bidding thresholds - most bots should pass more often
        if (handStrength.score < 15) return false; // Need decent hand to bid
        
        // Don't bid if we're already at a high level (7+ tricks)
        if (potentialBid.minTakes >= 8) return false; // Cap at 7 tricks
        
        // Don't bid if the current bid is already quite high
        if (currentHighestBid && currentHighestBid.minTakes >= 7) {
            // Only bid over 7 with exceptional hands
            if (handStrength.score < 35) return false;
        }
        
        // If bidding same tricks in higher suit, be more conservative
        if (potentialBid.minTakes === currentHighestBid.minTakes && 
            potentialBid.trumpSuit !== currentHighestBid.trumpSuit) {
            // Need stronger hand to justify same tricks in higher suit
            if (handStrength.score < 25) return false;
            // Also reduce probability even with strong hands
            if (handStrength.score >= 25) {
                return Math.random() < 0.40; // Lower probability for same tricks
            }
        }
        
        // Strong hands - bid with confidence but not always
        if (handStrength.score >= 32) {
            return Math.random() < 0.70; // Reduced from 0.80
        }
        
        // Good hands - moderate probability to bid
        if (handStrength.score >= 26) {
            return Math.random() < 0.50; // Reduced from 0.65
        }
        
        // Moderate hands - lower probability
        if (handStrength.score >= 20) {
            return Math.random() < 0.30; // Reduced from 0.45
        }
        
        // Weak hands - low probability, need trump support
        if (handStrength.score >= 15) {
            // Check for trump support if applicable
            if (currentHighestBid && currentHighestBid.trumpSuit !== 'notrump') {
                const trumpCards = this.hands[player].filter(card => card.suit === currentHighestBid.trumpSuit).length;
                if (trumpCards >= 3) {
                    return Math.random() < 0.15; // Reduced from 0.25
                }
            }
            return Math.random() < 0.10; // Reduced from 0.15
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
         this.handType = null;
        
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
         console.log('=== ENDING HAND & CALCULATING SCORES ===');
         console.log(`Final trick counts: ${Object.entries(this.tricksWon).map(([p, t]) => `${p}: ${t}`).join(', ')}`);
         
         // Calculate scores for each player
         this.players.forEach(player => {
             const bid = this.phase2Bids[player];
             const tricks = this.tricksWon[player];
             
             if (bid === 0) {
                 // Special scoring for zero bids
                 const score = this.calculateZeroBidScore(player, tricks);
                 this.scores[player] += score;
                 console.log(`${player}: bid 0, won ${tricks} tricks, score: ${score} (total: ${this.scores[player]})`);
             } else {
                 // Regular scoring
                 const score = this.calculateScore(player, bid, tricks);
                 this.scores[player] += score;
                 console.log(`${player}: bid ${bid}, won ${tricks} tricks, score: ${score} (total: ${this.scores[player]})`);
             }
         });
         
         // Update the score table display immediately
         this.updateScoresDisplay();
         
         // Check for game winner (first to reach 100 points)
         const winner = this.players.find(player => this.scores[player] >= 100);
         if (winner) {
             console.log(`🎉 ${winner.toUpperCase()} WINS THE GAME with ${this.scores[winner]} points!`);
             alert(`🎉 ${winner.toUpperCase()} WINS THE GAME with ${this.scores[winner]} points!`);
             this.resetForNewGame();
         } else {
             // Continue to next hand - increment game number and show deal button
             console.log('No winner yet, continuing to next hand...');
             this.currentRound++;
             this.showDealButtonForNextHand();
             setTimeout(() => this.resetForNewHand(), 2000);
         }
     }
     
     resetForNewGame() {
         console.log('=== RESETTING FOR NEW GAME ===');
         this.scores = { north: 0, east: 0, south: 0, west: 0 };
         this.currentRound = 1;
         this.resetForNewHand();
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
         
         console.log('Debug methods available:');
         console.log('- debugPhase2Bids() - Check Phase 2 bid state');
         console.log('- refreshPhase2Displays() - Refresh all Phase 2 displays');
         console.log('- forceUpdate() - Force immediate display update');
         console.log('- testBidUpdate(player, takes) - Test updating a specific player\'s bid');
    } catch (error) {
        console.error('Error initializing game:', error);
    }
});
