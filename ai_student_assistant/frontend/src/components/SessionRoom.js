import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "./SessionRoom.css"
import UploadSharedMaterial from "./UploadSharedMaterial";
import SessionChat from "./SessionChat";
import Navbar from "./Navbar";
import { getCookie } from "../utils/cookies";
import { Signal } from "lucide-react";

const ICE_SERVERS = {
    iceServers: [
        {urls: "stun:stun.l.google.com:19302"}
    ]
}

const MAX_USERS = 4;

const SessionRoom= ({code, onExit}) => {
    const localVideoRef = useRef();
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState({});
    const [remoteStreams, setRemoteStreams] = useState({});
    const [socket, setSocket] = useState(null);
    const [userId, setUserId] = useState(null);
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(true);

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
    }



    useEffect(() => {
        if(!code) return;

        //Connect to socket.io
        const newSocket = io("https://www.fallnik.com",{
            withCredentials:true,
            transports: ["websocket"],
        });

        setSocket(newSocket);

        //Luam userId din cookie/session
        const cookieUserId = getCookie("session_id");
        setUserId(cookieUserId);

        //get local media
        navigator.mediaDevices
        .getUserMedia({video: true, audio: true})
        .then(stream => {
            setLocalStream(stream);
            if(localVideoRef.current){
                localVideoRef.current.srcObject = stream;
            }
        })
        .catch(err => {
            console.error("Error getting media: ", err);
            alert("Could not access camera and microphone.");
        });

        return () => {
            if(newSocket) newSocket.disconnect();
            if(localStream){
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [code]);

    useEffect(() => {
        if(!socket || !localStream || !userId || !code) return;

        socket.emit("join-session", {sessionCode:code, userId});

        //object to store peers locally in effect scope(to avoid stale state in callbacks)
        const peersRef = {};

        socket.on("user-joined", ({userId: newUserId}) => {
            console.log("User joined: ", newUserId);
            if(Object.keys(peersRef).length >= MAX_USERS -1 ){
                console.warn("Max users reached, not connecting to new peer.");
                return;
            }

            //create new peer connection
            const peerConnection = new RTCPeerConnection(ICE_SERVERS);
            peersRef[newUserId] = peerConnection;

            //Add local tracks to peer
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });

            //on remote track
            peerConnection.ontrack = event => {
                setRemoteStreams(prev => {
                    return {...prev, [newUserId]: event.streams[0]};
                });
            };

            //handle ICE candidates
            peerConnection.onicecandidate = event => {
                if(event.candidate){
                    socket.emit("signal",{
                        sessionCode: code,
                        targetId: newUserId,
                        signal: {candidate: event.candidate},
                        userId,
                    });
                }
            };

            //create offer
            peerConnection
                .createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit("signal",{
                        sessionCode: code,
                        targetId: newUserId,
                        signal: {sdp: peerConnection.localDescription},
                        userId,
                    });
                });
                setPeers(peersRef);
        });

        socket.on("signal", async ({from, signal}) => {
            if(from === userId) return;

            let pc = peersRef[from];

            if(!pc){
                //create new peer connection
                pc = new RTCPeerConnection(ICE_SERVERS);
                peersRef[from] = pc;

                //add local tracks
                localStream.getTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                })

                //on remote track
                pc.ontrack = event => {
                    setRemoteStreams(prev => {
                        return {...prev, [from]:event.streams[0]};
                    });
                };

                //ICE candidates
                pc.onicecandidate = event => {
                    if(event.candidate){
                        socket.emit("signal",{
                            sessionCode: code,
                            targetId: from,
                            signal: {candidate: event.candidate},
                            userId,
                        });
                    }
                };
            }
            if(signal.sdp){
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                if(signal.sdp.type === "offer"){
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit("signal",{
                        sessionCode: code,
                        targetId: from,
                        signal: { sdp: pc.localDescription },
                        userId,
                    });
                }
            }else if(signal.candidate){
                try{
                    await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
                }catch(e){
                    console.error("Error adding ICE candidate", e);
                }
            }
            setPeers({...peersRef});
        });

        socket.on("user-left", ({userId: leftUserId}) => {
            console.log("User left:", leftUserId);
            if(peersRef[leftUserId]){
                peersRef[leftUserId].close();
                delete peersRef[leftUserId];
                setPeers({...peersRef});
                setRemoteStreams(prev => {
                    const copy = {...prev};
                    delete copy[leftUserId];
                    return copy;
                });
            }
        });

        return () => {
            socket.off("user-joined");
            socket.off("signal");
            socket.off("user-left");
            Object.values(peersRef).forEach(pc => pc.close());
        };
    }, [socket, localStream, userId, code]);

    return(
        <>
        <Navbar />
        <div className="session-room">
            <header className="session-header">
                <h2>Session code: <code>{code}</code></h2>
                <p>Invite your friends to join this session using the code above.</p>
                <button onClick={onExit}>Exit session</button>
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
                            <div className="video-container remote-video" key={id}>
                                <video 
                                    autoPlay
                                    playsInline
                                    className="video-element"
                                    ref={video => {
                                        if(video && video.srcObject !== stream){
                                            video.srcObject = stream;
                                        }
                                    }}
                                />
                                <div className="video-label">{id}</div>
                            </div>
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
                    <UploadSharedMaterial sessionCode={code} />
                </div>

                <div className="session-section chat-area">
                    <h3>💬Chat</h3>
                    <SessionChat sessionCode={code}/>
                </div>
            </div>
        </div>
        </>
    );
};

export default SessionRoom;