import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { BiddingCountdownWidget } from './BiddingCountdownWidget';

export const BiddingPanel = ({ mySeatIndex }) => {
  const {
    roomState,
    placeBid,
    passBid,
    flexibleIncreaseBid,
    flexiblePass,
    advanceStage,
    player,
    serverTimeOffsetMs,
  } = useSocket();

  const gameState = roomState?.gameState || {};
  const bidding = gameState.bidding || {};
  const currentStage = gameState.stage;
  const isFlexiblePhase = Boolean(bidding.flexibleIncreasePhase);

  const isBiddingStage =
    currentStage === 'first_bidding' ||
    currentStage === 'second_bidding' ||
    currentStage === 'final_bidding' ||
    isFlexiblePhase;

  const isHost = Boolean(player?.isHost);

  // Active bidder calculation (Standard bidding vs Flexible Increase Phase)
  const activeBidderIndex = isFlexiblePhase
    ? bidding.flexibleTurnSeatIndex
    : gameState.currentBidderSeatIndex;

  const isMyTurn = activeBidderIndex !== null && activeBidderIndex !== undefined && activeBidderIndex === mySeatIndex;
  const activeSeat = activeBidderIndex !== null && activeBidderIndex !== undefined ? roomState?.seats[activeBidderIndex] : null;

  const activeCharacterId =
    activeSeat?.characterId || ['odi', 'putin', 'trampu', 'ironman'][activeBidderIndex ?? 0];
  const activeCharacterName = activeSeat?.playerName || 'Player';

  const minOpening =
    currentStage === 'first_bidding'
      ? 5
      : currentStage === 'second_bidding'
      ? 8
      : 10;

  const minNextBid = isFlexiblePhase ? 11 : (bidding.minNextBid || minOpening);
  const maxBid = isFlexiblePhase ? 25 : (bidding.maxBid || 13);
  const highestBid = bidding.highestBid;
  const highestBidderSeat =
    bidding.highestBidderSeatIndex !== null && roomState
      ? roomState.seats[bidding.highestBidderSeatIndex]
      : null;

  // Local state for selected bid amount & countdown
  const [selectedAmount, setSelectedAmount] = useState(minNextBid);
  const [submitting, setSubmitting] = useState(false);
  const [serverNow, setServerNow] = useState(() => Date.now() + (serverTimeOffsetMs || 0));

  const deadline = gameState.biddingTurnDeadlineAt;

  // Sync selected amount when minNextBid or active turn changes
  useEffect(() => {
    setSelectedAmount(minNextBid);
  }, [minNextBid, activeBidderIndex]);

  // Synchronized countdown ticker
  useEffect(() => {
    if (!Number.isFinite(deadline)) return undefined;

    const tick = () => setServerNow(Date.now() + (serverTimeOffsetMs || 0));
    tick();
    const timerId = setInterval(tick, 100);
    return () => clearInterval(timerId);
  }, [deadline, serverTimeOffsetMs]);

  if (!roomState || !isBiddingStage) return null;

  const secondsRemaining = Number.isFinite(deadline)
    ? Math.max(0, Math.ceil((deadline - serverNow) / 1000))
    : 10;

  const timeUpPassed = secondsRemaining === 0 && isMyTurn;

  const handleConfirmBid = async () => {
    if (submitting || !isMyTurn || secondsRemaining <= 0) return;
    try {
      setSubmitting(true);
      if (isFlexiblePhase) {
        await flexibleIncreaseBid(Number(selectedAmount));
      } else {
        await placeBid(Number(selectedAmount));
      }
    } catch (err) {
      // Toast handles error
    } finally {
      setSubmitting(false);
    }
  };

  const handlePass = async () => {
    if (submitting || !isMyTurn || secondsRemaining <= 0) return;
    try {
      setSubmitting(true);
      if (isFlexiblePhase) {
        await flexiblePass();
      } else {
        await passBid();
      }
    } catch (err) {
      // Toast handles error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BiddingCountdownWidget
      secondsRemaining={secondsRemaining}
      maxSeconds={10}
      characterId={activeCharacterId}
      characterName={activeCharacterName}
      isMyTurn={isMyTurn}
      stageLabel={isFlexiblePhase ? 'SPECIAL RULE: All 4 Players Bid 10' : (gameState.stageLabel || 'Bidding Stage')}
      minOpening={minOpening}
      minNextBid={minNextBid}
      maxBid={maxBid}
      highestBid={highestBid}
      highestBidderName={highestBidderSeat?.playerName}
      selectedAmount={selectedAmount}
      onAmountChange={setSelectedAmount}
      onConfirmBid={handleConfirmBid}
      onPass={handlePass}
      isFlexibleIncrease={isFlexiblePhase}
      submitting={submitting}
      isComplete={Boolean(bidding.biddingStageComplete)}
      onAdvance={advanceStage}
      isHost={isHost}
      timeUpPassed={timeUpPassed}
    />
  );
};
