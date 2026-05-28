import { io } from "socket.io-client";

export function initLiveCollaboration({
  serverUrl = "http://localhost:8787",
  roomId = "default-newsroom",
  textareaSelector = "#articleOutput",
}) {
  const socket = io(serverUrl);
  const textarea = document.querySelector(textareaSelector);

  if (!textarea) return null;

  socket.emit("join-room", roomId);

  textarea.addEventListener("input", () => {
    socket.emit("editor-update", {
      roomId,
      value: textarea.value,
    });
  });

  socket.on("editor-update", (payload) => {
    if (payload.roomId === roomId && textarea.value !== payload.value) {
      textarea.value = payload.value;
    }
  });

  return socket;
}
