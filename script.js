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
         
         // The updateDisplay() call above already calls updatePlayerInfoPanels()
         // which properly handles Phase 2 bid displays with "waiting..." for null values
         
         // Start Phase 2 bidding with trump winner
         // Then go clockwise (left) from there
         this.currentBidder = this.players.indexOf(this.trumpWinner);
         console.log(`Phase 2 bidding starts with ${this.trumpWinner} (player index: ${this.currentBidder})`);
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
            
            // Refresh all Phase 2 displays
            this.refreshAllPhase2Displays();
            
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
         
         // Update Phase 2 bid display immediately
         this.updatePhase2BidDisplay(player, takes);
         
         // Force immediate DOM update
         this.forceDisplayUpdate();
         
         // Update display immediately after bid
         this.updateDisplay();
         
         // Move to next player in clockwise order
         this.currentBidder = (this.currentBidder + 1) % 4;
         console.log(`Phase 2 bidding: ${player} -> ${this.players[this.currentBidder]} (clockwise)`);
         
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
         
         // Determine valid bid range - always allow bidding
         let minBid = 0;
         let maxBid = 13;
         
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
          // Base bid on hand strength - be more aggressive
          let baseBid = Math.floor(handStrength.score / 6); // Increased from /7 to /6 for even higher bids
          
          // Adjust based on trump suit
          if (this.trumpSuit !== 'notrump') {
              const trumpCards = this.hands[player].filter(card => card.suit === this.trumpSuit).length;
              if (trumpCards >= 4) baseBid += 1;
              if (trumpCards >= 6) baseBid += 1;
              if (trumpCards >= 5) baseBid += 1; // Additional bonus for 5+ trump cards
          }
          
          // Adjust based on current bidding situation
          if (currentTotal < 8) {
              // Early in bidding, be very aggressive
              baseBid = Math.min(maxBid, baseBid + 3); // Increased from +2 to +3
          } else if (currentTotal > 18) {
              // Late in bidding, still be aggressive
              baseBid = Math.max(minBid, baseBid + 1); // Added +1 instead of penalty
          }
          
          // Add some randomness to make bidding more interesting
          const randomAdjustment = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
          baseBid += randomAdjustment;
          
          // Ensure bid is within valid range and never returns 0 unless forced
          if (baseBid < minBid) baseBid = minBid;
          if (baseBid > maxBid) baseBid = maxBid;
          
          // Ensure we always have a valid bid
          if (baseBid < 0) baseBid = 0;
          if (baseBid > 13) baseBid = 13;
          
          return baseBid;
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
         
         // Check if this completes a trick
         if (this.currentTrick.length === 4) {
             this.completeTrick();
         } else {
             // Move to next player
             this.nextPlayerInTrick();
         }
     }
     
     completeTrick() {
         // Determine trick winner (simplified for now)
         const winner = this.currentTrick[0].player; // First player wins for now
         this.tricksWon[winner]++;
         this.tricksPlayed++;
         
         console.log(`Trick ${this.tricksPlayed} won by ${winner}`);
         
         // Check if all 13 tricks have been played
         if (this.tricksPlayed >= 13) {
             this.endHand();
             return;
         }
         
         // Start next trick
         this.trickLeader = this.players.indexOf(winner);
         this.currentTrick = [];
         
         if (this.trickLeader === 2) { // South (human player)
             this.enableCardSelection();
         } else {
             this.botPlayCard();
         }
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
         // Update each player's score display
         this.players.forEach(player => {
             const scoreElement = document.querySelector(`.${player}-player .player-score`);
             if (scoreElement) {
                 scoreElement.textContent = this.scores[player];
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
                if (this.currentPhase === 'phase2') {
                    if (this.phase2Bids[player] !== null && this.phase2Bids[player] !== undefined) {
                        // Show Phase 2 bid amount
                        bidSpan.textContent = `bid: ${this.phase2Bids[player]}`;
                        console.log(`Updated ${player} Phase 2 bid display to: ${this.phase2Bids[player]}`);
                    } else {
                        // Phase 2 but no bid yet - show waiting status
                        bidSpan.textContent = 'waiting...';
                        console.log(`Updated ${player} Phase 2 bid display to: waiting...`);
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
                 console.log(`Successfully updated ${player} bid display to: waiting...`);
             } else {
                 bidSpan.textContent = `bid: ${takes}`;
                 console.log(`Successfully updated ${player} bid display to: ${takes}`);
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
         console.log('Forcing display update...');
         
         // Update all Phase 2 bid displays immediately
         this.players.forEach(player => {
             const bidSpan = document.querySelector(`.${player}-player .player-bid`);
             if (bidSpan) {
                 if (this.phase2Bids[player] !== null && this.phase2Bids[player] !== undefined) {
                     bidSpan.textContent = `bid: ${this.phase2Bids[player]}`;
                     console.log(`Force updated ${player} bid display to: ${this.phase2Bids[player]}`);
                 } else {
                     bidSpan.textContent = 'waiting...';
                     console.log(`Force updated ${player} bid display to: waiting...`);
                 }
                 
                 // Force DOM update
                 bidSpan.offsetHeight;
             }
         });
         
         // Also update the Phase 2 interface
         this.updatePhase2Interface();
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
                        statusElement.textContent = '⚠️ Total equals 13!';
                        statusElement.style.color = '#FF6B6B';
                    } else if (currentTotal > 13) {
                        statusElement.textContent = '❌ Total exceeds 13!';
                        statusElement.style.color = '#FF6B6B';
                    } else {
                        statusElement.textContent = '✅ Valid total';
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
             
             // Be much more aggressive in competitive bidding - lower threshold for bidding higher
             if (potentialBid && (handStrength.score >= 14 || this.shouldBotBid(player, potentialBid, handStrength, currentHighestBid))) {
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
             if (handStrength.score >= 15) { // Lowered from 20 to 15 for much more aggressive opening bids
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
        
                 // Bonus for long suits and balanced distribution
         if (maxLength >= 5) score += 4; // Long suit bonus (increased from 3)
         if (maxLength >= 6) score += 3; // Very long suit bonus (increased from 2)
         if (maxLength >= 7) score += 2; // Extremely long suit bonus
         
         // Distribution bonus
         const shortSuits = Object.values(suitCounts).filter(count => count <= 2).length;
         if (shortSuits >= 2) score += 3; // Short suit bonus (increased from 2)
         
         // Additional strategic bonuses
         if (suitCounts[longestSuit] >= 4 && score >= 20) {
             score += 2; // Bonus for having a long suit with decent high cards
         }
         
         // Bonus for having multiple honors in the same suit
         const honorsInLongestSuit = hand.filter(card => 
             card.suit === longestSuit && 
             ['A', 'K', 'Q', 'J'].includes(card.rank)
         ).length;
         if (honorsInLongestSuit >= 2) score += 2;
         
         return { score, longestSuit, suitCounts, maxLength };
    }

                   calculateSmartOpeningBid(player, handStrength) {
          // More realistic opening bids based on hand strength
          let minTakes = 5; // Start with minimum bid (5 according to official rules)
          
          // Adjust based on hand strength - more aggressive
          if (handStrength.score >= 18) minTakes = 6;
          if (handStrength.score >= 22) minTakes = 7;
          if (handStrength.score >= 26) minTakes = 8;
          if (handStrength.score >= 30) minTakes = 9;
          if (handStrength.score >= 35) minTakes = 10;
         
         // Prefer the longest suit as trump
         let trumpSuit = handStrength.longestSuit;
         
         // Strategic trump selection
         if (handStrength.maxLength >= 6) {
             // Very long suit - prefer it as trump
             trumpSuit = handStrength.longestSuit;
         } else if (handStrength.score >= 25 && handStrength.maxLength <= 4) {
             // Balanced hand with high points - consider no trump
             trumpSuit = 'notrump';
         } else if (handStrength.suitCounts[handStrength.longestSuit] <= 3 && handStrength.score >= 22) {
             // Weak longest suit but decent points - consider no trump
             trumpSuit = 'notrump';
         }
         
         // Add some randomness to make bidding more interesting
         if (Math.random() < 0.3 && minTakes < 8) {
             minTakes += 1; // 30% chance to bid one higher
         }
         
         return { minTakes, trumpSuit };
     }

         shouldBotBid(player, potentialBid, handStrength, currentHighestBid) {
         // Much more aggressive bidding - lower thresholds significantly
         if (handStrength.score < 10) return false; // Lowered from 15
         
         // Don't bid if we're already at a very high level
         if (potentialBid.minTakes > 12) return false; // Increased from 11
         
         // Be very aggressive with strong hands
         if (handStrength.score >= 25) return true; // Lowered from 30
         
         // Be aggressive with moderate hands
         if (handStrength.score >= 18) {
             // 90% chance to bid with moderate hands (increased from 85%)
             return Math.random() < 0.9;
         }
         
         // Be more aggressive with weak hands
         if (handStrength.score >= 14) {
             // 80% chance to bid with weak hands (increased from 60%)
             return Math.random() < 0.8;
         }
         
         // Even consider bidding with very weak hands if we have a long suit
         if (handStrength.score >= 12 && handStrength.maxLength >= 5) {
             // 70% chance to bid with very weak hands if they have a long suit
             return Math.random() < 0.7;
         }
         
         // Add some randomness for very weak hands to create variety
         if (handStrength.score >= 10) {
             // 50% chance to bid with very weak hands just for variety
             return Math.random() < 0.5;
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
         console.log('=== ENDING HAND ===');
         
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
         
         // Check for game winner (first to reach 100 points)
         const winner = this.players.find(player => this.scores[player] >= 100);
         if (winner) {
             console.log(`🎉 ${winner.toUpperCase()} WINS THE GAME with ${this.scores[winner]} points!`);
             alert(`🎉 ${winner.toUpperCase()} WINS THE GAME with ${this.scores[winner]} points!`);
             this.resetForNewGame();
         } else {
             // Continue to next hand
             console.log('No winner yet, continuing to next hand...');
             setTimeout(() => this.resetForNewHand(), 2000);
         }
     }
     
     resetForNewGame() {
         console.log('=== RESETTING FOR NEW GAME ===');
         this.scores = { north: 0, east: 0, south: 0, west: 0 };
         this.currentRound = 1;
         this.resetForNewHand();
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
