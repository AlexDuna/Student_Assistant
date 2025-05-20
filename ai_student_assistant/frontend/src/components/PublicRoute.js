import React from "react";
import { getCookie } from "../utils/cookies";
import { Navigate } from "react-router-dom";

const PublicRoute = ({children}) => {
    const isAuthenticated = getCookie('session_id') !== null;

    return isAuthenticated ? <Navigate to="/dashboard"/> : children;
};

export default PublicRoute;