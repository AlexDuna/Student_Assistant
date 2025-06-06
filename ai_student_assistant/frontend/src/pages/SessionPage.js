import React, {useEffect, useState} from "react";
import SessionLobby from "../components/SessionLobby";
import SessionRoom from "../components/SessionRoom";

const SessionsPage = () => {
    const [sessionCode, setSessionCode] = useState(null);

    useEffect(() => {
        const savedCode = localStorage.getItem("sessionCode");

        if(savedCode){
            setSessionCode(savedCode);
        }
    }, []);

    const handleJoin = (code) => {
        localStorage.setItem("sessionCode", code);
        setSessionCode(code);
    }

    const handleExit = () => {
        localStorage.removeItem("sessionCode");
        setSessionCode(null);
    }

    return(
    <div>
        {!sessionCode ? (
            <SessionLobby onJoin={handleJoin} />
        ):(
            <SessionRoom code = {sessionCode} onExit={handleExit}/>
        )
        }
    </div>
    );
};

export default SessionsPage;