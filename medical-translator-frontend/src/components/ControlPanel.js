import React, { useState } from "react";
import { sendMessage } from "../services/websocket";

export default function ControlPanel() {
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState("patient");

  const handleSend = () => {
    if (!text) return;

    sendMessage({
      speaker,
      text
    });

    setText("");
  };

  return (
    <div style={{ padding: "20px", borderTop: "1px solid #ccc" }}>
      <select
        value={speaker}
        onChange={(e) => setSpeaker(e.target.value)}
        style={{ marginRight: "10px", padding: "8px" }}
      >
        <option value="patient">Patient</option>
        <option value="doctor">Doctor</option>
      </select>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type message..."
        style={{
          width: "50%",
          padding: "10px",
          fontSize: "16px"
        }}
      />

      <button
        onClick={handleSend}
        style={{
          marginLeft: "10px",
          padding: "10px 20px",
          fontSize: "16px"
        }}
      >
        Send
      </button>
    </div>
  );
}