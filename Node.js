// server.js
const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let rooms = {};

io.on("connection", socket => {
  socket.on("joinGame", room => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = [];
    rooms[room].push(socket.id);

    if (rooms[room].length === 2) {
      io.to(room).emit("startGame", "Both players joined!");
    }
  });

  socket.on("move", ({ room, index, player }) => {
    io.to(room).emit("moveMade", { index, player });
  });

  socket.on("disconnect", () => {
    for (let room in rooms) {
      rooms[room] = rooms[room].filter(id => id !== socket.id);
    }
  });
});
