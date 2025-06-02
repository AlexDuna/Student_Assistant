import React from "react";
import "../pages/FallnikAIPage.css";

const ChatBox = ({ messages, loading, bottomRef}) => {
    return (
        <div className="chat-box">
                {messages.map((msg,i) => (
                    <div key={i} className={`message ${msg.sender}`}>
                        <span>{msg.text}</span>
                    </div>
                ))}
                {loading && <div className="message ai">He's thinking...</div>}
                <div ref={bottomRef} />
        </div>
    );
};

export default ChatBox;