import React, { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ConsentPage from "./pages/ConsentPage";
import TranslationPage from "./pages/TranslationPage";
import ThankYouPage from "./pages/ThankYouPage";

function App() {
  const [socket, setSocket] = useState(null);

  // login | signup | consent | translation | thankyou
  const [page, setPage] = useState(
    localStorage.getItem("token") ? "consent" : "login"
  );

  const [summary, setSummary] = useState("");

  // ✅ CREATE SOCKET ONLY ONCE
  useEffect(() => {
    if (page === "login" || page === "signup") return;

    const token = localStorage.getItem("token");

    const ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`);

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
  }, []); // ❗ IMPORTANT: empty dependency array

  // 🔐 Auth handlers
  const handleLogin = () => setPage("consent");
  const goToSignup = () => setPage("signup");
  const goToLogin = () => setPage("login");

  // 🧠 Flow
  const handleConsentGranted = () => setPage("translation");

  const handleSessionEnd = (sessionSummary) => {
    setSummary(sessionSummary);
    setPage("thankyou");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setPage("login");
    setSocket(null);
  };

  // ---------- ROUTING ----------

  if (page === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        goToSignup={goToSignup}
      />
    );
  }

  if (page === "signup") {
    return (
      <SignupPage
        onSignup={handleLogin}
        goToLogin={goToLogin}
      />
    );
  }

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
        onLogout={handleLogout}
      />
    );
  }

  if (page === "thankyou") {
    return (
      <ThankYouPage
        summary={summary}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}

export default App;