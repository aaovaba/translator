import React, { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ConsentPage from "./pages/ConsentPage";
import TranslationPage from "./pages/TranslationPage";
import ThankYouPage from "./pages/ThankYouPage";
import ProfilePage from "./pages/ProfilePage";
import SessionDetailPage from "./pages/SessionDetailPage";

// ✅ Admin Pages
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

function App() {
  const [socket, setSocket] = useState(null);

  const [page, setPage] = useState(() => {
    if (window.location.pathname === "/admin") {
      window.history.pushState({}, '', '/'); 
      return "adminLogin";
    }

    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role === "admin") return "adminDashboard";
    if (token) return "consent";
    return "login";
  });

  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);

  // ✅ WebSocket logic (FIXED)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    
    // 1. If no token, or user is an admin, do NOT connect.
    if (!token || role === "admin") return; 

    // 2. If already connected, do NOT connect again.
    if (socket && socket.readyState === WebSocket.OPEN) return;

    // 3. ONLY connect if we are actively on the translation or consent pages.
    if (page !== "consent" && page !== "translation") return;

    const WS_URL = "wss://translator-4-v7xw.onrender.com";
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
      setSocket(null); // Clear socket state on disconnect
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
    
    // 👇 THIS IS THE FIX! Passing 'page' makes this run instantly after login.
  }, [page]); 

  // 🔐 Auth Handlers
  const handleLogin = () => setPage("consent");
  const goToSignup = () => setPage("signup");
  const goToLogin = () => setPage("login");
  
  // 🔐 Admin Handlers
  const handleAdminLoginSuccess = () => setPage("adminDashboard");
  const goToAdminLogin = () => setPage("adminLogin");

  // 🧠 Flow Handlers
  const handleConsentGranted = () => setPage("translation");

  const handleSessionEnd = (sessionSummary) => {
    setSummary(sessionSummary);
    setPage("thankyou");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role"); 

    if (socket) socket.close();

    setSocket(null);
    setMessages([]);
    setPage("login");
  };

  // ---------- ROUTING ----------

  // 🛡️ Admin Routes
  if (page === "adminLogin") {
    return <AdminLoginPage onLogin={handleAdminLoginSuccess} goToUserLogin={goToLogin} />;
  }

  if (page === "adminDashboard") {
    return <AdminDashboardPage onLogout={handleLogout} />;
  }

  // 🧑‍💻 Regular User Routes
  if (page === "login") {
    return <LoginPage onLogin={handleLogin} goToSignup={goToSignup} />;
  }

  if (page === "signup") {
    return <SignupPage onSignup={handleLogin} goToLogin={goToLogin} />;
  }

  // 👇 The "Connecting" screen will now only show for a fraction of a second
  if ((page === "consent" || page === "translation") && !socket) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>Connecting...</div>;
  }

  if (page === "consent") {
    return (
      <ConsentPage
        socket={socket}
        messages={messages}
        onConsentGranted={handleConsentGranted}
        onLogout={handleLogout}
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
    return <ThankYouPage summary={summary} onLogout={handleLogout} />;
  }

  return null;
}

export default App;