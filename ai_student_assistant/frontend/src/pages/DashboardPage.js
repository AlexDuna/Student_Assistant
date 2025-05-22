import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/config";

const DashboardPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);

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