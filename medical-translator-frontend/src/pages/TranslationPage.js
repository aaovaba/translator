import React, { useEffect, useRef, useState } from "react";

export default function TranslationPage({ socket, onEnd }) {
  const [messages, setMessages] = useState([]);
  const [speaker, setSpeaker] = useState("patient");

  const speechQueue = useRef([]);
  const isSpeaking = useRef(false);

  // -------------------------------------------------
  // Load available voices once
  // -------------------------------------------------
  useEffect(() => {
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synth.getVoices();
      console.log("Available voices:", voices);
    };

    synth.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  // -------------------------------------------------
  // Handle incoming WebSocket messages
  // -------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("TranslationPage received:", data);

      if (data.type === "translation") {
        const newMessage = {
          speaker: data.speaker,
          text: data.translated
        };

        setMessages((prev) => [...prev, newMessage]);

        enqueueSpeech(data.translated);
      }
    };
  }, [socket]);

  // -------------------------------------------------
  // Universal Language Detection (Unicode-based)
  // -------------------------------------------------
  const detectLanguageCode = (text) => {
    if (!text) return "en";

    // Arabic
    if (/[\u0600-\u06FF]/.test(text)) return "ar";

    // Devanagari (Hindi/Nepali etc.)
    if (/[\u0900-\u097F]/.test(text)) return "hi";

    // Cyrillic (Russian etc.)
    if (/[\u0400-\u04FF]/.test(text)) return "ru";

    // Chinese
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh";

    // Default fallback
    return "en";
  };

  // -------------------------------------------------
  // Speech Queue System
  // -------------------------------------------------
  const enqueueSpeech = (text) => {
    speechQueue.current.push(text);
    processQueue();
  };

  const processQueue = () => {
    if (isSpeaking.current) return;
    if (speechQueue.current.length === 0) return;

    const nextText = speechQueue.current.shift();
    speak(nextText);
  };

  const speak = (text) => {
    if (!text) return;

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);

    const voices = synth.getVoices();
    const detectedLang = detectLanguageCode(text);

    // Try to find best matching voice
    const matchedVoice = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(detectedLang.toLowerCase())
    );

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else {
      utterance.lang = detectedLang;
    }

    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      isSpeaking.current = true;
      console.log("TTS started:", text);
    };

    utterance.onend = () => {
      isSpeaking.current = false;
      processQueue();
    };

    utterance.onerror = (e) => {
      console.error("TTS error:", e);
      isSpeaking.current = false;
      processQueue();
    };

    synth.speak(utterance);
  };

  // -------------------------------------------------
  // Audio Recording
  // -------------------------------------------------
  const startRecording = async () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      alert("WebSocket not connected.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm"
    });

    let audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const arrayBuffer = await blob.arrayBuffer();

      socket.send(
        JSON.stringify({
          speaker: speaker,
          audio: Array.from(new Uint8Array(arrayBuffer))
        })
      );

      audioChunks = [];
    };

    mediaRecorder.start();

    // Temporary fixed recording time
    setTimeout(() => {
      mediaRecorder.stop();
    }, 6000);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2 style={{ textAlign: "center" }}>Live Translation</h2>

      <div
        style={{
          height: "60vh",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "20px",
          borderRadius: "10px",
          backgroundColor: "#f9f9f9"
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent:
                msg.speaker === "patient"
                  ? "flex-end"
                  : "flex-start",
              marginBottom: "10px"
            }}
          >
            <div
              style={{
                background:
                  msg.speaker === "patient"
                    ? "#d1f5d3"
                    : "#e0e0e0",
                padding: "10px 15px",
                borderRadius: "15px",
                maxWidth: "60%",
                fontSize: "16px"
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <select
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          style={{ marginRight: "20px", padding: "10px" }}
        >
          <option value="patient">Patient Speaking</option>
          <option value="doctor">Doctor Speaking</option>
        </select>

        <button
          onClick={startRecording}
          style={{ padding: "15px 40px", fontSize: "18px" }}
        >
          🎙 Speak
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <button onClick={onEnd}>End Session</button>
      </div>
    </div>
  );
}