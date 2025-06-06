import React , { useEffect, useState } from "react";
import { FaCalendarAlt, FaCog, FaMusic, FaRobot, FaSignOutAlt, FaTasks, FaUser } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css"

const Navbar = ({username}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState("/default-avatar.png")
    const navigate = useNavigate();

useEffect(() => {
    const fetchUserInfo = async () => {
        try{
            const res = await fetch("https://www.fallnik.com/api/user-info", {
                credentials: "include"
            });

            const data= await res.json();
            if(res.ok){
                setAvatarUrl(data.avatar_url || "/default-avatar.png");
            }
        }catch(err){
            console.error("Failed to fetch user avatar ", err);
        }
    };

    fetchUserInfo();
}, [])


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
                src={avatarUrl}
                alt="avatar"
                className="avatar"
                onClick={() => setMenuOpen((prev) => !prev)}
            />

            {menuOpen && (
                <div className="dropdown-menu">
                    <Link to="/dashboard/profile"><FaUser /> Account </Link>
                    <Link to="/dashboard/settings"><FaCog /> Settings </Link>
                </div>
            )}
        </div>
    </nav>
);

};

export default Navbar;