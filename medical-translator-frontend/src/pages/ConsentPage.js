import React, { useEffect, useRef, useState } from "react";
import "./ConsentPage.css";
import logo from "../assets/logo.png";

export default function ConsentPage({
  socket,
  messages,
  onConsentGranted,
  onLogout
}) {
  const [consentText, setConsentText] = useState("");
  const mediaRecorderRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;

    if (last.type === "consent") {
      setConsentText(last.text);
      playAudio(last.audio);
    }

    if (last.type === "status") {
      if (last.text.toLowerCase().includes("granted")) {
        onConsentGranted();
      } else {
        alert("Consent denied");
      }
    }
  }, [messages]);

  const playAudio = (base64Audio) => {
    if (!base64Audio) return;
    const audio = new Audio("data:audio/mp3;base64," + base64Audio);
    audio.play();
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = recorder;

    let chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const buffer = await blob.arrayBuffer();
      socket.send(buffer);
      chunks = [];
    };

    recorder.start();

    setTimeout(() => recorder.stop(), 4000);
  };

  return (
    <div className="consent-wrapper">

      {/* HEADER */}
      <div className="consent-header">
        <img src={logo} className="logo-small" alt="logo" />

        <div className="header-right">
          <span>Hello {user.firstName || "Doctor"}</span>
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* CARD */}
      <div className="consent-card">
        <h2>Patient Consent</h2>

        {!consentText && (
          <button className="primary-button" onClick={startRecording}>
            🎙 Start Recording
          </button>
        )}

        {consentText && (
          <>
            <div className="consent-box">{consentText}</div>

            <div className="button-group">
              <button className="secondary-button">
                🔊 Play
              </button>

              <button className="primary-button" onClick={startRecording}>
                🎙 Record Answer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}