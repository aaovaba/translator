import React, { useEffect, useRef, useState } from "react";

export default function TranslationPage({ socket, onSessionEnd }) {
  const [messages, setMessages] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "translation") {
        setMessages(prev => [
          ...prev,
          { speaker: data.speaker, text: data.translated }
        ]);
        playAudio(data.audio);
      }

      if (data.type === "summary") {
        // onSessionEnd(data.text);
        if (onSessionEnd) {
    onSessionEnd(data.text);
        }
      }
    };
  }, [socket, onSessionEnd]);

  const playAudio = (base64Audio) => {
    const audio = new Audio("data:audio/mp3;base64," + base64Audio);
    audio.play();
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm"
    });

    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, {
        type: "audio/webm"
      });

      const arrayBuffer = await blob.arrayBuffer();
      socket.send(arrayBuffer);

      audioChunksRef.current = [];
    };

    mediaRecorder.start();

    setTimeout(() => {
      if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    }, 4000);
  };

  const endSession = () => {
    socket.send("end_session");
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Live Translation</h2>

      <div style={{
        height: "60vh",
        overflowY: "auto",
        border: "1px solid #ccc",
        padding: 20
      }}>
        {messages.map((msg, i) => (
          <div key={i}
            style={{
              display: "flex",
              justifyContent:
                msg.speaker === "patient"
                  ? "flex-end"
                  : "flex-start",
              marginBottom: 10
            }}>
            <div style={{
              background:
                msg.speaker === "patient"
                  ? "#d1f5d3"
                  : "#e0e0e0",
              padding: 10,
              borderRadius: 10
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <button onClick={startRecording}
        style={{ padding: "15px 40px", marginTop: 20 }}>
        🎙 Speak
      </button>

      <button onClick={endSession}
        style={{
          padding: "10px 30px",
          marginTop: 20,
          marginLeft: 20,
          backgroundColor: "#ff4d4d",
          color: "white"
        }}>
        End Session
      </button>
    </div>
  );
}