import React from "react";
import { useNavigate } from "react-router-dom";
import { getCookie } from "../utils/cookies";

const DashboardPage = () => {
    const navigate = useNavigate();
    const username = getCookie("username");

    const handleLogout = () =>{
        document.cookie = "isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        navigate("/login");
    }

    return(
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>Welcome, {username || "User"}</h1>
            <p>You are successfully logged in.</p>
            <button 
                onClick={handleLogout} 
                style={{
                    marginTop: "20px",
                    padding: "10px 20px",
                    backgroundColor: "#24146b",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer"
                }}
            >
                Logout
            </button>
        </div>
    );
};

export default DashboardPage;