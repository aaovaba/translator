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

  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState("");

  // ✅ WebSocket setup (GLOBAL)
  // useEffect(() => {
  //   const token = localStorage.getItem("token");

  //   if (!token) return;

  //   // prevent multiple connections
  //   if (socket) return;

  //   const ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`);

  //   ws.onopen = () => {
  //     console.log("Connected to backend");
  //   };

  //   ws.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     console.log("Received:", data);

  //     setMessages((prev) => [...prev, data]);
  //   };

  //   ws.onclose = () => {
  //     console.log("Disconnected from backend");
  //   };

  //   setSocket(ws);

  //   return () => {
  //     ws.close();
  //   };
  // }, [page]); // 🔥 triggers after login
  useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) return;

  const ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`);

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

  // ❗ ONLY CLOSE when app unloads
  window.addEventListener("beforeunload", () => {
    ws.close();
  });

}, []);

  // 🔐 Auth handlers
  const handleLogin = () => {
    setPage("consent");
  };

  const goToSignup = () => setPage("signup");
  const goToLogin = () => setPage("login");

  // 🧠 Flow handlers
  const handleConsentGranted = () => {
    setPage("translation");
  };

  const handleSessionEnd = (sessionSummary) => {
    setSummary(sessionSummary);
    setPage("thankyou");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (socket) {
    socket.close(); // 🔥 close connection properly
    }
    setSocket(null);
    setMessages([]);
    setPage("login");
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

  // show connecting only when needed
  if ((page === "consent" || page === "translation") && !socket) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        Connecting...
      </div>
    );
  }

  if (page === "consent") {
    return (
      <ConsentPage
        socket={socket}
        messages={messages}
        onConsentGranted={handleConsentGranted}
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