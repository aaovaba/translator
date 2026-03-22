import React, { useState } from "react";
import "./LoginPage.css";
import logo from "../assets/logo.png"; // 👈 add your logo here

function LoginPage({ onLogin, goToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail);

      localStorage.setItem("token", data.token);
      onLogin();

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">

        {/* 🔥 LOGO */}
        <img src={logo} alt="Company Logo" className="logo" />

        <h2>Medical Translator</h2>
        <p className="subtitle">AI-powered doctor-patient communication</p>

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="link-text" onClick={goToSignup}>
          New user? Signup
        </p>
      </div>
    </div>
  );
}

export default LoginPage;