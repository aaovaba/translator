import React, { useState } from "react";
import "./SignupPage.css";
function SignupPage({ onSignup, goToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const res = await fetch("http://localhost:8000/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Signup successful, please login");
      goToLogin();
    } else {
      alert(data.detail);
    }
  };

//   return (
//     <div>
//       <h2>Signup</h2>

//       <input
//         type="email"
//         placeholder="Email"
//         onChange={(e) => setEmail(e.target.value)}
//       />

//       <input
//         type="password"
//         placeholder="Password"
//         onChange={(e) => setPassword(e.target.value)}
//       />

//       <button onClick={handleSignup}>Signup</button>

//       <p onClick={goToLogin} style={{ cursor: "pointer" }}>
//         Already have an account? Login
//       </p>
//     </div>
//   );

return (
  <div className="signup-container">
    <h2>Signup</h2>

    <input
      type="email"
      placeholder="Email"
      onChange={(e) => setEmail(e.target.value)}
    />

    <input
      type="password"
      placeholder="Password"
      onChange={(e) => setPassword(e.target.value)}
    />

    <button onClick={handleSignup}>Signup</button>

    <p className="signup-link-text" onClick={goToLogin}>
      Already have an account? Login
    </p>
  </div>
);
}

export default SignupPage;