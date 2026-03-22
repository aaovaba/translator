import React, { useEffect, useRef, useState } from "react";
import "./ConsentPage.css";
import logo from "../assets/logo.png";

export default function ConsentPage({ socket, messages, onConsentGranted }) {
  const [consentText, setConsentText] = useState("");
  const mediaRecorderRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessage.type === "consent") {
      setConsentText(lastMessage.text);
      playAudio(lastMessage.audio);
    }

    if (lastMessage.type === "status") {
      if (lastMessage.text.toLowerCase().includes("granted")) {
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

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm"
    });

    mediaRecorderRef.current = mediaRecorder;

    let audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const arrayBuffer = await blob.arrayBuffer();
      socket.send(arrayBuffer);
      audioChunks = [];
    };

    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
    }, 4000);
  };

  return (
    <div className="consent-wrapper">

      <div className="consent-header">
        <img src={logo} alt="logo" className="logo-small" />
        <div>Hello {user.firstName || "Doctor"}</div>
      </div>

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
              <button
                className="secondary-button"
                onClick={() => playAudio(consentText)}
              >
                🔊 Play
              </button>

              <button
                className="primary-button"
                onClick={startRecording}
              >
                🎙 Record Answer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}