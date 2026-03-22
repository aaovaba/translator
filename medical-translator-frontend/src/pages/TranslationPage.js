import React, { useEffect, useRef, useState } from "react";
import "./TranslationPage.css";

export default function TranslationPage({ socket, messages, onSessionEnd }) {
  const [chat, setChat] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.type === "translation") {
      setChat(prev => [
        ...prev,
        { speaker: lastMessage.speaker, text: lastMessage.translated }
      ]);
      playAudio(lastMessage.audio);
    }

    if (lastMessage.type === "summary") {
      onSessionEnd(lastMessage.text);
    }
  }, [messages]);

  const playAudio = (base64Audio) => {
    if (!base64Audio) return;
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
    <div className="translation-container">
      <div className="translation-card">
        <h2 className="translation-title">Live Translation</h2>

        <div className="chat-window">
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`message-row ${msg.speaker === "patient" ? "patient" : "doctor"}`}
            >
              <div
                className={`message-bubble ${msg.speaker === "patient" ? "patient" : "doctor"}`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <div className="controls">
          <button onClick={startRecording} className="speak-button">
            🎙 Speak
          </button>

          <button onClick={endSession} className="end-button">
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}