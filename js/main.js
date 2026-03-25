import {
  PROMOTED_PIECES,
  applyMoveToState,
  createInitialState,
  enemyOf,
  generateLegalMoves,
  getLegalTargetsForSelection,
  isCheck,
  isCheckmate,
  pieces,
  tryHumanDrop,
  tryHumanMove
} from "./game.js";
import { chooseBestCpuMove } from "./ai.js";

const boardEl = document.getElementById("board");
const turnEl = document.getElementById("turn");
const handSenteEl = document.getElementById("hand-sente");
const handGoteEl = document.getElementById("hand-gote");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const aiLevelEl = document.getElementById("ai-level");

const state = createInitialState();

function resetGame() {
  const newState = createInitialState();
  Object.assign(state, newState);
  state.aiLevel = aiLevelEl.value;
  draw();
}

function draw() {
  const legalTargets = new Set(getLegalTargetsForSelection(state));

  boardEl.innerHTML = "";
  state.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      const div = document.createElement("div");
      div.className = "cell";

      if (state.selected && state.selected.x === x && state.selected.y === y) {
        div.classList.add("selected");
      }

      if (
        state.lastMove &&
        (
          (state.lastMove.from && state.lastMove.from.x === x && state.lastMove.from.y === y) ||
          (state.lastMove.to && state.lastMove.to.x === x && state.lastMove.to.y === y)
        )
      ) {
        div.classList.add("last-move");
      }

      if (legalTargets.has(`${x},${y}`)) {
        div.classList.add("legal-target");
      }

      if (cell) {
        const pieceDiv = document.createElement("div");
        pieceDiv.className = `piece ${cell.owner}`;

        if (PROMOTED_PIECES.includes(cell.type)) {
          pieceDiv.classList.add("promoted");
        }

        pieceDiv.textContent = pieces[cell.type].name;
        div.appendChild(pieceDiv);
      }

      div.onclick = () => clickCell(x, y);
      boardEl.appendChild(div);
    });
  });

  handSenteEl.innerHTML = state.hands.sente
    .map(p => {
      const selectedClass = state.selectedFromHand === p && state.turn === "sente" ? "selected-hand" : "";
      return `
        <div class="piece sente ${selectedClass}" data-type="${p}">
          ${pieces[p].name}
        </div>
      `;
    })
    .join("");

  handGoteEl.innerHTML = state.hands.gote
    .map(p => `
      <div class="piece gote">
        ${pieces[p].name}
      </div>
    `)
    .join("");

  handSenteEl.querySelectorAll(".piece").forEach(el => {
    el.addEventListener("click", () => selectHand(el.dataset.type, "sente"));
  });

  turnEl.textContent = `手番：${state.turn === "sente" ? "先手（あなた）" : "後手（CPU）"}`;
  statusEl.textContent = state.status || "";
}

function selectHand(type, owner) {
  if (state.gameOver || state.cpuThinking) return;
  if (owner !== state.turn) return;
  if (state.turn !== "sente") return;

  state.selectedFromHand = state.selectedFromHand === type ? null : type;
  state.selected = null;
  draw();
}

function finishTurn(attacker) {
  const defender = enemyOf(attacker);

  if (isCheckmate(state.board, state.hands, defender)) {
    state.gameOver = true;
    state.status = `${attacker === "sente" ? "あなた" : "CPU"}の勝ち！`;
    draw();
    setTimeout(() => {
      alert(`詰み！ ${attacker === "sente" ? "あなた" : "CPU"}の勝ち`);
    }, 10);
    return;
  }

  if (isCheck(state.board, attacker)) {
    state.status = `${defender === "sente" ? "あなた" : "CPU"}に王手！`;
  } else {
    state.status = "";
  }

  state.turn = defender;
  state.selected = null;
  state.selectedFromHand = null;
  draw();

  if (state.turn === "gote" && !state.gameOver) {
    cpuThink();
  }
}

function clickCell(x, y) {
  if (state.gameOver || state.cpuThinking) return;
  if (state.turn !== "sente") return;

  const cell = state.board[y][x];

  if (state.selectedFromHand) {
    const dropped = tryHumanDrop(state, x, y);
    if (!dropped && cell && cell.owner === state.turn) {
      state.selectedFromHand = null;
      state.selected = { x, y };
    } else {
      state.selectedFromHand = null;
      if (dropped) finishTurn("sente");
    }
    draw();
    return;
  }

  if (state.selected) {
    if (state.selected.x === x && state.selected.y === y) {
      state.selected = null;
      draw();
      return;
    }

    const moved = tryHumanMove(state, state.selected.x, state.selected.y, x, y);
    state.selected = null;

    if (!moved && cell && cell.owner === state.turn) {
      state.selected = { x, y };
    } else if (moved) {
      finishTurn("sente");
    }

    draw();
    return;
  }

  if (cell && cell.owner === state.turn) {
    state.selected = { x, y };
    draw();
  }
}

function cpuThink() {
  if (state.gameOver || state.turn !== "gote") return;

  state.cpuThinking = true;
  state.status = `CPUが考え中…（${labelForAiLevel(state.aiLevel)}）`;
  draw();

  setTimeout(() => {
    const bestMove = chooseBestCpuMove(state, state.aiLevel);

    if (!bestMove) {
      state.cpuThinking = false;
      if (isCheck(state.board, "sente")) {
        state.gameOver = true;
        state.status = "あなたの勝ち！";
        alert("詰み！ あなたの勝ち");
      } else {
        state.gameOver = true;
        state.status = "合法手がありません";
        alert("合法手がありません");
      }
      draw();
      return;
    }

    applyMoveToState(state.board, state.hands, bestMove);

    if (bestMove.kind === "move") {
      state.lastMove = {
        from: { x: bestMove.sx, y: bestMove.sy },
        to: { x: bestMove.tx, y: bestMove.ty }
      };
    } else {
      state.lastMove = {
        from: null,
        to: { x: bestMove.x, y: bestMove.y }
      };
    }

    state.cpuThinking = false;
    finishTurn("gote");
  }, 250);
}

function labelForAiLevel(level) {
  if (level === "2ply") return "弱い(Lv.1)";
  if (level === "3ply") return "普通(Lv.2)";
  return "強い(Lv.3)";
}

resetBtn.addEventListener("click", resetGame);

aiLevelEl.addEventListener("change", () => {
  state.aiLevel = aiLevelEl.value;
//  state.status = `CPU強さを「${labelForAiLevel(state.aiLevel)}」に変更しました`;
  draw();
});

resetGame();