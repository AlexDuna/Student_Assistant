import React from "react";
import "./Navbar.css"
import { FaSpotify } from "react-icons/fa";

const SpotifyLoginButton = () => {
    const handleLogin = () => {
        const client_id = "109d7ea8b7ad48b087a80c5fc8f84868";
        const redirect_uri = "https://www.fallnik.com/api/spotify/callback";
        const scope = [
            "streaming",
            "user-read-email",
            "user-read-private",
            "user-modify-playback-state",
            "user-read-playback-state",
            "user-library-read",
            "user-read-currently-playing",
            "user-read-recently-played",
            "playlist-read-private",
            "playlist-read-collaborative"
        ].join(" ");

        const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

        window.location.href= authUrl;
    };

    return <button onClick={handleLogin} className="spotify-login-button"> <FaSpotify />Connect Spotify</button>
};

export default SpotifyLoginButton;