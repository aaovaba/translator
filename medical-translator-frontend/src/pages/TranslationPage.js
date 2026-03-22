import React, { useEffect, useRef, useState } from "react";
import "./TranslationPage.css";
import logo from "../assets/logo.png";

export default function TranslationPage({
  socket,
  messages,
  onSessionEnd,
  onLogout,
  goToProfile
}) {
  const [chat, setChat] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;

    if (last.type === "translation") {
      setChat((prev) => [
        ...prev,
        { speaker: last.speaker, text: last.translated }
      ]);
      playAudio(last.audio);
    }

    if (last.type === "summary") {
      onSessionEnd(last.text);
    }
  }, [messages,onSessionEnd]);

  const playAudio = (audio) => {
    if (!audio) return;
    new Audio("data:audio/mp3;base64," + audio).play();
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current);
      const buffer = await blob.arrayBuffer();
      socket.send(buffer);
    };

    recorder.start();
    setTimeout(() => recorder.stop(), 4000);
  };

  const endSession = () => {
    socket.send("end_session");
  };

  return (
    <div className="translation-container">

      {/* HEADER */}
      <div className="app-header">
        <div className="header-left">
          <img src={logo} alt="logo" className="logo-small" />
        </div>

        <div className="header-center">
          👋 Hello, <span className="username">{user.firstName || "Doctor"}</span>
        </div>

        <div className="header-right">
          <div className="profile-icon" onClick={goToProfile}>
            👤
          </div>

          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* CARD */}
      <div className="translation-card">
        <h2>Live Translation</h2>

        <div className="chat-window">
          {chat.map((msg, i) => (
            <div key={i} className={`message-row ${msg.speaker}`}>
              <div className={`message-bubble ${msg.speaker}`}>
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