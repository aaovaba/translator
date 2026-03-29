import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboardPage = ({ onLogout }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:8000/admin'; // Adjust to your backend URL

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                alert("Session expired or unauthorized. Logging out.");
                onLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/users/${userId}/toggle-status`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update user status");
        }
    };

    if (loading) return <h2 style={{ textAlign: "center", marginTop: "50px" }}>Loading Dashboard...</h2>;

    return (
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Admin Control Panel</h2>
                <button onClick={onLogout} style={{ padding: '8px 16px', backgroundColor: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Logout Admin
                </button>
            </div>

            <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f4f4f4', textAlign: 'left' }}>
                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Name</th>
                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Email</th>
                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Role</th>
                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Status</th>
                        <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user._id}>
                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{user.firstName} {user.lastName}</td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{user.email}</td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{user.role || 'user'}</td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd', color: user.is_active === false ? 'red' : 'green' }}>
                                {user.is_active === false ? 'Suspended' : 'Active'}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                                {user.role !== 'admin' && ( // Prevent admins from banning themselves!
                                    <button 
                                        onClick={() => handleToggleStatus(user._id)}
                                        style={{ padding: '5px 10px', cursor: 'pointer' }}
                                    >
                                        {user.is_active === false ? 'Activate' : 'Suspend'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminDashboardPage;