import React, { useState } from "react";
import "./SignupPage.css";
import logo from "../assets/logo.png";

function SignupPage({ onSignup, goToLogin }) {
  const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
  
  // Step 1: Form | Step 2: OTP
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    city: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ==========================================
  // STEP 1: Submit Form & Request OTP
  // ==========================================
  const handleSignupSubmit = async () => {
    const { firstName, lastName, email, password, confirmPassword, mobile, city } = form;

    if (!firstName || !lastName || !email || !password || !confirmPassword || !mobile || !city) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, mobile, city })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Signup failed");

      if (data.requires_otp) {
        setStep(2); // Move to OTP screen
      }

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // STEP 2: Verify OTP
  // ==========================================
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      alert("Please enter a valid 6-digit code.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/auth/verify-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp }), // Send the email they signed up with
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Verification failed");

      alert("Email verified successfully! You can now login.");
      goToLogin();

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="signup-container">

        <img src={logo} alt="logo" className="logo" />
        <h2>Create Account</h2>

        {/* ======================= UI FOR STEP 1 (SIGNUP FORM) ======================= */}
        {step === 1 && (
          <>
            <p className="subtitle">Start your AI medical translation experience</p>

            <div className="row">
              <input name="firstName" placeholder="First Name" onChange={handleChange} />
              <input name="lastName" placeholder="Last Name" onChange={handleChange} />
            </div>

            <input name="email" type="email" placeholder="Email" onChange={handleChange} />
            <input name="mobile" placeholder="Mobile Number" onChange={handleChange} />
            <input name="city" placeholder="City" onChange={handleChange} />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} />
            <input name="confirmPassword" type="password" placeholder="Confirm Password" onChange={handleChange} />

            <button onClick={handleSignupSubmit} disabled={loading}>
              {loading ? "Creating account..." : "Signup"}
            </button>

            <p className="link-text" onClick={goToLogin}>
              Already have an account? Login
            </p>
          </>
        )}

        {/* ======================= UI FOR STEP 2 (OTP ENTRY) ======================= */}
        {step === 2 && (
          <>
            <p className="subtitle" style={{ color: "green", fontWeight: "bold" }}>
              We sent a verification code to {form.email}
            </p>

            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength="6"
              style={{ letterSpacing: "5px", textAlign: "center", fontSize: "1.2rem", marginTop: "15px", marginBottom: "15px" }}
            />

            <button onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}
            </button>

            <p className="link-text" onClick={() => setStep(1)}>
              Wrong email? Go back
            </p>
          </>
        )}

      </div>
    </div>
  );
}

export default SignupPage;