export const PROMOTED_PIECES = ["TO", "NY", "NK", "NG", "UM", "RY"];

export const pieces = {
  FU: { name: "歩", move: [[0, -1]], promote: "TO" },
  KY: { name: "香", slide: [[0, -1]], promote: "NY" },
  KE: { name: "桂", move: [[-1, -2], [1, -2]], promote: "NK" },
  GI: { name: "銀", move: [[-1, -1], [0, -1], [1, -1], [-1, 1], [1, 1]], promote: "NG" },
  KI: { name: "金", move: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]] },
  KA: { name: "角", slide: [[1, 1], [-1, 1], [1, -1], [-1, -1]], promote: "UM" },
  HI: { name: "飛", slide: [[1, 0], [-1, 0], [0, 1], [0, -1]], promote: "RY" },
  OU: { name: "王", move: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] },

  TO: { name: "と", move: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]] },
  NY: { name: "杏", move: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]] },
  NK: { name: "圭", move: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]] },
  NG: { name: "全", move: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1]] },
  UM: {
    name: "馬",
    slide: [[1, 1], [-1, 1], [1, -1], [-1, -1]],
    move: [[1, 0], [-1, 0], [0, 1], [0, -1]]
  },
  RY: {
    name: "龍",
    slide: [[1, 0], [-1, 0], [0, 1], [0, -1]],
    move: [[1, 1], [-1, 1], [1, -1], [-1, -1]]
  }
};

export const pieceValue = {
  FU: 100,
  KY: 300,
  KE: 320,
  GI: 420,
  KI: 500,
  KA: 700,
  HI: 800,
  OU: 20000,
  TO: 520,
  NY: 500,
  NK: 500,
  NG: 500,
  UM: 900,
  RY: 1000
};

export function enemyOf(owner) {
  return owner === "sente" ? "gote" : "sente";
}

export function createEmptyBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(null));
}

export function cloneBoard(board) {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}

export function cloneHands(hands) {
  return {
    sente: [...hands.sente],
    gote: [...hands.gote]
  };
}

export function inPromotionZone(owner, y) {
  return owner === "sente" ? y <= 2 : y >= 6;
}

export function unpromote(type) {
  const map = { TO: "FU", NY: "KY", NK: "KE", NG: "GI", UM: "KA", RY: "HI" };
  return map[type] || type;
}

export function mustPromote(type, owner, ty) {
  if (type === "FU" || type === "KY") {
    return owner === "sente" ? ty === 0 : ty === 8;
  }
  if (type === "KE") {
    return owner === "sente" ? ty <= 1 : ty >= 7;
  }
  return false;
}

export function canDropOnRank(type, owner, y) {
  if (type === "FU" || type === "KY") {
    return owner === "sente" ? y !== 0 : y !== 8;
  }
  if (type === "KE") {
    return owner === "sente" ? y >= 2 : y <= 6;
  }
  return true;
}

export function findKing(board, owner) {
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.owner === owner && p.type === "OU") {
        return { x, y };
      }
    }
  }
  return null;
}

export function isNifu(board, x, owner) {
  for (let y = 0; y < 9; y++) {
    const p = board[y][x];
    if (p && p.owner === owner && p.type === "FU") {
      return true;
    }
  }
  return false;
}

export function canMove(board, sx, sy, tx, ty) {
  if (sx === tx && sy === ty) return false;

  const piece = board[sy][sx];
  if (!piece) return false;
  if (tx < 0 || tx > 8 || ty < 0 || ty > 8) return false;
  if (board[ty][tx] && board[ty][tx].owner === piece.owner) return false;

  const dx = tx - sx;
  const dy = piece.owner === "sente" ? ty - sy : sy - ty;
  const rule = pieces[piece.type];

  if (rule.move && rule.move.some(m => m[0] === dx && m[1] === dy)) {
    return true;
  }

  if (rule.slide) {
    for (const dir of rule.slide) {
      let x = sx + dir[0];
      let y = sy + (piece.owner === "sente" ? dir[1] : -dir[1]);

      while (x >= 0 && x < 9 && y >= 0 && y < 9) {
        if (x === tx && y === ty) return true;
        if (board[y][x]) break;
        x += dir[0];
        y += piece.owner === "sente" ? dir[1] : -dir[1];
      }
    }
  }

  return false;
}

export function isCheck(board, attacker) {
  const defender = enemyOf(attacker);
  const king = findKing(board, defender);
  if (!king) return false;

  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      const p = board[y][x];
      if (p && p.owner === attacker) {
        if (canMove(board, x, y, king.x, king.y)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function isSquareAttacked(board, x, y, attacker) {
  for (let sy = 0; sy < 9; sy++) {
    for (let sx = 0; sx < 9; sx++) {
      const p = board[sy][sx];
      if (p && p.owner === attacker && canMove(board, sx, sy, x, y)) {
        return true;
      }
    }
  }
  return false;
}

export function applyMoveToState(board, hands, move) {
  if (move.kind === "move") {
    const piece = { ...board[move.sy][move.sx] };
    const captured = board[move.ty][move.tx];

    if (captured) {
      hands[piece.owner].push(unpromote(captured.type));
    }

    if (move.promote) {
      piece.type = pieces[piece.type].promote;
    }

    board[move.ty][move.tx] = piece;
    board[move.sy][move.sx] = null;
  } else {
    const index = hands[move.owner].indexOf(move.type);
    if (index !== -1) hands[move.owner].splice(index, 1);
    board[move.y][move.x] = { type: move.type, owner: move.owner };
  }
}

export function isLegalMove(board, hands, move, owner) {
  const piece = board[move.sy][move.sx];
  if (!piece || piece.owner !== owner) return false;
  if (!canMove(board, move.sx, move.sy, move.tx, move.ty)) return false;

  const rule = pieces[piece.type];
  if (move.promote) {
    if (!rule.promote) return false;
    if (!(inPromotionZone(owner, move.sy) || inPromotionZone(owner, move.ty))) return false;
  } else {
    if (mustPromote(piece.type, owner, move.ty)) return false;
  }

  const nextBoard = cloneBoard(board);
  const nextHands = cloneHands(hands);
  applyMoveToState(nextBoard, nextHands, move);

  if (isCheck(nextBoard, enemyOf(owner))) return false;
  return true;
}

export function isUchifuzume(x, y, owner, board, hands) {
  const enemy = enemyOf(owner);
  const nextBoard = cloneBoard(board);
  const nextHands = cloneHands(hands);

  nextBoard[y][x] = { type: "FU", owner };
  const idx = nextHands[owner].indexOf("FU");
  if (idx !== -1) nextHands[owner].splice(idx, 1);

  if (!isCheck(nextBoard, owner)) return false;
  return isCheckmate(nextBoard, nextHands, enemy, true);
}

export function isLegalDrop(board, hands, move, owner, skipPawnDropMateRule = false) {
  if (move.owner !== owner) return false;
  if (move.type === "OU") return false;
  if (move.x < 0 || move.x > 8 || move.y < 0 || move.y > 8) return false;
  if (board[move.y][move.x]) return false;
  if (!hands[owner].includes(move.type)) return false;
  if (!canDropOnRank(move.type, owner, move.y)) return false;

  if (move.type === "FU" && isNifu(board, move.x, owner)) return false;
  if (!skipPawnDropMateRule && move.type === "FU" && isUchifuzume(move.x, move.y, owner, board, hands)) return false;

  const nextBoard = cloneBoard(board);
  const nextHands = cloneHands(hands);
  applyMoveToState(nextBoard, nextHands, move);

  if (isCheck(nextBoard, enemyOf(owner))) return false;
  return true;
}

export function generateLegalMoves(board, hands, owner, skipPawnDropMateRule = false) {
  const result = [];

  for (let sy = 0; sy < 9; sy++) {
    for (let sx = 0; sx < 9; sx++) {
      const piece = board[sy][sx];
      if (!piece || piece.owner !== owner) continue;

      for (let ty = 0; ty < 9; ty++) {
        for (let tx = 0; tx < 9; tx++) {
          if (!canMove(board, sx, sy, tx, ty)) continue;

          const rule = pieces[piece.type];
          const canPromote = !!rule.promote && (inPromotionZone(owner, sy) || inPromotionZone(owner, ty));
          const forcePromote = mustPromote(piece.type, owner, ty);

          if (forcePromote) {
            const move = { kind: "move", sx, sy, tx, ty, promote: true, owner };
            if (isLegalMove(board, hands, move, owner)) result.push(move);
          } else {
            const normalMove = { kind: "move", sx, sy, tx, ty, promote: false, owner };
            if (isLegalMove(board, hands, normalMove, owner)) result.push(normalMove);

            if (canPromote) {
              const promoteMove = { kind: "move", sx, sy, tx, ty, promote: true, owner };
              if (isLegalMove(board, hands, promoteMove, owner)) result.push(promoteMove);
            }
          }
        }
      }
    }
  }

  const uniqueHandTypes = [...new Set(hands[owner])];
  for (const type of uniqueHandTypes) {
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const move = { kind: "drop", type, x, y, owner };
        if (isLegalDrop(board, hands, move, owner, skipPawnDropMateRule)) {
          result.push(move);
        }
      }
    }
  }

  return result;
}

export function isCheckmate(board, hands, defender, skipPawnDropMateRule = false) {
  const attacker = enemyOf(defender);
  if (!isCheck(board, attacker)) return false;

  const replies = generateLegalMoves(board, hands, defender, skipPawnDropMateRule);
  return replies.length === 0;
}

export function createInitialState() {
  const board = createEmptyBoard();
  const hands = { sente: [], gote: [] };

  function place(x, y, type, owner) {
    board[y][x] = { type, owner };
  }

  place(0, 0, "KY", "gote");
  place(1, 0, "KE", "gote");
  place(2, 0, "GI", "gote");
  place(3, 0, "KI", "gote");
  place(4, 0, "OU", "gote");
  place(5, 0, "KI", "gote");
  place(6, 0, "GI", "gote");
  place(7, 0, "KE", "gote");
  place(8, 0, "KY", "gote");
  place(1, 1, "HI", "gote");
  place(7, 1, "KA", "gote");
  for (let x = 0; x < 9; x++) place(x, 2, "FU", "gote");

  place(0, 8, "KY", "sente");
  place(1, 8, "KE", "sente");
  place(2, 8, "GI", "sente");
  place(3, 8, "KI", "sente");
  place(4, 8, "OU", "sente");
  place(5, 8, "KI", "sente");
  place(6, 8, "GI", "sente");
  place(7, 8, "KE", "sente");
  place(8, 8, "KY", "sente");
  place(1, 7, "KA", "sente");
  place(7, 7, "HI", "sente");
  for (let x = 0; x < 9; x++) place(x, 6, "FU", "sente");

  return {
    board,
    hands,
    turn: "sente",
    gameOver: false,
    cpuThinking: false,
    selected: null,
    selectedFromHand: null,
    lastMove: null,
    status: "対局開始",
    aiLevel: "2ply"
  };
}