import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/config";
import "./DashboardPage.css";
import Navbar from "../components/Navbar";

const DashboardPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const fetchUsername = async () => {
            try{
                const res = await fetch (`${API_URL}/check-session`,{
                    method: "GET",
                    credentials: "include"
                });

                if(res.ok){
                    const data = await res.json();
                    setUsername(data.username);
                }else{
                    navigate("/login");
                }
            }catch(err){
                navigate("login");
            }finally{
                setLoading(false);
            }
    };

    fetchUsername();
}, [navigate]);


    const handleLogout = async () =>{
        try{
            await fetch(`${API_URL}/logout`,{
                method:"POST",
                credentials:"include"    
            });

            navigate("/login");
        }catch(err){
            console.error("Logout failed", err);
        }
    };

    if (loading) return <p> Loading...</p>

    return(
        <div className="dashboard-container" style={{paddingTop: "80px"}}>
            <Navbar username={username}/>
            <div className="gradient-background"></div>
            <div className="grain-overlay"></div>
            <div className="blob-container">
            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
            <div className="blob blob3"></div>
            <div className="blob blob4"></div>
            <div className="blob blob5"></div>

            </div>

            <div className="dashboard-main">
                <h2 className="dashboard-title">Welcome back, {username}</h2>
                <p>How can i help you?</p>
            </div>
        </div>
    );
};

export default DashboardPage;