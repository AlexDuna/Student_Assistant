import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AccountTab.css";
import "./SettingsTab.css"
import { FaCog, FaSignOutAlt } from "react-icons/fa";
import Navbar from "./Navbar";
import { Link } from "react-router-dom";

const SettingsTab =() =>{
    const navigate = useNavigate();

    const [spotifyConnected, setSpotifyConnected] = useState(false);

    useEffect(() => {
    const checkSpotify = async () => {
        try {
        const res = await fetch("https://www.fallnik.com/api/spotify/token", {
            credentials: "include"
        });
        const data = await res.json();
        setSpotifyConnected(!!data.token);
        } catch (err) {
        setSpotifyConnected(false);
        }
    };

    checkSpotify();
    }, []);


    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete your account? This action is irreversible.");
        if (!confirmDelete) return;
      
        try {
          const res = await fetch("https://www.fallnik.com/api/delete-account", {
            method: "DELETE",
            credentials: "include",
          });
      
          if (res.ok) {
            navigate("/register"); // Sau login, cum preferi
          } else {
            alert("Failed to delete account.");
          }
        } catch (err) {
          console.error("Delete failed", err);
        }
      };
      

    const handleLogout = async () => {
        try{
            await fetch("https://www.fallnik.com/api/spotify/pause", {
                method: "PUT",
                credentials: "include",
            });

            await fetch("https://www.fallnik.com/api/logout",{
                method: "POST",
                credentials: "include",
            });
            navigate("/login");
        }catch(err){
            console.error("Logout failed", err);
        }
    };

    return (
        <div className="account-tab-wrapper">
            <Navbar />
            <div className="gradient-background"></div>
            <div className="grain-overlay"></div>
            <div className="blob-container">
            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
            <div className="blob blob3"></div>
            <div className="blob blob4"></div>
            <div className="blob blob5"></div>
        </div>

        <div className="settings-tab">
            <h2><FaCog />Settings</h2>

            <div style={{ marginTop: "1.5rem" }}>
                <h3>Spotify Connection</h3>
                <p style={{ color: spotifyConnected ? "green" : "gray" }}>
                    {spotifyConnected ? "You are connected to Spotify ✅" : "Not connected to Spotify"}
                </p>
            </div>


            <hr />

            <div className="danger-zone">
            <h3>Danger Zone</h3>
            <button 
                onClick={handleDeleteAccount} 
                style={{ backgroundColor: "#e74c3c", marginTop: "0.5rem" }}
            >
                Delete Account
            </button>
            </div>

            <div style={{marginTop:"2rem", textAlign: "center"}}>
                <Link to="/privacy" style={{color: "#aaa", marginRight: 12}}>Privacy Policy</Link>
                <Link to="/terms" style={{color: "#aaa", marginRight: 12}}>Terms of Service</Link>
            </div>

            <button onClick={handleLogout} className="logout-btn">
                <FaSignOutAlt />Logout
            </button>
        </div>
        </div>
    );
};

export default SettingsTab;