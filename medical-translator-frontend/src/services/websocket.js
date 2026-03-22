let socket = null;
const Base_URL = process.env.REACT_APP_API_URL;
export const connectWebSocket = (onMessage) => {
  socket = new WebSocket(`${Base_URL}/ws`);

  socket.onopen = () => {
    console.log("Connected to backend");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("Disconnected from backend");
  };

  return socket;
};

export const sendMessage = (payload) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};