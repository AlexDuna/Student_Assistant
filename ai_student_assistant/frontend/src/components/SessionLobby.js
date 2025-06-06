import React, {useState} from "react";
import "./SessionLobby.css"

const generateSessionCode = () =>{
    return Math.random().toString(36).substring(2,8).toUpperCase();  //de exemplu A1D6C4
};

const SessionLobby = ({onJoin}) => {
    const [joinCode, setJoinCode] = useState("");

    const handleCreate = () => {
        const code = generateSessionCode();
        onJoin(code);
    };

    const handleJoin = () => {
        const code = joinCode.toUpperCase();
        if (/^[A-Z0-9]{6}$/.test(code)){
            onJoin(joinCode.toUpperCase());
            setJoinCode("");
        }else{
            alert("Invalid code! Must be 6 alphanumeric characters.");
        }
    };

    return (
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
    );
};

export default SessionLobby;