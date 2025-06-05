import React, {createContext, useEffect, useState, useRef} from "react";
import { API_URL } from "./config";

export const MusicPlayerContext = createContext();

export const MusicPlayerProvider = ({ children }) => {
    const [player, setPlayer] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [track, setTrack] = useState(null);
    const [isPaused, setIsPaused] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const playerRef = useRef(null);
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
    const [volume, setVolume] = useState(
        parseFloat(localStorage.getItem("spotifyVolume")) || 0.5
      );
    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);

    useEffect (() => {
        const loadPlayer = async () => {
            const tokenRes = await fetch(`${API_URL}/spotify/token`, {
                credentials: "include"
            });
            const {token} = await tokenRes.json();

            if (!token) {
                console.error("No Spotify token found");
                return;
              }

            const waitForSpotify = () =>
                new Promise((resolve) => {
                    if(window.Spotify) return resolve();
                    window.onSpotifyWebPlaybackSDKReady = resolve;
                });

            await waitForSpotify();

            const spotifyPlayer = new window.Spotify.Player({
                name: "Fallnik Web Player",
                getOAuthToken: (cb) => cb(token),
                volume: 0.5,
            });

            spotifyPlayer.addListener("ready", ({ device_id}) => {
                setDeviceId(device_id);
                setIsReady(true);
                transferPlayback(device_id, token);
            });

            spotifyPlayer.addListener("player_state_changed", (state) => {
                if (!state) return;
              
                setTrack(state.track_window.current_track);
                setIsPaused(state.paused);
              
                const isTrackEnded =
                  state.paused &&
                  state.position === 0 &&
                  state.track_window.previous_tracks.length &&
                  !state.track_window.next_tracks.length;
              
                if (isTrackEnded && isRepeat && currentTrackIndex !== null) {
                  const currentUri = playlistTracks[currentTrackIndex]?.track?.uri;
                  if (currentUri) {
                    playTrack(currentUri, currentTrackIndex, playlistTracks);
                  }
                }
              });

            spotifyPlayer.connect();
            setPlayer(spotifyPlayer);
            window.FallnikSpotifyPlayer = spotifyPlayer;
            playerRef.current = spotifyPlayer;
        };

        loadPlayer();
    }, []);

    const transferPlayback = async (device_id, token) => {
        await fetch("https://api.spotify.com/v1/me/player",{
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type" : "application/json",
            },
            body: JSON.stringify({
                device_ids: [device_id],
                play: false,
            }),
        });
    };

    const play = () => playerRef.current?.resume();
    const pause = () => playerRef.current?.pause();


    const playTrack = async (uri, index = null, tracks = []) => {
        try {
          await fetch(`${API_URL}/spotify/play-track`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ uri }),
          });
      
          if (index !== null) {
            setCurrentTrackIndex(index);
          }
      
          if (tracks.length > 0) {
            setPlaylistTracks(tracks);
          }
      
          setIsPaused(false);
        } catch (err) {
          console.error("Failed to play track", err);
        }
      };
      


      const next = async () => {
        if (!playlistTracks.length || currentTrackIndex === null) return;
      
        if (isRepeat) {
          // Redă din nou aceeași piesă
          const uri = playlistTracks[currentTrackIndex].track.uri;
          await playTrack(uri, currentTrackIndex, playlistTracks);
          return;
        }
      
        let nextIndex = null;
      
        if (isShuffle) {
          do {
            nextIndex = Math.floor(Math.random() * playlistTracks.length);
          } while (nextIndex === currentTrackIndex && playlistTracks.length > 1);
        } else if (currentTrackIndex < playlistTracks.length - 1) {
          nextIndex = currentTrackIndex + 1;
        }
      
        if (nextIndex !== null) {
          const uri = playlistTracks[nextIndex].track.uri;
          await playTrack(uri, nextIndex, playlistTracks);
        }
      };
      
      
      


    const previous = async () => {
        if (
            playlistTracks.length > 0 &&
            currentTrackIndex !== null &&
            currentTrackIndex > 0
        ) {
            const prevIndex = currentTrackIndex - 1;
            const prevUri = playlistTracks[prevIndex].track.uri;
            await playTrack(prevUri, prevIndex, playlistTracks);
        } else {
            await fetch(`${API_URL}/spotify/previous`, { method: "POST", credentials: "include" });
        }
    };

    const changeVolume = (newVolume) => {
        const clamped = Math.min(Math.max(newVolume, 0), 1);
        setVolume(clamped);
        localStorage.setItem("spotifyVolume", clamped);

        if (!deviceId) {
            console.error("Device ID is not available yet.");
            return;
          }
        if (playerRef.current?.setVolume) {
            playerRef.current.setVolume(clamped);
        }
    };


    const toggleShuffle = async () => {
        if (!deviceId) {
            console.error("Device ID is not available yet.");
            return;
        }
    
        try {
            const tokenRes = await fetch(`${API_URL}/spotify/token`, { credentials: "include" });
            const { token } = await tokenRes.json();
    
            const newState = !isShuffle;
    
            const res = await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${newState}&device_id=${deviceId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
    
            if (!res.ok) {
                throw new Error(`Spotify API error: ${res.status}`);
            }
    
            setIsShuffle(newState);
        } catch (err) {
            console.error("Failed to toggle shuffle", err);
        }
    };
    



    const toggleRepeat = async () => {
        try {
            const tokenRes = await fetch(`${API_URL}/spotify/token`, { credentials: "include" });
            const { token } = await tokenRes.json();
            const newMode = isRepeat ? "off" : "track";
    
            const res = await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${newMode}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
    
            if (res.ok) {
                setIsRepeat(!isRepeat);
            } else {
                console.error("Spotify repeat request failed:", res.status);
            }
        } catch (err) {
            console.error("Failed to toggle repeat", err);
        }
    };
    
    
    
    
    

    useEffect(() => {
        const savedVolume = parseFloat(localStorage.getItem("spotifyVolume")) || 0.5;
        setVolume(savedVolume);
        
        const interval = setInterval(() => {
            if (playerRef.current?.setVolume) {
                playerRef.current.setVolume(savedVolume);
                clearInterval(interval);
            }
        }, 300);
    
        return () => clearInterval(interval);
    }, []);

    return (
        <MusicPlayerContext.Provider
            value={{
                isReady,
                isPaused,
                track,
                play,
                pause,
                next,
                previous,
                playTrack,
                currentTrackIndex,
                playlistTracks,
                setPlaylistTracks,
                volume,
                changeVolume,
                isShuffle,
                isRepeat,
                toggleShuffle,
                toggleRepeat,
            }}
            >
                {children}
            </MusicPlayerContext.Provider>
    );
};