import React, { useState } from "react";
import { useEffect, useRef } from "react";
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
    const [isPaused, setIsPaused] = useState(false);
    const trackSectionRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(null);


    const handleSpotifyLogout = async () => {
        await fetch("https://www.fallnik.com/api/spotify/logout",{
            method:"POST",
            credentials: "include"
        });

        window.location.href="/dashboard";
    };

    const openPlaylist = async (playlistId, isCustom = false, items=[]) => {
        setSelectedPlaylist(playlistId);

        if (isCustom && items.length > 0){
            setPlaylistTracks(items);
            setTimeout(() => {
                trackSectionRef.current?.scrollIntoView({behavior: "smooth"});
            }, 100)
            return;
        }

        const res = await fetch(`https://www.fallnik.com/api/spotify/playlist/${playlistId}/tracks`,{
            credentials: "include"
        });
        const data = await res.json();
        if (data.items){
            setPlaylistTracks(data.items);
            setTimeout( () => {
                trackSectionRef.current?.scrollIntoView({behavior: "smooth"});
            }, 100);
        }
    }

    const playTrack = async (uri, index = null) => {
        const res = await fetch("https://www.fallnik.com/api/spotify/play-track",{
            method: "PUT",
            headers: {
                "Content-Type" : "application/json"
            },
            credentials: "include",
            body: JSON.stringify({uri})
        });

        const data = await res.json();
        if (data.error) {
            console.error("Play error: ", data.error);
        } else {
            console.log("Track started");
            setIsSearchMode(false);
            if (index !== null) {
                setCurrentTrackIndex(index); 
            }
        }
    }

    const pausePlayback = async () => {
        await fetch("https://www.fallnik.com/api/spotify/pause",{
            method:"PUT",
            credentials: "include"
        });
    };

    const nextTrack = async () => {
        if (
            selectedPlaylist &&
            playlistTracks.length > 0 &&
            currentTrackIndex !== null &&
            currentTrackIndex < playlistTracks.length - 1
        ) {
            const nextIndex = currentTrackIndex + 1;
            const nextTrackUri = playlistTracks[nextIndex].track.uri;
            await playTrack(nextTrackUri, nextIndex);
        } else {
            // fallback la API-ul nativ Spotify
            await fetch("https://www.fallnik.com/api/spotify/next", {
                method: "POST",
                credentials: "include"
            });
        }
    }

    const handlePrevious = async () => {
        if (
            selectedPlaylist &&
            playlistTracks.length > 0 &&
            currentTrackIndex !== null &&
            currentTrackIndex > 0
        ) {
            const prevIndex = currentTrackIndex - 1;
            const prevTrackUri = playlistTracks[prevIndex].track.uri;
            await playTrack(prevTrackUri, prevIndex);
        } else {
            // fallback la API-ul nativ Spotify
            await fetch("https://www.fallnik.com/api/spotify/previous", {
                method: "POST",
                credentials: "include"
            });
        }
    }

    const togglePlayback = async () => {
        const endpoint = isPaused ? "resume" : "pause";
        await fetch(`https://www.fallnik.com/api/spotify/${endpoint}`,{
            method: "PUT",
            credentials: "include"
        });

        setIsPaused(!isPaused);
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

            fetch("https://www.fallnik.com/api/spotify/player-status",{
                method: "GET",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data => {
                if(typeof data.is_playing !== "undefined"){
                    setIsPaused(!data.is_playing);
                }
            });

            const currentlyInterval = setInterval(() => {
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
        }, 3000);
        

        const recentInterval = setInterval(() => {
            fetch("https://www.fallnik.com/api/spotify/recent-tracks",{
                method: "GET",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data => {
                if(data.items) {
                    const uniqueTracksMap = new Map();
                    const uniqueTracks = [];

                    data.items.forEach(item => {
                        const trackId = item.track.id;
                        if(!uniqueTracksMap.has(trackId)){
                            uniqueTracksMap.set(trackId, true);
                            uniqueTracks.push(item);
                        }
                    });
                    setPlaylists(prev => {
                        const withoutRecent = prev.filter(p => p.id !== "recent");
                        return [
                            ...withoutRecent,
                        {
                            id: "recent",
                            name: "🕘Recently Played",
                            tracks: {total: uniqueTracks.length },
                            images: [{
                                url: uniqueTracks[0]?.track.album.images[0]?.url || "https://via.placeholder.com/300"
                            }],
                            isRecentlyPlayed: true,
                            items: uniqueTracks
                        }
                    ];
                });
                }
            });
        }, 10000);


            fetch("https://www.fallnik.com/api/spotify/playlists",{
                method: "GET",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data => {
                if(data.items) setPlaylists(data.items);
            });

            fetch("https://www.fallnik.com/api/spotify/liked-tracks",{
                method: "GET",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data => {
                if(data.items){
                    setPlaylists(prev => [
                        ...prev,
                        {
                            id: "liked",
                            name: "❤️ Liked Songs",
                            tracks: {total: data.items.length} ,
                            images: [{
                                url: data.items[0]?.track.album.images[0]?.url || "https://via.placeholder.com/300"
                            }],
                            isLikedSongs: true,
                            items: data.items
                        }
                    ]);
                }
            });

            return () => {
                clearInterval(recentInterval);
                clearInterval(currentlyInterval);
            }
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            const trimmed = searchQuery.trim();
            if(!trimmed){
                setIsSearchMode(false);
                setSelectedPlaylist(null);       
                setPlaylistTracks([]);            
                return;
            }
            if(!searchQuery.trim()){
                setIsSearchMode(false);
                return;
            }

            fetch(`https://www.fallnik.com/api/spotify/search?q=${encodeURIComponent(trimmed)}`,{
                method: "GET",
                credentials: "include"
            })
            .then(res => res.json())
            .then(data => {
                if(data.tracks && data.tracks.items){
                    setSearchResults(data.tracks.items);
                    setPlaylistTracks(data.tracks.items.map(track => ({track})));
                    setSelectedPlaylist("__search__");
                    setIsSearchMode(true);
                }
            });
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

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
                            <button onClick={handlePrevious} className="spotify-control-button">⏮</button>
                            <button onClick={togglePlayback} className="spotify-control-button">{isPaused ? "▶" : "⏸"}</button>
                            <button onClick={nextTrack} className="spotify-control-button">⏭</button>
                        </div>
                    </div>
                )}

                <div style={{marginTop: "20px", marginBottom:"30px", display: "flex", gap: "10px", alignItems: "center"}}>
                <div style={{ position: "relative", width: "300px" }}>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search Spotify tracks..."
                    style={{
                        padding: "10px 35px 10px 10px",
                        width: "100%",
                        borderRadius: "10px",
                        border: "1px solid #ccc",
                        boxSizing: "border-box"
                    }}
                />
                </div>

                </div>

                {!isSearchMode && (
                    <>
                        <h3 style={{marginTop: "40px", color:"#24146b"}}>🎵 Your Playlists</h3>
                        <div className="dashboard-grid">
                            {playlists.length > 0 ? (
                                playlists.map((playlist) => (
                                    <a
                                        key={playlist.id || playlist.name}
                                        className="dashboard-card"
                                        onClick={() =>
                                            openPlaylist(
                                                playlist.id,
                                                playlist.isLikedSongs || playlist.isRecentlyPlayed,
                                                playlist.items
                                            )
                                        }
                                        style={{ cursor: "pointer" }}
                                    >
                                        <img
                                            src={playlist.images[0]?.url}
                                            alt={playlist.name}
                                            style={{
                                                width: "100%",
                                                borderRadius: "12px",
                                                marginBottom: "10px",
                                            }}
                                        />
                                        <h3>{playlist.name}</h3>
                                        <p>{playlist.tracks.total} tracks</p>
                                    </a>
                                ))
                            ) : (
                                <p style={{ color: "#ccc" }}>No playlists found.</p>
                            )}
                        </div>
                    </>
                )}


                {selectedPlaylist && playlistTracks.length > 0 && (
                    isSearchMode ? (
                        <div
                        ref={trackSectionRef}
                        className={isSearchMode ? "search-mode-box" : ""}
                        style={{ marginTop: "30px" }}
                      >
                      
                        <h3 style={{color: "#24146b"}}>
                            {isSearchMode ? "🔎 Search Results" : "🎵 Tracks in Playlist"}
                        </h3>

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
                                            onClick={() => playTrack(track.uri, index)}
                                        >
                                            ▶Play
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ):( 
                    
                    <div style={{marginTop: "30px"}} ref={trackSectionRef}>
                    <h3 style={{color: "#24146b"}}>
                        {isSearchMode ? "🔎 Search Results" : "🎵 Tracks in Playlist"}
                    </h3>

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
                                        onClick={() => playTrack(track.uri, index)}
                                    >
                                        ▶Play
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                )
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