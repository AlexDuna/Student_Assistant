import React from "react";
import { Navigate } from "react-router-dom";
import { getCookie } from "../utils/cookies";

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = getCookie('session_id') === 'true';

    return isAuthenticated ? children : <Navigate to ="/login" />;
};

export default ProtectedRoute;