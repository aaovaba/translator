import React, { useState } from "react";
import "./SignupPage.css";
import logo from "../assets/logo.png";

function SignupPage({ onSignup, goToLogin }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    city: ""
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      mobile,
      city
    } = form;

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

      const res = await fetch("http://localhost:8000/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.detail);

      alert("Signup successful! Please login.");
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

        {/* LOGO */}
        <img src={logo} alt="logo" className="logo" />

        <h2>Create Account</h2>
        <p className="subtitle">Start your AI medical translation experience</p>

        {/* Name Row */}
        <div className="row">
          <input
            name="firstName"
            placeholder="First Name"
            onChange={handleChange}
          />
          <input
            name="lastName"
            placeholder="Last Name"
            onChange={handleChange}
          />
        </div>

        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
        />

        <input
          name="mobile"
          placeholder="Mobile Number"
          onChange={handleChange}
        />

        <input
          name="city"
          placeholder="City"
          onChange={handleChange}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
        />

        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          onChange={handleChange}
        />

        <button onClick={handleSignup} disabled={loading}>
          {loading ? "Creating account..." : "Signup"}
        </button>

        <p className="link-text" onClick={goToLogin}>
          Already have an account? Login
        </p>

      </div>
    </div>
  );
}

export default SignupPage;