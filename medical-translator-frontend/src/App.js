import React, { useState, useRef } from "react";
import ConsentPage from "./pages/ConsentPage";
import TranslationPage from "./pages/TranslationPage";
import { connectWebSocket } from "./services/websocket";

function App() {
  const [stage, setStage] = useState("consent");
  const socketRef = useRef(null);

  if (!socketRef.current) {
    socketRef.current = connectWebSocket(() => {});
  }

  return (
    <>
      {stage === "consent" && (
        <ConsentPage
          socket={socketRef.current}
          onConsentGranted={() => setStage("translation")}
        />
      )}

      {stage === "translation" && (
        <TranslationPage
          socket={socketRef.current}
          onEnd={() => setStage("consent")}
        />
      )}
    </>
  );
}

export default App;