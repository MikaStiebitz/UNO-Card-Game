const socket = io("http://localhost:8080");

let gameId;
let hand;
let players;
let currentTurn;
let deckSize;
let discardPile;
let gameStarted;
let gameEnded;

// handle the "gameCreated" event from the server
socket.on('gameCreated', (id) => {
  console.log(`Game created with id ${id}`);
  gameId = id;
});

// handle the "playerJoined" event from the server
socket.on('playerJoined', (state) => {
  console.log(`Player joined`);
  ({ players, currentTurn, deckSize, discardPile, gameStarted, gameEnded } = state);
});

// handle the "gameStarted" event from the server
socket.on('gameStarted', (state) => {
  console.log(`Game started`);
  ({ players, currentTurn, deckSize, discardPile, gameStarted, gameEnded } = state);
  hand = players.find((player) => player.id === socket.id).hand;
});

// handle the "cardPlayed" event from the server
socket.on('cardPlayed', (state) => {
  console.log(`Card played`);
  ({ players, currentTurn, deckSize, discardPile, gameStarted, gameEnded } = state);
  hand = players.find((player) => player.id === socket.id).hand;
});

// handle the "playerDisconnected" event from the server
socket.on('playerDisconnected', (state) => {
  console.log(`Player disconnected`);
  ({ players, currentTurn, deckSize, discardPile, gameStarted, gameEnded } = state);
});

function createGame() {
  socket.emit('createGame');
}

function joinGame(id) {
  socket.emit('joinGame', id);
}

function startGame() {
  socket.emit('startGame', gameId);
}

function playCard(card) {
  let tmp_data = {
    card : card,
    id : gameId
  }
  console.log(tmp_data.id);
  socket.emit('playCard', tmp_data);
}

// render the game
function render() {
  // initialize the hand array if it is not defined
  if (!hand) {
    hand = [];
  }
  if (!discardPile) {
    discardPile = [];
  }
  // display the player's hand
  const handElem = document.getElementById('hand');
  handElem.innerHTML = '';
  hand.forEach((card) => {
    const cardElem = document.createElement('div');
    cardElem.className = `card ${card.color}`;
    cardElem.innerHTML = card.value;
    cardElem.addEventListener('click', () => {
      playCard(card);
    });
    handElem.appendChild(cardElem);
  });

  // display the current turn
  const currentTurnElem = document.getElementById('current-turn');
  currentTurnElem.innerHTML = `Current turn: ${currentTurn + 1}`;

  // display the deck size
  const deckSizeElem = document.getElementById('deck-size');
  deckSizeElem.innerHTML = `Deck size: ${deckSize}`;

  // display the top card of the discard pile
  const discardPileElem = document.getElementById('discard-pile');
  discardPileElem.innerHTML = '';
  const topCard = discardPile[discardPile.length - 1];
  if (topCard) {
    const topCardElem = document.createElement('div');
    topCardElem.className = 'card';
    topCardElem.style.backgroundColor = topCard.color;
    topCardElem.innerHTML = topCard.value;
    discardPileElem.appendChild(topCardElem);
  }
}

setInterval(render, 1000);