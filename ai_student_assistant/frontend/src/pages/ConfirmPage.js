import React, {useEffect,useState} from "react";
import { useParams, useNavigate } from "react-router-dom";

const ConfirmPage = () => {
    const {token} = useParams();
    const navigate = useNavigate();
    const [message, setMessage] = useState("Confirming...");
    const [error, setError] = useState(false);

    useEffect(() => {
        const confirmAccount = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/confirm/${token}`);
                const data = await res.json();

                if(res.ok){
                    setMessage("Account confirmed successfully. Redirecting to login...");
                    setTimeout(() => navigate("/login"), 3000);
                }else{
                    setMessage(data.error || "Invalid or expired token.");
                    setError(true);
                }
            }catch(err){
                setMessage("An error occurred. Please try again later.");
                setError(true);
            }
        };

        confirmAccount();

    }, [token, navigate]);

    return(
        <div style={{padding: "40px", textAlign: "center"}}>
            <h2 style={{color: error ? "red" : "green"}}>{message}</h2>
        </div>
    );

};

export default ConfirmPage;