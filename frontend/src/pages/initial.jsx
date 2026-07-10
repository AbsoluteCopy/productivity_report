import React from 'react';
import { useNavigate } from 'react-router-dom';

const Initial = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#065d48',
            padding: '20px'
        }}>
            <div style={{
                textAlign: 'center',
                color: 'white'
            }}>
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    marginBottom: '1rem'
                }}>
                    Productivity Report
                </h1>
                <p style={{
                    fontSize: '1.2rem',
                    marginBottom: '2rem',
                    opacity: 0.9
                }}>
                    Track and analyze your team's productivity
                </p>
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        backgroundColor: 'white',
                        color: '#065d48',
                        border: 'none',
                        padding: '15px 40px',
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                    }}
                >
                    Login
                </button>
            </div>
        </div>
    );
};

export default Initial;