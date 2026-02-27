import React, { useEffect, useState, useRef } from "react";
import "./ConsentPage.css";
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
        speakText(data.text);
      }

      if (data.type === "status") {
        if (data.text === "Consent granted.") {
          onConsentGranted();
        } else {
          alert("Consent denied.");
        }
      }
    };
  }, [socket, onConsentGranted]);

  useEffect(() => {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  const speakText = (text) => {
    if (!text) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = synth.getVoices();
    if (voices.length > 0) {
      utterance.voice = voices[0];
    }

    utterance.rate = 1;
    utterance.pitch = 1;

    synth.speak(utterance);
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
    }, 6000);

    mediaRecorderRef.current = mediaRecorder;
  };

//   return (
//     <div style={{ padding: "50px", textAlign: "center" }}>
//       <h2>Patient Consent</h2>

//       {!consentText && (
//         <button
//           onClick={startRecording}
//           style={{ padding: "15px 40px", fontSize: "18px" }}
//         >
//           🎙 Speak to Start
//         </button>
//       )}

//       {consentText && (
//         <div style={{ marginTop: "30px" }}>
//           <p style={{ fontSize: "22px" }}>{consentText}</p>

//           <div style={{ marginTop: "20px" }}>
//             <button
//               onClick={() => speakText(consentText)}
//               style={{ padding: "10px 30px", marginRight: "20px" }}
//             >
//               🔊 Play Consent
//             </button>

//             <button
//               onClick={startRecording}
//               style={{ padding: "15px 40px", fontSize: "18px" }}
//             >
//               🎙 Speak Your Answer
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
return (
  <div className="consent-container">
    <div className="consent-card">
      <div className="consent-header">The system will identify the patient's language and record the consent. Press the button below and ask the patient to speak.
      </div>
                

      {!consentText && (
        <button
          onClick={startRecording}
          className="btn btn-primary"
        >
          🎙 Press Here!
        </button>
      )}

      {consentText && (
        <>
          <div className="consent-text">{consentText}</div>

          <div className="button-group">
            <button
              onClick={() => speakText(consentText)}
              className="btn btn-secondary"
            >
              🔊 Play Consent
            </button>

            <button
              onClick={startRecording}
              className="btn btn-primary"
            >
              🎙 Record Your Answer
            </button>
          </div>
        </>
      )}
    </div>
  </div>
);

}