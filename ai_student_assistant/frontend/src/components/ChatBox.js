import React from "react";
import "../pages/FallnikAIPage.css";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import "katex/dist/katex.min.css";

const ChatBox = ({ messages, loading, bottomRef}) => {
    return (
        <div className="chat-box">
                {messages.map((msg,i) => (
                    <div key={i} className={`message ${msg.sender}`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            children={msg.text}
                        />
                    </div>
                ))}
                {loading && <div className="message ai">He's thinking...</div>}
                <div ref={bottomRef} />
        </div>
    );
};

export default ChatBox;