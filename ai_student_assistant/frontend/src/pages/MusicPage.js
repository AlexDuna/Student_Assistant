import React, { useState } from "react";
import { useEffect } from "react";
import "./DashboardPage.css";
import Navbar from "../components/Navbar";
import SpotifyLoginButton from "../components/SpotifyLoginButton";

const MusicPage = () => {
    const [currentTrack, setCurrentTrack] = useState(null);
    const [profile, setProfile] = useState(null);
    const [playlists, setPlaylists] = useState([]);
    const [error, setError] = useState(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistTracks, setPlaylistTracks] = useState([]);

    const handleSpotifyLogout = async () => {
        await fetch("https://www.fallnik.com/api/spotify/logout",{
            method:"POST",
            credentials: "include"
        });

        window.location.href="/dashboard";
    };

    const openPlaylist = async (playlistId) => {
        setSelectedPlaylist(playlistId);
        const res = await fetch(`https://www.fallnik.com/api/spotify/playlist/${playlistId}/tracks`,{
            credentials: "include"
        });
        const data = await res.json();
        if (data.items) setPlaylistTracks(data.items);
    }

    const playTrack = async (uri) => {
        const res = await fetch("https://www.fallnik.com/api/spotify/play-track",{
            method: "PUT",
            headers: {
                "Content-Type" : "application/json"
            },
            credentials: "include",
            body: JSON.stringify({uri})
        });

        const data = await res.json();
        if(data.error){
            console.error("Play error: ", data.error);
        }else{
            console.log("Track started");
        }
    }

    const pausePlayback = async () => {
        await fetch("https://www.fallnik.com/api/spotify/pause",{
            method:"PUT",
            credentials: "include"
        });
    };

    const nextTrack = async () => {
        await fetch("https://www.fallnik.com/api/spotify/next",{
            method:"POST",
            credentials: "include"
        })
    }

    useEffect(() => {
            fetch("https://www.fallnik.com/api/spotify/profile",{
                method: "GET",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data=>{
                if (!data.error) setProfile(data);
            });

            const interval = setInterval(() => {
            fetch("https://www.fallnik.com/api/spotify/currently-playing",{
                method: "GET",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data => {
                if(data.item){
                    setCurrentTrack({
                        name: data.item.name,
                        artist: data.item.artists.map(a => a.name).join(", "),
                        albumImage: data.item.album.images[0].url,
                        link: data.item.external_urls.spotify
                    });
                }else if (data.message){
                    setError(data.message);
                }
            });
            }, 2000);

            fetch("https://www.fallnik.com/api/spotify/playlists",{
                method: "GET",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data => {
                if(data.items) setPlaylists(data.items);
            });
            return () => clearInterval(interval);
    }, []);

    return (
        <>
        <Navbar />
        {!profile?.display_name ? (
            <div className="spotify-login-section">
                <h3>Connect to a spotify account</h3>
                <SpotifyLoginButton />
            </div>
        ):(
        <div className="dashboard-container" style={{marginTop:"50px"}}>
            <div className="dashboard-header">
                <div className="welcome-text">
                    Welcome{profile && `, ${profile.display_name}`}
                </div>
                {profile && (
                    <div className="profile-area">
                        <img src={profile.images[0]?.url || "https://via.placeholder.com/42"} alt="Avatar" className="profile-avatar"/>
                    </div>
                )}
            </div>

            <div className="dashboard-main">
                <h2 className="dashboard-title">🎶 Your Music Dashboard</h2>

                {currentTrack && (
                    <div className="dashboard-card">
                        <p style={{color: "#62f83c"}}>Currently Playing</p>
                        <img src={currentTrack.albumImage} alt="Album" style={{width: "100px", borderRadius: "10px"}} />
                        <h3>{currentTrack.name}</h3>
                        <p>by {currentTrack.artist}</p>
                        <a href={currentTrack.link} target="_blank" rel="noopener noreferrer">Open in Spotify</a>

                        <div style={{marginTop: "15px", display: "flex", gap: "10px", justifyContent: "center"}}>
                            <button onClick={pausePlayback} className="spotify-control-button">⏸</button>
                            <button onClick={nextTrack} className="spotify-control-button">⏭</button>
                        </div>
                    </div>
                )}

                <h3 style={{marginTop: "40px", color:"#fff"}}>🎵 Your Playlists</h3>
                <div className="dashboard-grid">
                    {playlists.length > 0 ? (playlists.map((playlist)=>(
                        <a key={playlist.id || playlist.name} className="dashboard-card" onClick={() => openPlaylist(playlist.id)} style={{cursor: "pointer"}}>
                            <img src={playlist.images[0]?.url} alt={playlist.name} style={{width:"100%", borderRadius:"12px", marginBottom:"10px"}} />
                            <h3>{playlist.name}</h3>
                            <p>{playlist.tracks.total} tracks</p>
                        </a>
                    ))):(
                        <p style={{color: "#ccc"}}>No playlists found.</p>
                    )}
                </div>

                {selectedPlaylist && playlistTracks.length > 0 && (
                    <div style={{marginTop: "30px"}}>
                        <h3 style={{color: "#fff"}}>Tracks in playlist</h3>
                        <div className="dashboard-grid">
                            {playlistTracks.map((trackObj, index) => {
                                const track = trackObj.track;
                                return(
                                    <div key={track.id || index } className="dashboard-card">
                                        <img src={track.album.images[0]?.url} alt={track.name} style={{width: "100%", borderRadius: "12px", marginBottom:"10px"}} />
                                        <h4>{track.name}</h4>
                                        <p>{track.artists.map(a => a.name).join(", ")}</p>
                                        <button 
                                            style={{
                                                marginTop: "10px",
                                                padding: "6px 12px",
                                                background: "#1DB954",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "8px",
                                                cursor: "pointer"
                                            }}
                                            onClick={() => playTrack(track.uri)}
                                        >
                                            ▶Play
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="logout-wrapper">
                    <button onClick={handleSpotifyLogout} className="spotify-logout-button">
                        Logout from Spotify
                    </button>
                </div>
            </div>
        </div>
        )}
        </>
    );
}

export default MusicPage;