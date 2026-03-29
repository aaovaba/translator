import React, { useState } from 'react';
import axios from 'axios';

const AdminLoginPage = ({ onLogin, goToUserLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Adjust this URL to match your backend
            const response = await axios.post('http://localhost:8000/admin/login', {
                email,
                password
            });

            // Save tokens
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', response.data.user.role);

            // Tell App.js to switch to the dashboard
            onLogin(); 

        } catch (err) {
            if (err.response && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Server error. Please try again.");
            }
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center' }}>
            <h2>Admin Login</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input 
                    type="email" 
                    placeholder="Admin Email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    style={{ padding: '10px' }}
                />
                <input 
                    type="password" 
                    placeholder="Password"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    style={{ padding: '10px' }}
                />
                <button type="submit" style={{ padding: '10px', backgroundColor: 'black', color: 'white' }}>
                    Access Dashboard
                </button>
            </form>

            <button onClick={goToUserLogin} style={{ marginTop: '20px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
                Back to User Login
            </button>
        </div>
    );
};

export default AdminLoginPage;