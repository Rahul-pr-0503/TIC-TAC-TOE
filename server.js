const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let waitingPlayer = null;

io.on("connection", socket => {
  socket.on("joinGame", room => {
    socket.join(room);

    let clients = io.sockets.adapter.rooms.get(room);
    if (clients.size === 2) {
      io.to(room).emit("startGame", "Both players joined!");
    }
  });

  socket.on("randomMatch", () => {
    if (waitingPlayer) {
      const room = "room_" + socket.id + "_" + waitingPlayer;
      socket.join(room);
      io.sockets.sockets.get(waitingPlayer).join(room);

      io.to(room).emit("roomAssigned", room);
      io.to(room).emit("startGame", "Random players connected!");
      waitingPlayer = null;
    } else {
      waitingPlayer = socket.id;
    }
  });

  socket.on("move", ({ room, index, player }) => {
    io.to(room).emit("moveMade", { index, player });
  });

  socket.on("disconnect", () => {
    if (waitingPlayer === socket.id) waitingPlayer = null;
  });
});
