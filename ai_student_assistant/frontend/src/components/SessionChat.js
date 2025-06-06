import React, {useEffect, useState, useRef} from "react";
import { API_URL } from "../utils/config";
import "./SessionChat.css";
import {Send} from "lucide-react";
import { getCookie } from "../utils/cookies";


const SessionChat = ({ sessionCode, messages, fetchMessages }) =>{
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const usernameFromCookie = getCookie("username");
        if (usernameFromCookie) {
            setCurrentUser(usernameFromCookie);
        }
    }, []);

    const scrollToBottom = () => {
      if(messagesEndRef.current){
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
  };

    const sendMessages = async () => {
        if(!text.trim()) return;

        setSending(true);

        console.log("Sending message:", text);

        try{
            const res = await fetch(`${API_URL}/sessions/${sessionCode}/chat`,{
                method:"POST",
                headers: {"Content-Type" : "application/json"},
                credentials: "include",
                body: JSON.stringify({text})
            });

            const result = await res.json();
            if(!res.ok){
                console.error("Send error: ", result.error || "Unknown error");
            }
            setText("");
            //dupa ce trimitem aducem imediat ultimele mesaje
            await fetchMessages();
        }catch(err){
            console.error("Send failed", err);
        }finally{
            setSending(false);
        }
    };

    useEffect(() => {
      scrollToBottom();
  }, [messages]);
  
    return (
        <div className="session-chat-container">
          <div className="session-chat-messages">
            {messages.map((msg, idx) => {
              const isOwn = msg.user === currentUser;
              return (
                <div
                  key={idx}
                  className={`session-chat-message ${isOwn ? "own" : "other"}`}
                >
                  {!isOwn && <img src={msg.avatar_url} alt="avatar" />}
                  <div className="session-chat-message-content">
                    <strong>{msg.user}</strong>
                    <time>{new Date(msg.timestamp).toLocaleTimeString()}</time>
                    <div>{msg.text}</div>
                  </div>
                  {isOwn && <img src={msg.avatar_url} alt="avatar" />}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
      
          <div className="session-chat-input-area">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessages()}
              placeholder="Type.."
            />
            <button
              onClick={sendMessages}
              disabled={sending || !text.trim()}
              title="Send"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      );
      
};

export default SessionChat;