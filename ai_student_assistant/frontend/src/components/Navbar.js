import React , { useState } from "react";
import { FaCalendarAlt, FaCog, FaMusic, FaRobot, FaSignOutAlt, FaTasks, FaUser } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css"

const Navbar = ({username}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        try{
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
    <nav className="navbar">
        <div className="navbar-left">
            <img 
                src="/FallnikLogo.png"
                alt="logo"
                className="logo-image"
            />
        </div>

        <div className="navbar-right">
            <div className="nav-links">
            <Link to="/dashboard/sessions" className="nav-link"><FaTasks /> Sessions</Link>
            <Link to="/dashboard/ai" className="nav-link"><FaRobot /> Fallnik AI</Link>
            <Link to="/dashboard/music" className="nav-link"><FaMusic /> Music</Link>
            <Link to="/dashboard/calendar" className="nav-link"><FaCalendarAlt /> Calendar</Link>
        </div>

            <img
                src="/default-avatar.png"
                alt="avatar"
                className="avatar"
                onClick={() => setMenuOpen((prev) => !prev)}
            />

            {menuOpen && (
                <div className="dropdown-menu">
                    <Link to="/dashboard/profile"><FaUser /> Account </Link>
                    <Link to="/dashboard/settings"><FaCog /> Settings </Link>
                    <button onClick={handleLogout}> <FaSignOutAlt /> Logout</button>
                </div>
            )}
        </div>
    </nav>
);

};

export default Navbar;