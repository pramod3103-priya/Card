import { createDeck, shuffleDeck, dealPhasedBatches, sortHand } from './Deck.js';
import { normalizeSuit, getPradhanSuitConfig } from '../config/pradhanConfig.js';

export const VALID_TRUMP_SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
export const BIDDING_TURN_TIMEOUT_MS = 10000;

export const DEFAULT_BIDDING_CONFIG = {
  minOpeningBids: {
    first_bidding: 5,   // First bidding stage begins after 5 cards: opening bid of 5 or more
    second_bidding: 8,  // After second deal (9 cards), bidding can reach 8 or higher
    final_bidding: 10,  // After final deal (13 cards), bidding can reach 10 or higher
  },
  minIncrement: 1,      // If a player bids 5, next valid higher bid must be at least 6 (+1 min)
  maxBid: 13,           // 13 tricks in standard 52-card deal
  defaultTrumpOnAllPass: 'Spades', // "If everyone passes and no player wins the auction, Spades automatically becomes the default trump suit."
  allowPass: true,
};

export const GAME_STAGES = [
  'waiting_for_players', // Stage 1: Waiting for players
  'first_deal',          // Stage 2: First deal: 5 cards per player
  'first_bidding',       // Stage 3: First bidding stage
  'second_deal',         // Stage 4: Second deal: 4 additional cards per player (9 total)
  'second_bidding',      // Stage 5: Second bidding stage
  'final_deal',          // Stage 6: Final deal: 4 additional cards per player (13 total)
  'final_bidding',       // Stage 7: Final bidding stage
  'ready_to_play',       // Stage 8: Ready to start card play
];

export const STAGE_METADATA = {
  waiting_for_players: { index: 1, label: 'Waiting for Players', cardsPerPlayer: 0 },
  first_deal: { index: 2, label: 'First Deal (5 Cards)', cardsPerPlayer: 5 },
  first_bidding: { index: 3, label: 'First Bidding Stage', cardsPerPlayer: 5 },
  second_deal: { index: 4, label: 'Second Deal (9 Cards)', cardsPerPlayer: 9 },
  second_bidding: { index: 5, label: 'Second Bidding Stage', cardsPerPlayer: 9 },
  final_deal: { index: 6, label: 'Final Deal (13 Cards)', cardsPerPlayer: 13 },
  final_bidding: { index: 7, label: 'Final Bidding Stage', cardsPerPlayer: 13 },
  ready_to_play: { index: 8, label: 'Ready to Start Card Play', cardsPerPlayer: 13 },
};

export class GameState {
  /**
   * @param {string} roomCode
   * @param {number} gameTarget 31 | 41 | 51
   */
  constructor(roomCode, gameTarget = 31) {
    this.roomCode = roomCode;
    this.gameTarget = [31, 41, 51].includes(Number(gameTarget)) ? Number(gameTarget) : 31;
    this.stage = 'waiting_for_players';
    this.dealerSeatIndex = 0; // Seat 0 (South / Host) is dealer initially
    this.firstBidderSeatIndex = 1; // Default: clockwise next to dealer (dealer bids last)
    this.currentBidderSeatIndex = null;
    this.biddingTurnDeadlineAt = null;
    this.biddingTurnId = 0;
    this.dealtAt = null;

    // Batches prepared from 52-card deck
    this.batches = null;

    // Active private hands for Seat 0, 1, 2, 3
    this.privateHands = [[], [], [], []];

    // Pradhan / Trump Suit
    this.trumpSuit = null; // 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades'
    this.trumpSelectedBy = null; // Seat index or 'default_all_passed'
    this.pradhanSuit = null;
    this.pradhanSelectedBy = null;

    // Bidding State across the 3 progressive stages
    this.bidding = {
      highestBid: null,              // Number (e.g. 5, 6, 8, 10...)
      highestBidderSeatIndex: null,  // 0, 1, 2, 3
      winningBid: null,              // Final winning bid amount
      winningBidderSeatIndex: null,  // Seat index of winning bidder
      bidsHistory: [],               // [{ stage, seatIndex, action: 'bid'|'pass', amount, timestamp }]
      stageBidsCount: 0,             // Number of turns taken in current stage (0 to 4)
      biddingStageComplete: false,   // True when all 4 players have acted in current stage
      auctionComplete: false,        // True when final bidding finishes
      awaitingTrumpSelection: false, // True when winning bidder must choose trump
      playerBids: [null, null, null, null], // Independent bids for each player (0-3)
      flexibleIncreasePhase: false,  // Special PRO CARD rule: active when all 4 players have bid 10
      flexibleTurnSeatIndex: null,   // Current seat answering whether to increase bid
      flexibleIncreasesCount: 0,     // Count of players who increased bid (>10)
      flexibleCompletedCount: 0,     // Count of players who have responded (0-4)
      flexibleResponses: [null, null, null, null], // Responses for each seat
    };

    // Configurable bidding thresholds and pass rules
    this.biddingConfig = {
      minOpeningBids: {
        first_bidding: DEFAULT_BIDDING_CONFIG.minOpeningBids.first_bidding,
        second_bidding: DEFAULT_BIDDING_CONFIG.minOpeningBids.second_bidding,
        final_bidding: DEFAULT_BIDDING_CONFIG.minOpeningBids.final_bidding,
      },
      minIncrement: DEFAULT_BIDDING_CONFIG.minIncrement,
      maxBid: DEFAULT_BIDDING_CONFIG.maxBid,
      defaultTrumpOnAllPass: DEFAULT_BIDDING_CONFIG.defaultTrumpOnAllPass,
      allowPass: DEFAULT_BIDDING_CONFIG.allowPass,
    };

    // Placeholders reserved for Phase 2 gameplay rules
    this.currentTurnSeatIndex = null;
    this.trickCards = [null, null, null, null];
    this.currentTrick = {
      leadSeatIndex: null,
      leadSuit: null,
    };
    this.tricksWon = [0, 0, 0, 0];
    this.lastTrickResult = null; // { winnerSeatIndex, winningCard, cards }
    this.trickHistory = [];
    this.scores = [0, 0, 0, 0];
    this.currentRoundNumber = 1;
    this.roundHistory = [];
    this.matchOver = false;
    this.matchWinnerSeatIndex = null;
  }

  /**
   * Updates configurable bidding rules.
   * @param {object} customConfig
   */
  setBiddingConfig(customConfig = {}) {
    if (customConfig.minOpeningBids && typeof customConfig.minOpeningBids === 'object') {
      this.biddingConfig.minOpeningBids = {
        ...this.biddingConfig.minOpeningBids,
        ...customConfig.minOpeningBids,
      };
    }
    if (typeof customConfig.minIncrement === 'number' && customConfig.minIncrement >= 1) {
      this.biddingConfig.minIncrement = Math.floor(customConfig.minIncrement);
    }
    if (typeof customConfig.maxBid === 'number' && customConfig.maxBid >= 1 && customConfig.maxBid <= 13) {
      this.biddingConfig.maxBid = Math.floor(customConfig.maxBid);
    }
    if (VALID_TRUMP_SUITS.includes(customConfig.defaultTrumpOnAllPass)) {
      this.biddingConfig.defaultTrumpOnAllPass = customConfig.defaultTrumpOnAllPass;
    }
    if (typeof customConfig.allowPass === 'boolean') {
      this.biddingConfig.allowPass = customConfig.allowPass;
    }
  }

  /**
   * Submits a bid for the active player.
   * Strictly enforces:
   * - Turn order (active bidder)
   * - Minimum opening bid for the stage (Stage 1: >=5, Stage 2: >=8, Stage 3: >=10)
   * - Must be strictly higher than current highest bid (+ minIncrement)
   * - Dealer gets the last opportunity in the sequence
   * @param {number} seatIndex
   * @param {number} amount
   */
  placeBid(seatIndex, amount) {
    if (!this.isBiddingStage()) {
      throw new Error(`Cannot bid during stage "${this.stage}". Bidding must be active.`);
    }

    const seat = Number(seatIndex);
    if (seat !== this.currentBidderSeatIndex) {
      throw new Error(`Not your turn to bid. Current turn is Seat ${this.currentBidderSeatIndex + 1}.`);
    }
    this._assertBiddingTurnNotExpired();

    const bidVal = Number(amount);
    if (!Number.isInteger(bidVal)) {
      throw new Error('Bid amount must be an integer.');
    }

    const minOpening = this.biddingConfig.minOpeningBids[this.stage] ?? 5;
    const currentHighest = this.bidding.highestBid;

    // Opening bid check
    if (currentHighest === null) {
      if (bidVal < minOpening) {
        throw new Error(`Opening bid for ${this.stage} must be at least ${minOpening}.`);
      }
    } else {
      // Must be higher than current highest bid
      if (bidVal <= currentHighest) {
        throw new Error(`Bid (${bidVal}) must be strictly higher than current highest bid (${currentHighest}).`);
      }
      if (bidVal - currentHighest < this.biddingConfig.minIncrement) {
        throw new Error(`Minimum bid increment is ${this.biddingConfig.minIncrement}.`);
      }
    }

    if (bidVal > this.biddingConfig.maxBid) {
      throw new Error(`Bid cannot exceed maximum limit of ${this.biddingConfig.maxBid}.`);
    }

    // Record bid
    this.bidding.highestBid = bidVal;
    this.bidding.highestBidderSeatIndex = seat;
    this.bidding.bidsHistory.push({
      stage: this.stage,
      seatIndex: seat,
      action: 'bid',
      amount: bidVal,
      timestamp: Date.now(),
    });

    this._advanceBiddingTurn();

    return {
      success: true,
      highestBid: this.bidding.highestBid,
      highestBidderSeatIndex: this.bidding.highestBidderSeatIndex,
      winningBid: this.bidding.winningBid,
      winningBidderSeatIndex: this.bidding.winningBidderSeatIndex,
      currentBidderSeatIndex: this.currentBidderSeatIndex,
      biddingStageComplete: this.bidding.biddingStageComplete,
      auctionComplete: this.bidding.auctionComplete,
      awaitingTrumpSelection: this.bidding.awaitingTrumpSelection,
      trumpSuit: this.trumpSuit,
    };
  }

  /**
   * Passes the active player's bidding turn.
   * @param {number} seatIndex
   */
  passBid(seatIndex, { allowExpired = false } = {}) {
    if (!this.isBiddingStage()) {
      throw new Error(`Cannot pass during stage "${this.stage}". Bidding must be active.`);
    }

    const seat = Number(seatIndex);
    if (seat !== this.currentBidderSeatIndex) {
      throw new Error(`Not your turn to pass. Current turn is Seat ${this.currentBidderSeatIndex + 1}.`);
    }
    if (!allowExpired) this._assertBiddingTurnNotExpired();

    if (!this.biddingConfig.allowPass) {
      throw new Error('Passing is disabled by current bidding configuration.');
    }

    this.bidding.bidsHistory.push({
      stage: this.stage,
      seatIndex: seat,
      action: 'pass',
      amount: null,
      timestamp: Date.now(),
    });

    this._advanceBiddingTurn();

    return {
      success: true,
      highestBid: this.bidding.highestBid,
      highestBidderSeatIndex: this.bidding.highestBidderSeatIndex,
      winningBid: this.bidding.winningBid,
      winningBidderSeatIndex: this.bidding.winningBidderSeatIndex,
      currentBidderSeatIndex: this.currentBidderSeatIndex,
      biddingStageComplete: this.bidding.biddingStageComplete,
      auctionComplete: this.bidding.auctionComplete,
      awaitingTrumpSelection: this.bidding.awaitingTrumpSelection,
      trumpSuit: this.trumpSuit,
    };
  }

  /**
   * Advances the turn clockwise to the next bidder in the order.
   * Dealer is position 4 (last opportunity in the bidding order).
   * @private
   */
  _advanceBiddingTurn() {
    this.bidding.stageBidsCount++;
    const order = this.getBiddingOrder();

    if (this.bidding.stageBidsCount < 4) {
      // Step to next player in clockwise bidding order
      const nextSeat = order[this.bidding.stageBidsCount];
      this._startBiddingTurn(nextSeat);
      this.bidding.biddingStageComplete = false;
    } else {
      // All 4 players (including dealer who was last) have completed this bidding round!
      this.bidding.biddingStageComplete = true;
      this.currentBidderSeatIndex = null;
      this.biddingTurnDeadlineAt = null;
      this.biddingTurnId++;
      this.currentTurnSeatIndex = null;

      // If this was the final bidding stage (after 13 cards), conclude auction
      if (this.stage === 'final_bidding') {
        this.bidding.auctionComplete = true;

        if (this.bidding.highestBidderSeatIndex !== null) {
          // Winning bidder gets to choose trump
          this.bidding.winningBid = this.bidding.highestBid;
          this.bidding.winningBidderSeatIndex = this.bidding.highestBidderSeatIndex;
          this.bidding.awaitingTrumpSelection = true;
          this.currentTurnSeatIndex = this.bidding.winningBidderSeatIndex;
        } else {
          // "If everyone passes and no player wins the auction, Spades automatically becomes the default trump suit."
          this.bidding.winningBid = null;
          this.bidding.winningBidderSeatIndex = null;
          this.bidding.awaitingTrumpSelection = false;
          this.trumpSuit = this.biddingConfig.defaultTrumpOnAllPass; // 'Spades'
          this.trumpSelectedBy = 'default_all_passed';
          this.stage = 'ready_to_play';
        }
      }
    }
  }

  _startBiddingTurn(seatIndex) {
    this.currentBidderSeatIndex = seatIndex;
    this.currentTurnSeatIndex = seatIndex;
    this.biddingTurnDeadlineAt = Date.now() + BIDDING_TURN_TIMEOUT_MS;
    this.biddingTurnId++;
  }

  _assertBiddingTurnNotExpired() {
    if (this.biddingTurnDeadlineAt !== null && Date.now() >= this.biddingTurnDeadlineAt) {
      throw new Error('Bidding turn has expired.');
    }
  }

  /**
   * Triggers the special PRO CARD rule: when all 4 players have bid 10.
   * Asks each player independently whether they want to increase their bid by ANY amount or pass.
   */
  triggerAllPlayersBid10() {
    this.stage = 'final_bidding';
    this.bidding.playerBids = [10, 10, 10, 10];
    this.bidding.highestBid = 10;
    this.bidding.flexibleIncreasePhase = true;
    this.bidding.flexibleIncreasesCount = 0;
    this.bidding.flexibleCompletedCount = 0;
    this.bidding.flexibleResponses = [null, null, null, null];

    const order = this.getBiddingOrder();
    this.bidding.flexibleTurnSeatIndex = order[0];
    this._startBiddingTurn(order[0]);

    return this.getPublicState();
  }

  /**
   * Handles a player's independent bid increase during the Flexible Bid Increase Phase.
   * A player can increase by ANY amount (e.g. 10 -> 11, 10 -> 12, 10 -> 13, 10 -> 15).
   * Increasing one player's bid NEVER changes another player's bid.
   *
   * @param {number} seatIndex
   * @param {number} amount
   */
  flexibleIncreaseBid(seatIndex, amount) {
    if (!this.bidding.flexibleIncreasePhase) {
      throw new Error('Flexible bid increase phase is not currently active.');
    }
    const seat = Number(seatIndex);
    if (seat !== this.bidding.flexibleTurnSeatIndex) {
      throw new Error(`Not your turn to act. Current turn is Seat ${this.bidding.flexibleTurnSeatIndex + 1}.`);
    }
    this._assertBiddingTurnNotExpired();

    const val = Number(amount);
    if (!Number.isFinite(val) || val <= 10) {
      throw new Error(`Increase amount (${amount}) must be greater than 10.`);
    }

    // Every player's bid is independent. ONLY update this player's bid:
    this.bidding.playerBids[seat] = val;
    this.bidding.flexibleIncreasesCount++;
    this.bidding.flexibleCompletedCount++;
    this.bidding.flexibleResponses[seat] = { action: 'increase', amount: val };
    this.bidding.bidsHistory.push({
      stage: 'flexible_increase',
      seatIndex: seat,
      action: 'increase',
      amount: val,
      timestamp: Date.now(),
    });

    this._advanceFlexibleTurn();

    return this.getPublicState();
  }

  /**
   * Handles a player's choice to PASS during the Flexible Bid Increase Phase.
   * Player's bid independently remains at 10.
   *
   * @param {number} seatIndex
   * @param {object} [options]
   * @param {boolean} [options.allowExpired=false]
   */
  flexiblePass(seatIndex, { allowExpired = false } = {}) {
    if (!this.bidding.flexibleIncreasePhase) {
      throw new Error('Flexible bid increase phase is not currently active.');
    }
    const seat = Number(seatIndex);
    if (seat !== this.bidding.flexibleTurnSeatIndex) {
      throw new Error(`Not your turn to act. Current turn is Seat ${this.bidding.flexibleTurnSeatIndex + 1}.`);
    }
    if (!allowExpired) this._assertBiddingTurnNotExpired();

    // Keep this player's bid at 10 independently
    this.bidding.playerBids[seat] = 10;
    this.bidding.flexibleCompletedCount++;
    this.bidding.flexibleResponses[seat] = { action: 'pass', amount: 10 };
    this.bidding.bidsHistory.push({
      stage: 'flexible_increase',
      seatIndex: seat,
      action: 'pass',
      amount: 10,
      timestamp: Date.now(),
    });

    this._advanceFlexibleTurn();

    return this.getPublicState();
  }

  /**
   * Advances clockwise to next player during flexible bid increase phase.
   * Concludes bidding when all 4 players have responded.
   * @private
   */
  _advanceFlexibleTurn() {
    const order = this.getBiddingOrder();

    if (this.bidding.flexibleCompletedCount < 4) {
      const nextSeat = order[this.bidding.flexibleCompletedCount];
      this.bidding.flexibleTurnSeatIndex = nextSeat;
      this._startBiddingTurn(nextSeat);
    } else {
      // All 4 players have independently chosen
      this.bidding.flexibleIncreasePhase = false;
      this.bidding.flexibleTurnSeatIndex = null;
      this.currentBidderSeatIndex = null;
      this.biddingTurnDeadlineAt = null;
      this.biddingTurnId++;

      if (this.bidding.flexibleIncreasesCount > 0) {
        // "8. If at least one player increases their bid, continue the game."
        const maxVal = Math.max(...this.bidding.playerBids);
        const winningSeat = this.bidding.playerBids.indexOf(maxVal);

        this.bidding.highestBid = maxVal;
        this.bidding.highestBidderSeatIndex = winningSeat;
        this.bidding.winningBid = maxVal;
        this.bidding.winningBidderSeatIndex = winningSeat;
        this.bidding.auctionComplete = true;
        this.bidding.awaitingTrumpSelection = true;
        this.currentTurnSeatIndex = winningSeat;
      } else {
        // "9. If all four players choose PASS and nobody increases their bid, end the bidding/game according to the existing game rules."
        this.bidding.auctionComplete = true;
        this.bidding.awaitingTrumpSelection = false;
        this.trumpSuit = this.biddingConfig.defaultTrumpOnAllPass; // 'Spades'
        this.trumpSelectedBy = 'default_all_passed';
        this.stage = 'ready_to_play';
        this.currentTurnSeatIndex = null;
      }
    }
  }

  /**
   * Allows the winning bidder to choose the Pradhan / Trump Suit.
   * Available suits: Hearts, Diamonds, Clubs, Spades.
   * Heart can also be selected as trump.
   * @param {number} seatIndex
   * @param {string} suit
   */
  chooseTrump(seatIndex, suit) {
    if (!this.bidding.awaitingTrumpSelection) {
      throw new Error('Game is not currently awaiting trump selection.');
    }

    const seat = Number(seatIndex);
    if (seat !== this.bidding.winningBidderSeatIndex) {
      throw new Error(`Only the auction winner (Seat ${this.bidding.winningBidderSeatIndex + 1}) can choose the trump suit.`);
    }

    const normalized = normalizeSuit(suit) || (
      typeof suit === 'string'
        ? suit.charAt(0).toUpperCase() + suit.slice(1).toLowerCase()
        : ''
    );

    if (!VALID_TRUMP_SUITS.includes(normalized)) {
      throw new Error(`Invalid trump suit "${suit}". Must be Hearts, Diamonds, Clubs, or Spades.`);
    }

    this.trumpSuit = normalized;
    this.trumpSelectedBy = seat;
    this.pradhanSuit = normalized;
    this.pradhanSelectedBy = seat;
    this.bidding.awaitingTrumpSelection = false;
    this.stage = 'ready_to_play';
    this.biddingTurnDeadlineAt = null;
    this.biddingTurnId++;
    this.currentTurnSeatIndex = null;

    const pradhanMeta = getPradhanSuitConfig(normalized);

    return {
      success: true,
      trumpSuit: this.trumpSuit,
      pradhanSuit: this.pradhanSuit,
      pradhanLabel: pradhanMeta.label,
      pradhanSymbol: pradhanMeta.symbol,
      winningBidderSeatIndex: this.bidding.winningBidderSeatIndex,
      winningBid: this.bidding.winningBid,
      stage: this.stage,
    };
  }

  /**
   * Alias for chooseTrump conforming to PRADHAN specification.
   */
  selectPradhan(seatIndex, suit) {
    return this.chooseTrump(seatIndex, suit);
  }

  /**
   * Returns the next clockwise seat (0 -> 1 -> 2 -> 3 -> 0).
   * @param {number} seatIndex
   * @returns {number}
   */
  getNextClockwiseSeat(seatIndex) {
    return (Number(seatIndex) + 1) % 4;
  }

  /**
   * Sets the dealer's seat index (0-3).
   * By default, synchronizes firstBidderSeatIndex to (seatIndex + 1) % 4
   * guaranteeing that dealer receives the last opportunity in clockwise order.
   * @param {number} seatIndex
   */
  setDealer(seatIndex) {
    const seat = Number(seatIndex);
    if (!Number.isInteger(seat) || seat < 0 || seat > 3) {
      throw new Error(`Invalid dealer seat index: ${seatIndex}. Must be 0, 1, 2, or 3.`);
    }
    this.dealerSeatIndex = seat;
    // Default: dealer's left starts bidding so dealer is last
    this.firstBidderSeatIndex = (seat + 1) % 4;

    // Update active bidder if currently in a bidding stage
    if (this.isBiddingStage()) {
      const order = this.getBiddingOrder();
      this._startBiddingTurn(order[0]);
    }
  }

  /**
   * Rotates dealer clockwise to the next seat: (dealer + 1) % 4.
   */
  rotateDealer() {
    this.setDealer((this.dealerSeatIndex + 1) % 4);
    return this.dealerSeatIndex;
  }

  /**
   * Configures the starting bidder seat index.
   * Allows the first bidder to be configurable until starting-seat rule is finalized.
   * If keepDealerLast is true, dealer seat is automatically aligned to (firstBidder + 3) % 4.
   * @param {number} seatIndex
   * @param {boolean} keepDealerLast
   */
  setFirstBidder(seatIndex, keepDealerLast = false) {
    const seat = Number(seatIndex);
    if (!Number.isInteger(seat) || seat < 0 || seat > 3) {
      throw new Error(`Invalid first bidder seat index: ${seatIndex}. Must be 0, 1, 2, or 3.`);
    }
    this.firstBidderSeatIndex = seat;

    if (keepDealerLast) {
      // Position dealer so they are guaranteed to bid last (4th) in clockwise order
      this.dealerSeatIndex = (seat + 3) % 4;
    }

    if (this.isBiddingStage()) {
      const order = this.getBiddingOrder();
      this._startBiddingTurn(order[0]);
    }
  }

  /**
   * Calculates the clockwise bidding order array of 4 seat indices.
   * Sequence starts at firstBidderSeatIndex and proceeds clockwise.
   * In default configuration, dealer is position 4 (last opportunity).
   * @returns {number[]} [1stBidder, 2ndBidder, 3rdBidder, 4thBidder]
   */
  getBiddingOrder() {
    const firstBidder = this.firstBidderSeatIndex !== null && this.firstBidderSeatIndex !== undefined
      ? this.firstBidderSeatIndex
      : (this.dealerSeatIndex + 1) % 4;

    return [
      firstBidder,
      (firstBidder + 1) % 4,
      (firstBidder + 2) % 4,
      (firstBidder + 3) % 4,
    ];
  }

  /**
   * Checks whether the current stage is a bidding stage.
   * @returns {boolean}
   */
  isBiddingStage() {
    return (
      this.stage === 'first_bidding' ||
      this.stage === 'second_bidding' ||
      this.stage === 'final_bidding'
    );
  }

  /**
   * Initializes the 52-card deck into the 3 dealing batches (20 + 16 + 16 cards).
   */
  initializeDeckBatches() {
    const rawDeck = createDeck();
    const shuffled = shuffleDeck(rawDeck);
    this.batches = dealPhasedBatches(shuffled);
  }

  /**
   * Starts a new game: shuffles deck and executes Stage 2 (First deal: 5 cards each).
   */
  startNewGame() {
    this.initializeDeckBatches();
    return this.setStage('first_deal');
  }

  /**
   * Updates hands to match the given stage.
   * @param {string} targetStage
   */
  setStage(targetStage) {
    if (!GAME_STAGES.includes(targetStage)) {
      throw new Error(`Invalid stage: ${targetStage}`);
    }

    if (!this.batches && targetStage !== 'waiting_for_players') {
      this.initializeDeckBatches();
    }

    this.stage = targetStage;
    this.dealtAt = Date.now();

    // Update active bidder / turn during bidding stages
    if (this.isBiddingStage()) {
      this.bidding.stageBidsCount = 0;
      this.bidding.biddingStageComplete = false;
      const order = this.getBiddingOrder();
      this._startBiddingTurn(order[0]);
    } else {
      this.currentBidderSeatIndex = null;
      this.biddingTurnDeadlineAt = null;
      this.biddingTurnId++;
      if (this.stage === 'ready_to_play') {
        this.currentTurnSeatIndex = this.bidding.winningBidderSeatIndex ?? 0;
        this.trickCards = [null, null, null, null];
        this.currentTrick = { leadSeatIndex: null, leadSuit: null };
      } else if (!this.bidding.awaitingTrumpSelection) {
        this.currentTurnSeatIndex = null;
      }
    }

    // Assign appropriate card counts based on stage
    if (this.stage === 'waiting_for_players') {
      this.privateHands = [[], [], [], []];
    } else if (this.stage === 'first_deal' || this.stage === 'first_bidding') {
      // 5 cards each
      this.privateHands = this.batches.batch1.map((hand) => sortHand(hand));
    } else if (this.stage === 'second_deal' || this.stage === 'second_bidding') {
      // 5 + 4 = 9 cards each
      this.privateHands = this.batches.batch1.map((b1, seat) =>
        sortHand([...b1, ...this.batches.batch2[seat]])
      );
    } else {
      // 5 + 4 + 4 = 13 cards each (Stages 6, 7, 8)
      this.privateHands = this.batches.batch1.map((b1, seat) =>
        sortHand([...b1, ...this.batches.batch2[seat], ...this.batches.batch3[seat]])
      );
    }

    return {
      hands: this.privateHands,
      publicState: this.getPublicState(),
    };
  }

  /**
   * Advances sequentially to the next stage in the 8-stage sequence.
   */
  advanceStage() {
    const currentIndex = GAME_STAGES.indexOf(this.stage);
    if (currentIndex === -1 || currentIndex >= GAME_STAGES.length - 1) {
      // Loop back or stay at ready_to_play
      return this.setStage('first_deal');
    }
    const nextStage = GAME_STAGES[currentIndex + 1];
    return this.setStage(nextStage);
  }

  /**
   * Plays a card from a player's hand into the active trick.
   * @param {number} seatIndex Seat playing the card (0-3)
   * @param {string|object} cardIdentifier Card ID string, rank-suit string, or card object
   */
  playCard(seatIndex, cardIdentifier) {
    if (this.stage !== 'ready_to_play') {
      throw new Error(`Cards can only be played in stage "ready_to_play" (current stage: ${this.stage}).`);
    }

    const seat = Number(seatIndex);
    if (!Number.isInteger(seat) || seat < 0 || seat > 3) {
      throw new Error(`Invalid seat index: ${seatIndex}`);
    }

    // If the previous trick finished (all 4 slots filled), clear before starting new trick
    const currentCount = this.trickCards.filter(Boolean).length;
    if (currentCount === 4) {
      this.trickCards = [null, null, null, null];
      this.currentTrick.leadSeatIndex = null;
      this.currentTrick.leadSuit = null;
    }

    if (this.currentTurnSeatIndex === null) {
      this.currentTurnSeatIndex = this.bidding.winningBidderSeatIndex ?? 0;
    }

    if (this.currentTurnSeatIndex !== seat) {
      throw new Error(`Not your turn to play a card. Current turn is Seat ${this.currentTurnSeatIndex + 1}.`);
    }

    if (this.trickCards[seat] !== null) {
      throw new Error(`Seat ${seat + 1} has already played a card in this trick.`);
    }

    const hand = this.privateHands[seat];
    if (!hand || hand.length === 0) {
      throw new Error(`No cards available in Seat ${seat + 1} hand.`);
    }

    // Match card by ID or rank & suit
    const targetId =
      typeof cardIdentifier === 'object' && cardIdentifier !== null
        ? cardIdentifier.id || `${cardIdentifier.suit}-${cardIdentifier.rank}`
        : String(cardIdentifier);

    const cardIdx = hand.findIndex(
      (c) =>
        c.id === targetId ||
        `${c.suit}-${c.rank}`.toLowerCase() === targetId.toLowerCase() ||
        (typeof cardIdentifier === 'object' && c.rank === cardIdentifier.rank && c.suit === cardIdentifier.suit)
    );

    if (cardIdx === -1) {
      throw new Error('Card not found in player hand.');
    }

    const [playedCard] = hand.splice(cardIdx, 1);

    const playedCardEntry = {
      ...playedCard,
      seatIndex: seat,
      playedAt: Date.now(),
    };
    this.trickCards[seat] = playedCardEntry;

    // Check if lead card of the trick
    if (this.currentTrick.leadSeatIndex === null) {
      this.currentTrick.leadSeatIndex = seat;
      this.currentTrick.leadSuit = playedCard.suit;
    }

    let trickCompleted = false;
    let completedTrickData = null;
    let roundCompleted = false;
    let completedRoundData = null;

    // Check if trick is full (4 cards)
    const filledCount = this.trickCards.filter(Boolean).length;
    if (filledCount === 4) {
      const leadSuitNorm = (this.currentTrick.leadSuit || '').toUpperCase();
      const trumpSuitNorm = (this.trumpSuit || '').toUpperCase();

      let winningSeat = this.currentTrick.leadSeatIndex;
      let winningCard = this.trickCards[winningSeat];
      let highestValue = winningCard?.value || 0;
      let highestIsTrump = (winningCard?.suit || '').toUpperCase() === trumpSuitNorm;

      for (let s = 0; s < 4; s++) {
        const candidate = this.trickCards[s];
        if (!candidate) continue;
        const candidateSuitNorm = candidate.suit.toUpperCase();
        const candidateIsTrump = Boolean(trumpSuitNorm) && candidateSuitNorm === trumpSuitNorm;

        if (candidateIsTrump && !highestIsTrump) {
          winningSeat = s;
          winningCard = candidate;
          highestValue = candidate.value;
          highestIsTrump = true;
        } else if (candidateIsTrump && highestIsTrump) {
          if (candidate.value > highestValue) {
            winningSeat = s;
            winningCard = candidate;
            highestValue = candidate.value;
          }
        } else if (!highestIsTrump && candidateSuitNorm === leadSuitNorm) {
          if (candidate.value > highestValue) {
            winningSeat = s;
            winningCard = candidate;
            highestValue = candidate.value;
          }
        }
      }

      this.tricksWon[winningSeat] = (this.tricksWon[winningSeat] || 0) + 1;
      completedTrickData = {
        winnerSeatIndex: winningSeat,
        winningCard,
        cards: [...this.trickCards],
        leadSuit: this.currentTrick.leadSuit,
        trumpSuit: this.trumpSuit,
        completedAt: Date.now(),
      };
      this.lastTrickResult = completedTrickData;
      this.trickHistory.push(completedTrickData);

      // Trick winner leads the next trick
      this.currentTurnSeatIndex = winningSeat;
      trickCompleted = true;

      // Check if all 13 tricks in the round have been completed
      const totalTricks = this.tricksWon.reduce((a, b) => a + b, 0);
      if (totalTricks === 13) {
        roundCompleted = true;
        completedRoundData = this.evaluateRoundCompletion();
      }
    } else {
      // Advance to next clockwise player
      this.currentTurnSeatIndex = (seat + 1) % 4;
    }

    return {
      playedCard: playedCardEntry,
      seatIndex: seat,
      trickCompleted,
      completedTrickData,
      roundCompleted,
      completedRoundData,
      matchOver: this.matchOver,
      matchWinnerSeatIndex: this.matchWinnerSeatIndex,
      publicState: this.getPublicState(),
    };
  }

  /**
   * Concludes a 13-trick round, computes score deltas, records round history,
   * and checks if any player reached the match target score (31, 41, 51).
   */
  evaluateRoundCompletion() {
    const scoreDeltas = [0, 0, 0, 0];
    const winningBidder = this.bidding.winningBidderSeatIndex;
    const winningBid = this.bidding.winningBid;

    for (let s = 0; s < 4; s++) {
      const tricks = this.tricksWon[s] || 0;
      if (winningBidder !== null && winningBidder !== undefined && s === winningBidder) {
        // Winning bidder must achieve at least their declared bid
        if (tricks >= winningBid) {
          scoreDeltas[s] = tricks; // Made contract: scores tricks won
        } else {
          scoreDeltas[s] = -winningBid; // Failed contract: minus declared bid (MINUS rule)
        }
      } else {
        // Non-bidders (defenders or when all passed) score 1 point per trick won
        scoreDeltas[s] = tricks;
      }
      this.scores[s] = (this.scores[s] || 0) + scoreDeltas[s];
    }

    const roundRecord = {
      roundNumber: this.currentRoundNumber,
      trumpSuit: this.trumpSuit,
      trumpSelectedBy: this.trumpSelectedBy,
      pradhanSuit: this.trumpSuit,
      pradhanSelectedBy: this.trumpSelectedBy,
      pradhanConfig: this.trumpSuit ? getPradhanSuitConfig(this.trumpSuit) : null,
      winningBid: this.bidding.winningBid,
      winningBidderSeatIndex: this.bidding.winningBidderSeatIndex,
      playerBids: [...(this.bidding.playerBids || [null, null, null, null])],
      tricksWon: [...this.tricksWon],
      scoreDeltas,
      accumulatedScores: [...this.scores],
      completedAt: Date.now(),
    };
    this.roundHistory.push(roundRecord);

    // Check if any player has reached or exceeded gameTarget
    const target = this.gameTarget;
    const reachedTarget = this.scores.some((sc) => sc >= target);
    if (reachedTarget) {
      this.matchOver = true;
      const maxScore = Math.max(...this.scores);
      this.matchWinnerSeatIndex = this.scores.indexOf(maxScore);
    }

    return roundRecord;
  }

  /**
   * Advances to the next round if the match is not over.
   */
  advanceToNextRound() {
    if (this.matchOver) {
      return { success: false, error: 'Match is already concluded.' };
    }

    this.currentRoundNumber++;
    this.rotateDealer();
    this.tricksWon = [0, 0, 0, 0];
    this.trickCards = [null, null, null, null];
    this.currentTrick = { leadSeatIndex: null, leadSuit: null };
    this.lastTrickResult = null;
    this.trumpSuit = null;
    this.trumpSelectedBy = null;
    this.pradhanSuit = null;
    this.pradhanSelectedBy = null;
    this.currentTurnSeatIndex = null;
    this.currentBidderSeatIndex = null;
    this.biddingTurnDeadlineAt = null;
    this.biddingTurnId++;
    this.bidding = {
      highestBid: null,
      highestBidderSeatIndex: null,
      winningBid: null,
      winningBidderSeatIndex: null,
      bidsHistory: [],
      stageBidsCount: 0,
      biddingStageComplete: false,
      auctionComplete: false,
      awaitingTrumpSelection: false,
      playerBids: [null, null, null, null],
      flexibleIncreasePhase: false,
      flexibleTurnSeatIndex: null,
      flexibleIncreasesCount: 0,
      flexibleCompletedCount: 0,
      flexibleResponses: [null, null, null, null],
    };

    this.initializeDeckBatches();
    return this.setStage('first_deal');
  }

  /**
   * Resets the entire match (scores, round history, match status) for "Play Again".
   */
  resetMatch() {
    this.scores = [0, 0, 0, 0];
    this.tricksWon = [0, 0, 0, 0];
    this.trickHistory = [];
    this.roundHistory = [];
    this.currentRoundNumber = 1;
    this.matchOver = false;
    this.matchWinnerSeatIndex = null;
    this.trickCards = [null, null, null, null];
    this.currentTrick = { leadSeatIndex: null, leadSuit: null };
    this.lastTrickResult = null;
    this.trumpSuit = null;
    this.trumpSelectedBy = null;
    this.pradhanSuit = null;
    this.pradhanSelectedBy = null;
    this.currentTurnSeatIndex = null;
    this.currentBidderSeatIndex = null;
    this.biddingTurnDeadlineAt = null;
    this.biddingTurnId++;
    this.dealerSeatIndex = 0;
    this.firstBidderSeatIndex = 1;
    this.bidding = {
      highestBid: null,
      highestBidderSeatIndex: null,
      winningBid: null,
      winningBidderSeatIndex: null,
      bidsHistory: [],
      stageBidsCount: 0,
      biddingStageComplete: false,
      auctionComplete: false,
      awaitingTrumpSelection: false,
      playerBids: [null, null, null, null],
      flexibleIncreasePhase: false,
      flexibleTurnSeatIndex: null,
      flexibleIncreasesCount: 0,
      flexibleCompletedCount: 0,
      flexibleResponses: [null, null, null, null],
    };

    this.initializeDeckBatches();
    return this.setStage('first_deal');
  }

  /**
   * Clears the current trick cards from the table.
   */
  clearTrick() {
    this.trickCards = [null, null, null, null];
    this.currentTrick = { leadSeatIndex: null, leadSuit: null };
  }

  /**
   * Retrieves private cards for a specific seat index (0-3).
   * @param {number} seatIndex
   * @returns {Array} Array of cards or empty array
   */
  getPlayerHand(seatIndex) {
    if (seatIndex < 0 || seatIndex > 3) return [];
    return this.privateHands[seatIndex] || [];
  }

  /**
   * Resets table back to initial waiting stage.
   */
  reset() {
    this.stage = 'waiting_for_players';
    this.privateHands = [[], [], [], []];
    this.batches = null;
    this.dealtAt = null;
    this.trickCards = [null, null, null, null];
    this.trumpSuit = null;
    this.trumpSelectedBy = null;
    this.pradhanSuit = null;
    this.pradhanSelectedBy = null;
    this.currentTurnSeatIndex = null;
    this.currentBidderSeatIndex = null;
    this.biddingTurnDeadlineAt = null;
    this.biddingTurnId++;
    this.tricksWon = [0, 0, 0, 0];
    this.lastTrickResult = null;
    this.trickHistory = [];
    this.scores = [0, 0, 0, 0];
    this.currentRoundNumber = 1;
    this.roundHistory = [];
    this.matchOver = false;
    this.matchWinnerSeatIndex = null;
    this.bidding = {
      highestBid: null,
      highestBidderSeatIndex: null,
      winningBid: null,
      winningBidderSeatIndex: null,
      bidsHistory: [],
      stageBidsCount: 0,
      biddingStageComplete: false,
      auctionComplete: false,
      awaitingTrumpSelection: false,
    };
  }

  /**
   * Authoritative public state broadcasted to all players in the room.
   * STRICT SECURITY: Never includes any player's private card faces or ranks.
   */
  getPublicState() {
    const meta = STAGE_METADATA[this.stage] || STAGE_METADATA.waiting_for_players;
    const biddingOrder = this.getBiddingOrder();
    const isDealerLast = biddingOrder[3] === this.dealerSeatIndex;

    const minOpening = this.biddingConfig.minOpeningBids[this.stage] || 5;
    const minNextBid = this.bidding.highestBid !== null
      ? this.bidding.highestBid + this.biddingConfig.minIncrement
      : minOpening;

    return {
      stage: this.stage,
      stageIndex: meta.index, // 1 to 8
      stageLabel: meta.label,
      expectedCardsPerPlayer: meta.cardsPerPlayer, // 0, 5, 9, or 13
      dealerSeatIndex: this.dealerSeatIndex,
      firstBidderSeatIndex: this.firstBidderSeatIndex,
      biddingOrder, // [1st, 2nd, 3rd, 4th (Dealer)]
      dealerIsLast: isDealerLast,
      currentBidderSeatIndex: this.currentBidderSeatIndex,
      currentTurnSeatIndex: this.currentTurnSeatIndex,
      clockwiseSeats: [0, 1, 2, 3],
      gameTarget: this.gameTarget,
      dealtAt: this.dealtAt,
      serverTime: Date.now(),
      biddingTurnDeadlineAt: this.biddingTurnDeadlineAt,
      biddingTurnId: this.biddingTurnId,
      isDealt: meta.cardsPerPlayer > 0,
      handCounts: this.privateHands.map((h) => h.length),
      trickCards: this.trickCards,
      tricksWon: this.tricksWon,
      lastTrickResult: this.lastTrickResult,
      leadSuit: this.currentTrick?.leadSuit || null,
      trumpSuit: this.trumpSuit,
      trumpSelectedBy: this.trumpSelectedBy,
      pradhanSuit: this.trumpSuit,
      pradhanSelectedBy: this.trumpSelectedBy,
      pradhanConfig: this.trumpSuit ? getPradhanSuitConfig(this.trumpSuit) : null,
      scores: this.scores,
      currentRoundNumber: this.currentRoundNumber,
      roundHistory: this.roundHistory,
      trickHistory: this.trickHistory,
      matchOver: this.matchOver,
      matchWinnerSeatIndex: this.matchWinnerSeatIndex,
      bidding: {
        highestBid: this.bidding.highestBid,
        highestBidderSeatIndex: this.bidding.highestBidderSeatIndex,
        winningBid: this.bidding.winningBid,
        winningBidderSeatIndex: this.bidding.winningBidderSeatIndex,
        bidsHistory: this.bidding.bidsHistory,
        stageBidsCount: this.bidding.stageBidsCount,
        biddingStageComplete: this.bidding.biddingStageComplete,
        auctionComplete: this.bidding.auctionComplete,
        awaitingTrumpSelection: this.bidding.awaitingTrumpSelection,
        minOpeningBid: minOpening,
        minNextBid: minNextBid,
        maxBid: this.biddingConfig.maxBid,
        playerBids: this.bidding.playerBids,
        flexibleIncreasePhase: this.bidding.flexibleIncreasePhase,
        flexibleTurnSeatIndex: this.bidding.flexibleTurnSeatIndex,
        flexibleIncreasesCount: this.bidding.flexibleIncreasesCount,
        flexibleResponses: this.bidding.flexibleResponses,
      },
    };
  }
}
