const { Server } = require("socket.io");

function initLiveCollaboration(server, clientOrigin = "http://localhost:5173") {
  const io = new Server(server, {
    cors: {
      origin: clientOrigin,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
    });

    socket.on("editor-update", (payload) => {
      socket.to(payload.roomId).emit("editor-update", payload);
    });
  });

  return io;
}

module.exports = { initLiveCollaboration };
