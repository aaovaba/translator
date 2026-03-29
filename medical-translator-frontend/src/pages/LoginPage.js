import React, { useState } from "react";
import "./LoginPage.css";
import logo from "../assets/logo.png"; 

function LoginPage({ onLogin, goToSignup }) {
  // Step 1: Credentials | Step 2: OTP
  const [step, setStep] = useState(1); 
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

  // ==========================================
  // STEP 1: Verify Credentials & Request OTP
  // ==========================================
  const handleLoginSubmit = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail);

      if (data.requires_otp) {
        // Switch to OTP entry view
        setStep(2); 
      }

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2: Verify OTP & Get Token
  // ==========================================
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      alert("Please enter a valid 6-digit code.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail);

      // Login Success! Save Token & Role
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user?.role || "user"); 

      // Trigger the page change in App.js
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

        <img src={logo} alt="Company Logo" className="logo" />
        <h2>Medical Translator</h2>

        {/* ======================= UI FOR STEP 1 (EMAIL/PASSWORD) ======================= */}
        {step === 1 && (
          <>
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

            <button onClick={handleLoginSubmit} disabled={loading}>
              {loading ? "Verifying..." : "Login"}
            </button>

            <p className="link-text" onClick={goToSignup}>
              New user? Signup
            </p>
          </>
        )}

        {/* ======================= UI FOR STEP 2 (OTP ENTRY) ======================= */}
        {step === 2 && (
          <>
            <p className="subtitle" style={{ color: "green", fontWeight: "bold" }}>
              Code sent to {email}
            </p>

            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength="6"
              style={{ letterSpacing: "5px", textAlign: "center", fontSize: "1.2rem" }}
            />

            <button onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Verifying Code..." : "Verify & Login"}
            </button>

            <p className="link-text" onClick={() => setStep(1)}>
              Didn't get the code? Go back
            </p>
          </>
        )}

      </div>
    </div>
  );
}

export default LoginPage;