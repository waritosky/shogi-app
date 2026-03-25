import {
  PROMOTED_PIECES,
  applyMoveToState,
  canMove,
  cloneBoard,
  cloneHands,
  createInitialState,
  enemyOf,
  findKing,
  generateLegalMoves,
  inPromotionZone,
  isCheck,
  isCheckmate,
  isLegalDrop,
  isLegalMove,
  isSquareAttacked,
  mustPromote,
  pieceValue,
  pieces
} from "./rules.js";

export {
  PROMOTED_PIECES,
  applyMoveToState,
  cloneBoard,
  cloneHands,
  createInitialState,
  enemyOf,
  findKing,
  generateLegalMoves,
  inPromotionZone,
  isCheck,
  isCheckmate,
  isLegalDrop,
  isLegalMove,
  isSquareAttacked,
  mustPromote,
  pieceValue,
  pieces
};

export function evaluateBoardLikeHuman(board, hands, perspective) {
  let score = 0;

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (!p) continue;

      let v = pieceValue[p.type] || 0;

      if (p.type !== "OU") {
        const centerBonus = 4 - Math.abs(4 - x);
        v += centerBonus * 4;

        if (p.owner === "gote") {
          v += y * 3;
        } else {
          v += (8 - y) * 3;
        }
      }

      score += p.owner === perspective ? v : -v;
    }
  }

  for (const owner of ["sente", "gote"]) {
    for (const type of hands[owner]) {
      const v = Math.floor((pieceValue[type] || 0) * 0.9);
      score += owner === perspective ? v : -v;
    }
  }

  if (isCheck(board, perspective)) score += 60;
  if (isCheck(board, enemyOf(perspective))) score -= 60;

  const myKing = findKing(board, perspective);
  const enemyKing = findKing(board, enemyOf(perspective));

  if (myKing && isSquareAttacked(board, myKing.x, myKing.y, enemyOf(perspective))) {
    score -= 120;
  }
  if (enemyKing && isSquareAttacked(board, enemyKing.x, enemyKing.y, perspective)) {
    score += 80;
  }

  return score;
}

export function getLegalTargetsForSelection(state) {
  if (state.gameOver || state.cpuThinking || state.turn !== "sente") return [];

  const targets = [];

  if (state.selected) {
    const allMoves = generateLegalMoves(state.board, state.hands, state.turn).filter(
      move => move.kind === "move" && move.sx === state.selected.x && move.sy === state.selected.y
    );
    for (const move of allMoves) {
      targets.push(`${move.tx},${move.ty}`);
    }
  }

  if (state.selectedFromHand) {
    const allDrops = generateLegalMoves(state.board, state.hands, state.turn).filter(
      move => move.kind === "drop" && move.type === state.selectedFromHand
    );
    for (const move of allDrops) {
      targets.push(`${move.x},${move.y}`);
    }
  }

  return targets;
}

export function tryHumanDrop(state, x, y) {
  const move = {
    kind: "drop",
    type: state.selectedFromHand,
    x,
    y,
    owner: state.turn
  };

  if (!isLegalDrop(state.board, state.hands, move, state.turn)) {
    return false;
  }

  applyMoveToState(state.board, state.hands, move);
  state.lastMove = { from: null, to: { x, y } };
  return true;
}

export function tryHumanMove(state, sx, sy, tx, ty) {
  const piece = state.board[sy][sx];
  if (!piece || piece.owner !== state.turn) return false;
  if (!canMove(state.board, sx, sy, tx, ty)) return false;

  const rule = pieces[piece.type];
  const canPromote = !!rule.promote && (inPromotionZone(state.turn, sy) || inPromotionZone(state.turn, ty));
  const forcePromote = mustPromote(piece.type, state.turn, ty);

  let move = null;

  if (forcePromote) {
    const forcedMove = { kind: "move", sx, sy, tx, ty, promote: true, owner: state.turn };
    if (isLegalMove(state.board, state.hands, forcedMove, state.turn)) {
      move = forcedMove;
    }
  } else if (canPromote) {
    const normalMove = { kind: "move", sx, sy, tx, ty, promote: false, owner: state.turn };
    const promoteMove = { kind: "move", sx, sy, tx, ty, promote: true, owner: state.turn };

    const normalLegal = isLegalMove(state.board, state.hands, normalMove, state.turn);
    const promoteLegal = isLegalMove(state.board, state.hands, promoteMove, state.turn);

    if (!normalLegal && !promoteLegal) return false;

    if (normalLegal && promoteLegal) {
      const promote = confirm("成りますか？");
      move = promote ? promoteMove : normalMove;
    } else {
      move = promoteLegal ? promoteMove : normalMove;
    }
  } else {
    const normalMove = { kind: "move", sx, sy, tx, ty, promote: false, owner: state.turn };
    if (isLegalMove(state.board, state.hands, normalMove, state.turn)) {
      move = normalMove;
    }
  }

  if (!move) return false;

  applyMoveToState(state.board, state.hands, move);
  state.lastMove = {
    from: { x: sx, y: sy },
    to: { x: tx, y: ty }
  };

  return true;
}