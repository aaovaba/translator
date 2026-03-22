import React, { useEffect, useState } from "react";

export default function ProfilePage({ onSelectSession }) {
  const [sessions, setSessions] = useState([]);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const BASE_URL = process.env.REACT_APP_API_URL;
  useEffect(() => {
    fetch(`${BASE_URL}/sessions`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    })
      .then(res => res.json())
      .then(data => {
  if (Array.isArray(data)) {
    setSessions(data);
  } else {
    console.error("Invalid sessions response:", data);
    setSessions([]);
  }
});
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2>Profile</h2>

      <p>{user.firstName} {user.lastName}</p>
      <p>{user.email}</p>
      <p>{user.city}</p>

      <h3>Session History</h3>

      {Array.isArray(sessions) && sessions.map((s) => (
        <div
          key={s._id}
          onClick={() => onSelectSession(s._id)}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginTop: 10,
            cursor: "pointer"
          }}
        >
          {new Date(s.started_at).toLocaleString()}
        </div>
      ))}
    </div>
  );
}