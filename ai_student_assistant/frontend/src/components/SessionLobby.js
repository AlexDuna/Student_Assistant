import React, {useState} from "react";
import "./SessionLobby.css"
import Navbar from "./Navbar";
import { API_URL } from "../utils/config";

const SessionLobby = ({onJoin}) => {
    const [joinCode, setJoinCode] = useState("");

    const handleCreate = async () => {
        try{
            const res = await fetch (`${API_URL}/sessions/create`,{
                method: 'POST',
                credentials: 'include',
            });
            const data = await res.json();
            if(res.ok){
                onJoin(data.code);
            }else{
                alert("Failed to create session");
            }
        }catch(e){
            alert("Network error while creating session");
        }
    };

    const handleJoin = async () => {
        const code = joinCode.toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(code)){
            alert("Invalid code! Must be 6 alphanumeric characters.");
            return;
        }

        try{
            const res = await fetch(`${API_URL}/sessions/${code}/exists`,{
                credentials: 'include'
            });
            const data = await res.json();

            if(res.ok && data.exists){
                onJoin(code);
                setJoinCode("");
            }else{
                alert("Session code does not exist or has expired");
            }
        }catch(error){
            alert("Network error while validating session code");
        }
    };

    return (
        <>
        <Navbar/>
            <div className="gradient-background"></div>
            <div className="grain-overlay"></div>
            <div className="blob-container">
            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
            <div className="blob blob3"></div>
            <div className="blob blob4"></div>
            <div className="blob blob5"></div>

            </div>
        <div className="session-lobby">
            <h2>Study Sessions</h2>
            <div className="session-actions">
                <button onClick={handleCreate}> ➕ Create new session </button>
                <div className="join-box">
                    <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Enter Session Code"
                        maxLength={6}
                    />
                    <button onClick={handleJoin}>Join</button>
                </div>
            </div>
        </div>
        </>
    );
};

export default SessionLobby;