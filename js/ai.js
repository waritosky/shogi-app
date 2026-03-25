import {
  applyMoveToState,
  cloneBoard,
  cloneHands,
  enemyOf,
  evaluateBoardLikeHuman,
  findKing,
  generateLegalMoves,
  isCheck,
  isCheckmate,
  isSquareAttacked,
  pieceValue
} from "./game.js";

function quickMoveScore(state, move, owner) {
  const board = cloneBoard(state.board);
  const hands = cloneHands(state.hands);

  let score = 0;

  if (move.kind === "move") {
    const target = board[move.ty][move.tx];
    if (target) score += (pieceValue[target.type] || 0) * 8;
    if (move.promote) score += 70;
  } else {
    if (move.type === "FU") score += 10;
    const enemyKing = findKing(board, enemyOf(owner));
    if (enemyKing) {
      const dist = Math.abs(enemyKing.x - move.x) + Math.abs(enemyKing.y - move.y);
      score += Math.max(0, 8 - dist) * 5;
    }
  }

  applyMoveToState(board, hands, move);

  if (isCheck(board, owner)) score += 120;
  score += evaluateBoardLikeHuman(board, hands, owner) * 0.02;

  return score + Math.random() * 0.01;
}

function orderedMoves(state, owner, limit = null) {
  const moves = generateLegalMoves(state.board, state.hands, owner)
    .map(move => ({
      move,
      orderScore: quickMoveScore(state, move, owner)
    }))
    .sort((a, b) => b.orderScore - a.orderScore)
    .map(item => item.move);

  return limit ? moves.slice(0, limit) : moves;
}

function applyToNewState(state, move) {
  const board = cloneBoard(state.board);
  const hands = cloneHands(state.hands);
  applyMoveToState(board, hands, move);
  return {
    ...state,
    board,
    hands,
    turn: enemyOf(state.turn)
  };
}

function terminalScore(state, cpuOwner) {
  const enemy = enemyOf(cpuOwner);

  if (isCheckmate(state.board, state.hands, enemy)) return 999999;
  if (isCheckmate(state.board, state.hands, cpuOwner)) return -999999;

  return null;
}

function minimax(state, depth, maximizingPlayer, cpuOwner) {
  const terminal = terminalScore(state, cpuOwner);
  if (terminal !== null) return terminal;

  if (depth === 0) {
    return evaluateBoardLikeHuman(state.board, state.hands, cpuOwner);
  }

  const owner = maximizingPlayer ? cpuOwner : enemyOf(cpuOwner);
  const limit = depth >= 3 ? 20 : 28;
  const moves = orderedMoves({ ...state, turn: owner }, owner, limit);

  if (moves.length === 0) {
    return evaluateBoardLikeHuman(state.board, state.hands, cpuOwner);
  }

  if (maximizingPlayer) {
    let best = -Infinity;
    for (const move of moves) {
      const next = applyToNewState({ ...state, turn: owner }, move);
      const score = minimax(next, depth - 1, false, cpuOwner);
      if (score > best) best = score;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    const next = applyToNewState({ ...state, turn: owner }, move);
    const score = minimax(next, depth - 1, true, cpuOwner);
    if (score < best) best = score;
  }
  return best;
}

function alphaBeta(state, depth, alpha, beta, maximizingPlayer, cpuOwner) {
  const terminal = terminalScore(state, cpuOwner);
  if (terminal !== null) return terminal;

  if (depth === 0) {
    return evaluateBoardLikeHuman(state.board, state.hands, cpuOwner);
  }

  const owner = maximizingPlayer ? cpuOwner : enemyOf(cpuOwner);
  const limit = depth >= 3 ? 24 : 36;
  const moves = orderedMoves({ ...state, turn: owner }, owner, limit);

  if (moves.length === 0) {
    return evaluateBoardLikeHuman(state.board, state.hands, cpuOwner);
  }

  if (maximizingPlayer) {
    let value = -Infinity;
    for (const move of moves) {
      const next = applyToNewState({ ...state, turn: owner }, move);
      value = Math.max(value, alphaBeta(next, depth - 1, alpha, beta, false, cpuOwner));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Infinity;
  for (const move of moves) {
    const next = applyToNewState({ ...state, turn: owner }, move);
    value = Math.min(value, alphaBeta(next, depth - 1, alpha, beta, true, cpuOwner));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

export function chooseBestCpuMove(state, level) {
  const cpuOwner = "gote";
  const myMoves = orderedMoves(state, cpuOwner, 30);
  if (myMoves.length === 0) return null;

  let bestMove = myMoves[0];
  let bestScore = -Infinity;

  for (const move of myMoves) {
    const next = applyToNewState({ ...state, turn: cpuOwner }, move);

    if (isCheckmate(next.board, next.hands, "sente")) {
      return move;
    }

    let score;
    if (level === "2ply") {
      score = minimax(next, 1, false, cpuOwner);
    } else if (level === "3ply") {
      score = minimax(next, 2, false, cpuOwner);
    } else {
      score = alphaBeta(next, 3, -Infinity, Infinity, false, cpuOwner);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}