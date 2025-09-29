/*******************************
 Fixed script.js
 - Correct AI turn switching
 - Minimax works whether AI is X or O
 - Cleaned compatibility wrapper
*******************************/

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let winner = null;
let mode = null;
let difficulty = "easy";
let player1 = "Player 1";
let player2 = "Player 2";
let scores = { X: 0, O: 0 };
let symbols = {};
let tossWinner = "";

let aiPlayer = "O";
let humanPlayer = "X";

let socket;
let room = null;

// UI Elements
const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");
const scoreboardElement = document.getElementById("scoreboard");
const menu = document.getElementById("menu");
const setup = document.getElementById("player-setup");
const inputs = document.getElementById("inputs");
const nextBtn = document.getElementById("next-btn");
const tossSection = document.getElementById("toss-section");
const tossMessage = document.getElementById("toss-message");
const tossResultElement = document.getElementById("toss-result");
const coinElement = document.getElementById("coin");
const continueBtn = document.getElementById("continue-btn");
const difficultySection = document.getElementById("difficulty-section");
const gameDiv = document.getElementById("game");
const onlineSetup = document.getElementById("online-setup");
const roomInput = document.getElementById("room-input");

const winPatterns = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

// ---------------- MODE SELECTION ----------------
function chooseMode(selectedMode) {
  mode = selectedMode;
  menu.style.display = "none";

  if (mode === "online") {
    onlineSetup.style.display = "block";

    if (!socket && typeof io !== "undefined") {
      try {
        socket = io("http://localhost:3000"); // change if deployed
      } catch (e) {
        console.warn("socket.io client not reachable:", e);
        socket = null;
      }

      if (socket) {
        socket.on("startGame", msg => {
          alert(msg || "Both players joined!");
          goToToss();
        });

        socket.on("roomAssigned", assignedRoom => {
          room = assignedRoom;
          alert("Matched with a random player. Game starting!");
          goToToss();
        });

        socket.on("moveMade", ({ index, player }) => {
          board[index] = player;
          renderBoard();
          nextTurn();
        });

        socket.on("disconnect", () => {
          console.log("Disconnected from server");
        });
      }
    }
  } else {
    setup.style.display = "block";
    inputs.innerHTML = "";
    if (mode === "friend") {
      inputs.innerHTML = `
        <input type="text" id="p1" placeholder="Enter Player 1 Name">
        <input type="text" id="p2" placeholder="Enter Player 2 Name">`;
      nextBtn.innerText = "Next → Toss";
    } else {
      inputs.innerHTML = `<input type="text" id="p1" placeholder="Enter Your Name">`;
      nextBtn.innerText = "Next → Difficulty";
    }
  }
}

// ---------------- ONLINE SETUP ----------------
function createRoom() {
  roomInput.innerHTML = `
    <input type="text" id="newRoomId" placeholder="Enter Room ID">
    <button onclick="confirmCreateRoom()">Create</button>
  `;
}
function confirmCreateRoom() {
  const el = document.getElementById("newRoomId");
  room = el ? el.value.trim() : "";
  if (!room) { alert("Enter a valid room ID"); return; }
  if (!socket) { alert("Not connected to server."); return; }
  socket.emit("joinGame", room);
  alert("Room created. Waiting for another player...");
}

function joinRoom() {
  roomInput.innerHTML = `
    <input type="text" id="joinRoomId" placeholder="Enter Room ID">
    <button onclick="confirmJoinRoom()">Join</button>
  `;
}
function confirmJoinRoom() {
  const el = document.getElementById("joinRoomId");
  room = el ? el.value.trim() : "";
  if (!room) { alert("Enter a valid room ID"); return; }
  if (!socket) { alert("Not connected to server."); return; }
  socket.emit("joinGame", room);
  alert("Joining room... waiting for opponent");
}

function randomMatch() {
  if (!socket) { alert("Not connected to server."); return; }
  socket.emit("randomMatch");
  alert("Searching for random opponent...");
}

// ---------------- PLAYER SETUP ----------------
function goToNextStep() {
  const p1el = document.getElementById("p1");
  const p2el = document.getElementById("p2");
  player1 = p1el ? (p1el.value || "Player 1") : "Player 1";
  player2 = (mode === "friend" && p2el) ? (p2el.value || "Player 2") : (mode === "friend" ? "Player 2" : "AI Bot");

  setup.style.display = "none";
  if (mode === "ai") {
    difficultySection.style.display = "block";
  } else {
    goToToss();
  }
}

function setDifficulty(level) {
  difficulty = level;
  difficultySection.style.display = "none";
  goToToss();
}

// ---------------- TOSS ----------------
function goToToss() {
  tossSection.style.display = "block";
  tossMessage.innerText =
    (mode === "friend" || mode === "online")
      ? `${player1}, choose Head or Tail for the toss:`
      : `${player1}, choose Head or Tail for the toss against AI:`;
}

function doToss(choice) {
  coinElement.classList.add("flip");
  tossResultElement.innerText = "";
  continueBtn.style.display = "none";

  setTimeout(() => {
    coinElement.classList.remove("flip");

    const tossResult = Math.random() < 0.5 ? "Head" : "Tail";
    coinElement.innerText = tossResult;

    if (choice === tossResult) {
      tossWinner = player1;
    } else {
      tossWinner = player2;
    }

    if (tossWinner === player1) {
      symbols = { X: player1, O: player2 };
      currentPlayer = "X";
    } else {
      symbols = { X: player2, O: player1 };
      currentPlayer = "X";
    }

    scores = { X: 0, O: 0 };

    // set AI/human mapping
    if (mode === "ai") {
      aiPlayer = (symbols.X === "AI Bot") ? "X" : "O";
      humanPlayer = (aiPlayer === "X") ? "O" : "X";
    }

    tossResultElement.innerText =
      `🪙 Toss Result: ${tossResult}. ${tossWinner} will play first as X.`;
    continueBtn.style.display = "inline-block";
  }, 2000);
}

function startGame() {
  tossSection.style.display = "none";
  gameDiv.style.display = "block";
  resetBoard();
  updateScoreboard();
  statusElement.innerText = `${symbols[currentPlayer]}'s turn`;
}

// ---------------- GAME ----------------
function renderBoard() {
  boardElement.innerHTML = "";
  board.forEach((cell, index) => {
    const div = document.createElement("div");
    div.classList.add("cell");
    div.innerText = cell;
    div.addEventListener("click", () => handleClick(index));
    boardElement.appendChild(div);
  });
}

function handleClick(index) {
  if (board[index] || winner) return;

  if (mode === "online") {
    board[index] = currentPlayer;
    renderBoard();
    if (socket) socket.emit("move", { room, index, player: currentPlayer });
    nextTurn();
    return;
  }

  board[index] = currentPlayer;
  renderBoard();

  if (checkWinner()) {
    scores[currentPlayer]++;
    updateScoreboard();
    if (scores[currentPlayer] === 3) {
      statusElement.innerText = `🏆 ${symbols[currentPlayer]} Wins the Tournament!`;
      return;
    }
    statusElement.innerText = `🎉 ${symbols[currentPlayer]} Wins this Round!`;
    setTimeout(resetBoard, 1500);
    return;
  }

  if (!board.includes("")) {
    statusElement.innerText = "🤝 It's a Draw!";
    setTimeout(resetBoard, 1500);
    return;
  }

  nextTurn();

  if (mode === "ai" && symbols[currentPlayer] === "AI Bot") {
    setTimeout(aiMove, 500);
  }
}

function nextTurn() {
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  statusElement.innerText = `${symbols[currentPlayer]}'s turn`;
}

// ---------------- AI ----------------
function aiMove() {
  let move;
  if (difficulty === "easy") move = randomMove();
  else if (difficulty === "medium") move = mediumMove();
  else if (difficulty === "hard") move = hardMove();
  else move = minimaxMove();

  if (move !== undefined) {
    board[move] = currentPlayer;
    renderBoard();

    if (checkWinner()) {
      scores[currentPlayer]++;
      updateScoreboard();
      if (scores[currentPlayer] === 3) {
        statusElement.innerText = `🏆 ${symbols[currentPlayer]} Wins the Tournament!`;
        return;
      }
      statusElement.innerText = `🤖 AI Wins this Round!`;
      setTimeout(resetBoard, 1500);
      return;
    }

    if (!board.includes("")) {
      statusElement.innerText = "🤝 It's a Draw!";
      setTimeout(resetBoard, 1500);
      return;
    }

    // ✅ FIXED: switch turns properly
    nextTurn();
  }
}

function randomMove() {
  const empty = board.map((v, i) => v === "" ? i : null).filter(v => v !== null);
  return empty[Math.floor(Math.random() * empty.length)];
}
function mediumMove() {
  if (Math.random() < 0.5) return randomMove();
  return findBlockingMove() ?? randomMove();
}
function hardMove() {
  return findWinningMove(currentPlayer) ?? findBlockingMove() ?? randomMove();
}
function minimaxMove() {
  let bestScore = -Infinity, move;
  board.forEach((cell, i) => {
    if (cell === "") {
      board[i] = currentPlayer;
      let score = minimax(board, 0, false);
      board[i] = "";
      if (score > bestScore) { bestScore = score; move = i; }
    }
  });
  return move;
}
function minimax(b, depth, isMax) {
  const winnerCheck = checkImmediateWinner();
  if (winnerCheck === humanPlayer) return -10 + depth;
  if (winnerCheck === aiPlayer) return 10 - depth;
  if (!b.includes("")) return 0;

  if (isMax) {
    let best = -Infinity;
    b.forEach((cell, i) => {
      if (b[i] === "") {
        b[i] = aiPlayer;
        best = Math.max(best, minimax(b, depth+1, false));
        b[i] = "";
      }
    });
    return best;
  } else {
    let best = Infinity;
    b.forEach((cell, i) => {
      if (b[i] === "") {
        b[i] = humanPlayer;
        best = Math.min(best, minimax(b, depth+1, true));
        b[i] = "";
      }
    });
    return best;
  }
}
function findBlockingMove() { return findWinningMove(humanPlayer); }
function findWinningMove(player) {
  for (let [a,b,c] of winPatterns) {
    if (board[a]===player && board[b]===player && board[c]==="") return c;
    if (board[a]===player && board[c]===player && board[b]==="") return b;
    if (board[b]===player && board[c]===player && board[a]==="") return a;
  }
  return null;
}
function checkImmediateWinner() {
  for (let [a,b,c] of winPatterns) {
    if (board[a] && board[a]===board[b] && board[a]===board[c]) return board[a];
  }
  return null;
}

// ---------------- UTILITIES ----------------
function checkWinner() {
  for (let [a,b,c] of winPatterns) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      winner = board[a];
      return true;
    }
  }
  return false;
}
function resetBoard() {
  board = ["", "", "", "", "", "", "", "", ""];
  winner = null;
  renderBoard();
  statusElement.innerText = `${symbols[currentPlayer]}'s turn`;
}
function updateScoreboard() {
  scoreboardElement.innerText = `${symbols["X"]} (X): ${scores["X"]} | ${symbols["O"]} (O): ${scores["O"]}`;
}
function resetGame() {
  scores = { X: 0, O: 0 };
  resetBoard();
  updateScoreboard();
  statusElement.innerText = `${symbols[currentPlayer]}'s turn`;
}
function backToMenu() {
  mode = null;
  scores = { X: 0, O: 0 };
  menu.style.display = "block";
  setup.style.display = "none";
  tossSection.style.display = "none";
  difficultySection.style.display = "none";
  gameDiv.style.display = "none";
  onlineSetup.style.display = "none";
  tossResultElement.innerText = "";
  continueBtn.style.display = "none";
  coinElement.innerText = "🪙";
}
