import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "./SessionRoom.css"
import UploadSharedMaterial from "./UploadSharedMaterial";
import SessionChat from "./SessionChat";
import Navbar from "./Navbar";
import { getCookie } from "../utils/cookies";
import { Signal } from "lucide-react";
import { API_URL } from "../utils/config";

const ICE_SERVERS = {
    iceServers: [
        {urls: "stun:stun.l.google.com:19302"}
    ]
}

const MAX_USERS = 4;

const RemoteVideo = ({ stream, id}) => {
    const videoRef = useRef();

    useEffect(() => {
        if(videoRef.current){
            if(videoRef.current.srcObject !== stream){
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => {});
            }
        }
    }, [stream]);

    return (
        <div className="video-container remote-video" key={id}>
            <video 
                ref={videoRef}
                autoPlay
                playsInline
                className="video-element"
                muted = {false}
            />
            <div className="video-label">{id}</div>
        </div>
    );
};

const SessionRoom= ({code, onExit}) => {
    const localVideoRef = useRef();
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState({});
    const [remoteStreams, setRemoteStreams] = useState({});
    const [socket, setSocket] = useState(null);
    const [userId, setUserId] = useState(null);
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(true);
    const [messages, setMessages] = useState([]);
    const localStreamRef = useRef(null);

    
    const handleExit = () => {
        if (socket && userId) {
            console.log("Exiting session, notifying server...");
            socket.emit("leave-session", { sessionCode: code, userId });
        }
        
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        
        onExit(); // funcția primită prin props care face redirect sau închide sesiunea
      };


    const fetchMessages = async () => {
        try{
            const res = await fetch(`${API_URL}/sessions/${code}/chat`,{
                credentials: "include"
            });
            const data = await res.json();
            setMessages(data.messages || []);
        }catch(err){
            console.error("Failed to fetch chat messages", err);
        }
    };

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    useEffect(() => {
        if (!code) return;

        fetch(`${API_URL}/user-id`,{
            credentials: "include"
        })
        .then(res => res.json())
        .then(data => {
            if(data.user_id){
                setUserId(data.user_id.toString());
            }
        })
        .catch(console.error);

        //Conectare cu socket.io
        const newSocket = io("https://www.fallnik.com",{
            withCredentials: true,
            transports: ["websocket"],
        });

        setSocket(newSocket);

        //get local media
        const getMedia = async () => {
            try{
                const stream = await navigator.mediaDevices.getUserMedia({video:true, audio:true});
                setLocalStream(stream);
                if(localVideoRef.current){
                    localVideoRef.current.srcObject = stream;
                }
                setCamEnabled(true);
            }catch(err){
                console.warn("No video device found, trying audio only...", err);
                try{
                    const stream = await navigator.mediaDevices.getUserMedia({video:false, audio:true});
                    setLocalStream(stream);
                    if(localVideoRef.current){
                        localVideoRef.current.srcObject = stream;
                    }
                    setCamEnabled(false);
                }catch(err2){
                    console.error("Failed to get any media device", err2);
                    alert("Could not access camera or microphone.");
                }
            }
        };

        getMedia();

        return () => {
            if(localStreamRef.current){
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (newSocket) newSocket.disconnect();
        };
    }, [code]);

    useEffect(() => {
        if (!socket) return;
    
        socket.on('new-chat-message', (message) => {
          setMessages(prev => [...prev, message]);
        });
    
        return () => {
          socket.off('new-chat-message');
        };
      }, [socket]);


    const peersRef = useRef({});

    useEffect(() => {
        if (!socket || !localStream || !userId || !code) return;
    
        socket.emit("join-session", { sessionCode: code, userId });

        fetch(`${API_URL}/sessions/${code}/join`, {
            method: "POST",
            credentials: "include"
          }).catch(console.error);

    
        socket.on("user-joined", ({ userId: newUserId }) => {
            console.log("User joined: ", newUserId);
    
            // Refresh chat messages to see "joined" message instantly
            fetchMessages();

            if (Object.keys(peersRef.current).length >= MAX_USERS - 1) {
                console.warn("Max users reached, not connecting to new peer.");
                return;
            }

            const peerConnection = new RTCPeerConnection(ICE_SERVERS);
            peersRef.current[newUserId] = peerConnection;

            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            peerConnection.ontrack = event => {
                setRemoteStreams(prev => ({ ...prev, [newUserId]: event.streams[0] }));
            };

            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    socket.emit("signal", {
                    sessionCode: code,
                    targetId: newUserId,
                    signal: { candidate: event.candidate },
                    userId,
                    });
                }
            };

            peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                socket.emit("signal", {
                sessionCode: code,
                targetId: newUserId,
                signal: { sdp: peerConnection.localDescription },
                userId,
                });
            });

            setPeers({ ...peersRef.current });
        });

        socket.on("signal", async ({ from, signal }) => {
            if (from === userId) return;

            let pc = peersRef.current[from];

            if (!pc) {
            pc = new RTCPeerConnection(ICE_SERVERS);
            peersRef.current[from] = pc;

            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });

            pc.ontrack = event => {
                setRemoteStreams(prev => ({ ...prev, [from]: event.streams[0] }));
            };

            pc.onicecandidate = event => {
                if (event.candidate) {
                socket.emit("signal", {
                    sessionCode: code,
                    targetId: from,
                    signal: { candidate: event.candidate },
                    userId,
                });
                }
            };
            }

        if (signal.sdp) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (signal.sdp.type === "offer") {
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("signal", {
                sessionCode: code,
                targetId: from,
                signal: { sdp: pc.localDescription },
                userId,
                });
            }
        } else if (signal.candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
                console.error("Error adding ICE candidate", e);
            }
        }

            setPeers({ ...peersRef });
        });

        socket.on("user-left", ({ userId: leftUserId }) => {
            console.log("User left:", leftUserId);
            if (peersRef.current[leftUserId]) {
                peersRef.current[leftUserId].close();
            delete peersRef.current[leftUserId];
            setPeers({ ...peersRef.current });
            setRemoteStreams(prev => {
                const copy = { ...prev };
                delete copy[leftUserId];
                return copy;
            });
            }
        });

        // Initial fetch chat messages
        fetchMessages();


    return () => {
            socket.off("user-joined");
            socket.off("signal");
            socket.off("user-left");
            Object.values(peersRef.current).forEach(pc => pc.close());
            socket.disconnect();
    };
    }, [socket, localStream, userId, code]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
          if (socket && userId) {
            socket.emit("leave-session", { sessionCode: code, userId });
            if (localStream) {
              localStream.getTracks().forEach(track => track.stop());
            }
          }
        };
      
        window.addEventListener("beforeunload", handleBeforeUnload);
      
        return () => {
          window.removeEventListener("beforeunload", handleBeforeUnload);
        };
      }, [socket, userId, code, localStream]);

    //Helper toggle mic
    const toggleMic = () => {
        if(!localStream) return;
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setMicEnabled(!micEnabled);
    };

    //Helper toggle camera
    const toggleCam = () => {
        if(!localStream) return;
        localStream.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setCamEnabled(!camEnabled);
    };


    return(
        <>
        <Navbar />
        <div className="session-room">
            <header className="session-header">
                <h2>Session code: <code>{code}</code></h2>
                <p>Invite your friends to join this session using the code above.</p>
                <button onClick={handleExit}>Exit session</button>
            </header>

            <div className="session-body">
                <div className="session-section video-area">
                    <h3>🎥Video call</h3>
                    <div className="videos-wrapper">
                        <div className="video-container local-video">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="video-element"
                            />
                            <div className="video-label"> You</div>
                        </div>

                        {Object.entries(remoteStreams).map(([id, stream])=>(
                            <RemoteVideo key={id} id={id} stream={stream} />
                        ))}
                    </div>

                    <div className="controls">
                        <button onClick={toggleMic}>
                            {micEnabled ? "Mute mic" : "Unmute Mic"}
                        </button>

                        <button onClick={toggleCam}>
                            {camEnabled ? "Stop Camera": "Start Camera"}
                        </button>
                    </div>
                </div>

                <div className="session-section upload-area">
                    <h3>📄Shared Material</h3>
                    <UploadSharedMaterial sessionCode={code} socket={socket} />
                </div>

                <div className="session-section chat-area">
                    <h3>💬Chat</h3>
                    <SessionChat 
                        sessionCode={code}
                        messages={messages}
                        fetchMessages={fetchMessages}
                    />
                </div>
            </div>
        </div>
        </>
    );
};

export default SessionRoom;