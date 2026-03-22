import React, { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ConsentPage from "./pages/ConsentPage";
import TranslationPage from "./pages/TranslationPage";
import ThankYouPage from "./pages/ThankYouPage";
import ProfilePage from "./pages/ProfilePage";
import SessionDetailPage from "./pages/SessionDetailPage";
function App() {
  const [socket, setSocket] = useState(null);

  const [page, setPage] = useState(
    localStorage.getItem("token") ? "consent" : "login"
  );

  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  // ✅ WebSocket (ONLY ONCE)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // const ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`);

    const WS_URL = "https://translator-4-v7xw.onrender.com";

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);

    ws.onopen = () => {
      console.log("Connected to backend");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
    };

    ws.onclose = () => {
      console.log("Disconnected from backend");
    };

    setSocket(ws);

    window.addEventListener("beforeunload", () => {
      ws.close();
    });

  }, []);

  // 🔐 Auth
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
    localStorage.removeItem("user");

    if (socket) socket.close();

    setSocket(null);
    setMessages([]);
    setPage("login");
  };

  // ---------- ROUTING ----------

  if (page === "login") {
    return <LoginPage onLogin={handleLogin} goToSignup={goToSignup} />;
  }

  if (page === "signup") {
    return <SignupPage onSignup={handleLogin} goToLogin={goToLogin} />;
  }

  if ((page === "consent" || page === "translation") && !socket) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>Connecting...</div>;
  }

  if (page === "consent") {
    return (
      <ConsentPage
        socket={socket}
        messages={messages}
        onConsentGranted={handleConsentGranted}
        onLogout={handleLogout}   // ✅ added
      />
    );
  }

  if (page === "translation") {
    return (
      <TranslationPage
        socket={socket}
        messages={messages}
        onSessionEnd={handleSessionEnd}
        onLogout={handleLogout}
        goToProfile={() => setPage("profile")}
      />
    );
  }

  if (page === "profile") {
  return (
    <ProfilePage
      onBack={() => setPage("translation")}
      onSelectSession={(id) => {
        setSelectedSession(id);
        setPage("sessionDetail");
      }}
    />
  );
}

if (page === "sessionDetail") {
  return (
    <SessionDetailPage
      sessionId={selectedSession}
      onBack={() => setPage("profile")}
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