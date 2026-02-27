import React, { useEffect, useRef, useState } from "react";

export default function ConsentPage({ socket, onConsentGranted }) {
  const [consentText, setConsentText] = useState("");
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("ConsentPage received:", data);

      if (data.type === "consent") {
        setConsentText(data.text);
        playAudio(data.audio);
      }

      if (data.type === "status") {
        const status = data.text.toLowerCase();

        if (status.includes("granted")) {
          onConsentGranted();
        } else if (status.includes("denied")) {
          alert("Consent denied.");
        }
      }
    };
  }, [socket, onConsentGranted]);

  const playAudio = (base64Audio) => {
    if (!base64Audio) return;
    const audio = new Audio("data:audio/mp3;base64," + base64Audio);
    audio.play();
  };

  const startRecording = async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      alert("WebSocket not connected.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm"
    });

    mediaRecorderRef.current = mediaRecorder;

    let audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
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
    <div style={{ padding: "50px", textAlign: "center" }}>
      <h2>Patient Consent</h2>

      {!consentText && (
        <button
          onClick={startRecording}
          style={{ padding: "15px 40px", fontSize: "18px" }}
        >
          🎙 Record Patient Speech
        </button>
      )}

      {consentText && (
        <div style={{ marginTop: "30px" }}>
          <p style={{ fontSize: "20px" }}>{consentText}</p>

          <div style={{ marginTop: "20px" }}>
            <button
              onClick={() => playAudio()}
              style={{ padding: "10px 30px", marginRight: "20px" }}
            >
              🔊 Play Consent
            </button>

            <button
              onClick={startRecording}
              style={{ padding: "15px 40px", fontSize: "18px" }}
            >
              🎙 Record Answer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}