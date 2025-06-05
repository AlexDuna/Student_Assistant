import React, {useContext, useEffect, useState, useRef} from "react";
import { MusicPlayerContext } from "../utils/MusicPlayerContext";
import "./MiniPlayer.css";

const MiniPlayer = () => {
    const {
        track,
        isPaused,
        play,
        pause,
        next,
        previous,
        volume,
        changeVolume,
        isShuffle,
        isRepeat,
        toggleShuffle,
        toggleRepeat
      } = useContext(MusicPlayerContext);
      
    const [progress, setProgress] = useState(0);
    const playerRef = useRef(null);
    const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 150 });
    const [visible, setVisible] = useState(true);
    const inactivityTimeout = useRef(null);
    const [isManuallyClosed, setIsManuallyClosed] = useState(false);

      


    const isDragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    useEffect( () => {
        const interval = setInterval(() => {
            const player = window.FallnikSpotifyPlayer;
            if(player){
                player.getCurrentState().then((state) =>{
                    if(state){
                        const progress = (state.position /state.duration) * 100;
                        setProgress(progress);
                    }
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const onMouseDown = (e) => {
        isDragging.current = true;
        offset.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      };


    const onMouseMove = (e) => {
    if (!isDragging.current) return;
    setPosition({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
    });
    };

    const onMouseUp = () => {
        isDragging.current = false;
      };



    useEffect(() => {
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
        return () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        };
    }, []);

    const resetInactivityTimeout = () => {
        clearTimeout(inactivityTimeout.current);
        setVisible(true);
        inactivityTimeout.current = setTimeout(() => setVisible(false), 5000);
      };


      useEffect(() => {
        const events = ['mousemove', 'keydown', 'click'];
        events.forEach(event => window.addEventListener(event, resetInactivityTimeout));
      
        resetInactivityTimeout();
      
        return () => {
          events.forEach(event => window.removeEventListener(event, resetInactivityTimeout));
          clearTimeout(inactivityTimeout.current);
        };
      }, []);

      useEffect(() => {
        if (track) {
          setIsManuallyClosed(false);
        }
      }, [track]);
      


        
      if (!track || isManuallyClosed) return null;


    return(
        <div
            ref={playerRef}
            className="mini-player"
            onMouseDown={onMouseDown}
            style={{ left: position.x, top: position.y, position: "fixed", display:visible? "flex" : "none", }}
        >

        <button
            onClick={() => setIsManuallyClosed(true)}
            className="close-button"
            aria-label="Close Player"
            title="Close"
        >
            ×
        </button>
        {/*Album */}

        <img 
        src={track.album.images[0]?.url}
        alt="cover"
        className="album-cover"
        />

        {/*Info + Controls*/}
        <div className="player-info">
            <div className="track-title">
                {track.name}
            </div>
            <div className="track-artist">
                {track.artists[0]?.name}
            </div>
            {/*Controls*/}

            <div className="controls">
                <div className="secondary-controls">
                    <button onClick={toggleShuffle} style={{ opacity: isShuffle ? 1 : 0.5 }}>🔀</button>
                </div>
                <button onClick={previous}>⏮</button>
                <button onClick={isPaused ? play : pause}>
                    {isPaused ? "▶" : "⏸"}
                </button>
                <button onClick={next}>⏭</button>
                <div className="secondary-controls">
                    <button onClick={toggleRepeat} style={{ opacity: isRepeat ? 1 : 0.5 }}>🔁</button>
                </div>
            </div>


            {/*Progress Bar*/}
            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}/>
            </div>

            {/*Volume*/}
            <input
                type="range"
                min={0}
                max={100}
                value={volume * 100}
                onChange={(e) => changeVolume(e.target.value / 100)}
                onMouseDown={(e) => e.stopPropagation()}
                className="volume-slider"
            />

        </div> 
        </div>
    );
};

export default MiniPlayer;