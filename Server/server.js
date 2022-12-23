const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

const games = [];

class Player {
  constructor(socket) {
    this.id = socket.id;
    this.name = `Player ${socket.id}`;
    this.hand = [];
  }
}

class Game {
  constructor() {
    this.id = Math.floor(Math.random() * 100000);
    this.players = [];
    this.currentTurn = 0;
    this.deck = [];
    this.discardPile = [];
    this.gameStarted = false;
    this.gameEnded = false;
  }

  addPlayer(socket) {
    
    const player = new Player(socket);

    
    this.players.push(player);

    
    socket.join(this.id);

    
    io.to(this.id).emit('playerJoined', this.getState());
  }

  createDeck() {
    const deck = [];

    
    const colors = ['red', 'yellow', 'green', 'blue'];
    const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];
    for (let color of colors) {
      for (let value of values) {
        deck.push({ color, value });
      }
    }

    
    for (let i = 0; i < 4; i++) {
      deck.push({ color: 'black', value: 'Wild' });
      deck.push({ color: 'black', value: 'Wild Draw Four' });
    }

    return deck;
  }

  dealCards() {
    
    shuffle(this.deck);

    
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].hand = this.deck.splice(0, 7);
    }
  }
  start() {
    
    this.deck = this.createDeck();

    
    shuffle(this.deck);

    
    this.dealCards();

    
    this.currentTurn = 0;

    
    this.discardPile.push(this.deck.pop());

    
    this.gameStarted = true;
  }
  hasPlayer(player) {
    return this.players.includes(player);
  }
  playCard(playerId, card) {
    
    console.log("card was playeddd");
    
    const player = this.players.find((player) => player.id === playerId);
    if (!player) {
      return;
    }
    console.log(player.hand);
    console.log("has in hand: " + player.hand.indexOf(card));

    
    
    if (!player.hand.some((handCard) => handCard.value === card.value && handCard.color === card.color)) {
      return;
    }
    console.log("has card");
    
    if (!this.isValidCard(card)) {
      return;
    }
    console.log("valid card");
    
    player.hand = player.hand.filter((handCard) => handCard.value !== card.value || handCard.color !== card.color);

    
    this.discardPile.push(card);

    
    this.updateTurn();

    
    if (this.hasEnded()) {
      this.gameEnded = true;
    }

    
    return this.getState();
  }

  
  isValidCard(card) {
    const topCard = this.discardPile[this.discardPile.length - 1];

    
    if (card.color === 'black') {
      return true;
    }

    
    return card.color === topCard.color || card.value === topCard.value;
  }

  
  updateTurn() {
    
    if (this.discardPile[this.discardPile.length - 1].value === 'Skip') {
      this.currentTurn = (this.currentTurn + 2) % this.players.length;
    } else {
      this.currentTurn = (this.currentTurn + 1) % this.players.length;
    }
  }

  
  hasEnded() {
    return this.players.some((player) => player.hand.length === 0);
  }

  
  getState() {
    return {
      players: this.players.map((player) => ({
        id: player.id,
        name: player.name,
        hand: player.hand,
      })),
      currentTurn: this.currentTurn,
      deckSize: this.deck.length,
      discardPile: this.discardPile,
      gameStarted: this.gameStarted,
      gameEnded: this.gameEnded,
    };
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


io.on('connection', (socket) => {
  console.log(`Client ${socket.id} connected`);

  
  socket.on('createGame', () => {
    console.log(`Client ${socket.id} creating game`);

    
    const game = new Game();

    
    game.addPlayer(socket);

    
    games.push(game);

    
    socket.emit('gameCreated', game.id);
  });

  
  socket.on('joinGame', (gameId) => {
    console.log(`Client ${socket.id} joining game ${gameId}`);

    
    const game = games.find((game) => game.id === Number(gameId));

    if (!game) {
      
      socket.emit('invalidGameId');
      return;
    }

    
    game.addPlayer(socket);
  });

  
  socket.on('startGame', (gameId) => {
    console.log(`Starting game`);

    
    
    const game = games.find((game) => game.id === gameId);
    
    if (!game) {
      socket.emit('invalidGameId');
      return;
    }
    

    
    game.start();

    
    io.to(game.id).emit('gameStarted', game.getState());
  });

  
  socket.on('playCard', ({ card, id}) => {
    console.log(`Client ${socket.id} playing card`);
    console.log(id);
    console.log(card);
    
    
    const game = games.find((game) => game.id === Number(id));
    console.log(game);
    if (!game) {
      return;
    }
    console.log("hi");
    
    const state = game.playCard(socket.id, card);
    console.log(state);
    if (!state) {
      return;
    }

    
    io.to(game.id).emit('cardPlayed', state);
  });


  socket.on('disconnect', () => {
    console.log(`Client ${socket.id} disconnected`);

    
    const game = games.find((game) => game.hasPlayer(socket));
    if (!game) {
      return;
    }

    
    game.players = game.players.filter((player) => player.id !== socket.id);

    
    if (game.players.length === 0) {
      games.splice(games.indexOf(game), 1);
    }

    
    if (game.gameStarted) {
      io.to(game.id).emit('playerDisconnected', game.getState());
    }
  });

});

http.listen(8080, () => console.log('listening on http://localhost:8080') );