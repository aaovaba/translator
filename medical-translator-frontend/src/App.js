import React, { useState, useEffect } from "react";
import ConsentPage from "./pages/ConsentPage";
import TranslationPage from "./pages/TranslationPage";
import ThankYouPage from "./pages/ThankYouPage";

function App() {
  const [socket, setSocket] = useState(null);
  const [page, setPage] = useState("consent"); // consent | translation | thankyou
  const [summary, setSummary] = useState("");

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => {
      console.log("Connected to backend");
    };

    ws.onclose = () => {
      console.log("Disconnected from backend");
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const handleConsentGranted = () => {
    setPage("translation");
  };

  const handleSessionEnd = (sessionSummary) => {
    setSummary(sessionSummary);
    setPage("thankyou");
  };

  if (!socket) return <div>Connecting...</div>;

  if (page === "consent") {
    return (
      <ConsentPage
        socket={socket}
        onConsentGranted={handleConsentGranted}
      />
    );
  }

  if (page === "translation") {
    return (
      <TranslationPage
        socket={socket}
        onSessionEnd={handleSessionEnd}
      />
    );
  }

  if (page === "thankyou") {
    return <ThankYouPage summary={summary} />;
  }

  return null;
}

export default App;