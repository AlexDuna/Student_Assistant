import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { API_URL } from "../utils/config";

const ProtectedRoute = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(null); //null = loading

    useEffect(() =>{
        const checkAuth = async () => {
            try{
                const res = await fetch(`${API_URL}/check-session`,{
                    method: "GET",
                    credentials: "include" // ca sa trimita cookie-ul
                });

                if(res.ok){
                    const data = await res.json();
                    setIsAuthenticated(data.authenticated);
                }else{
                    setIsAuthenticated(false);
                }
            }catch(error){
                console.error("Session check error", error);
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    if(isAuthenticated === null) return <p>Loading...</p>;
    return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;