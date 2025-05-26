import React, { useEffect, useRef, useState } from "react";
import "./FallnikAIPage.css";

const FallnikAIPage = () => {
    const [messages, setMessages] = useState([]); //Istoric Conversatie
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState("");
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    useEffect(() => {
        if(bottomRef.current){
            bottomRef.current.scrollIntoView({behavior: "smooth"});
        }
    }, [messages]);

    const handleSendMessage = async () =>{
        if(!input.trim()) return;

        const newMessages = [...messages, {sender: "user", text: input}];
        setMessages(newMessages);
        setInput("");
        setLoading(true);

        try{
            const response = await fetch("https://www.fallnik.com/api/ask-ai",{
                method:"POST",
                headers: {"Content-Type" : "application/json"},
                credentials: "include",
                body: JSON.stringify({question: input}),
            });

            const data = await response.json();

            if(data.answer){
                setMessages([...newMessages, {sender: "ai", text: data.answer}]);
            }else{
                setMessages([...newMessages, {sender: "ai", text: "Error: invalid answer."},]);
            }
        }catch(err){
            setMessages([...newMessages, {sender: "ai", text: "Error connection to AI."},]);
        }
            
        setLoading(false);
    };

    const handleKeyDown = (e) => {
        if(e.key === "Enter") handleSendMessage();
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setSummary("");
        setUploadError("");
    };

    const handleUpload = async () => {
        if(!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setUploadLoading(true);
        setSummary("");
        setUploadError("");

        try{
            const res = await fetch("https://www.fallnik.com/api/upload-material", {
                method: "POST",
                credentials: "include",
                body: formData
            });

            const data = await res.json();

            if(res.ok){
                setSummary(data.summary);
                if(data.chat_message){
                    setMessages(prev => [...prev, {sender: "ai", text: data.chat_message}]);
                }
            }else{
                setUploadError(data.error || "Failed to summarize.");
            }
        }catch(err){
            setUploadError("Network error.");
        }

        setUploadLoading(false);
    };


    return(
        <div className="ai-page">
            <h2>Fallnik AI Assistant</h2>
            <div className="chat-box">
                {messages.map((msg,i) => (
                    <div key={i} className={`message ${msg.sender}`}>
                        <span>{msg.text}</span>
                    </div>
                ))}
                {loading && <div className="message ai">He's thinking...</div>}
                <div ref={bottomRef} />
            </div>

            <div className="input-area">
                <input 
                    type="text"
                    placeholder="Ask me anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button onClick={handleSendMessage}>Send</button>
            </div>
            {loading && <div className="typing-indicator">AI writes... </div>}

            <hr />

            <div className="upload-area">
                <h3>Upload Material (PDF, DOCX, TXT)</h3>
                <input type="file" onChange={handleFileChange} />
                <button onClick={handleUpload} disabled={uploadLoading || !file}>
                    {uploadLoading ? "Summarizing..." : "Upload & Summarize"}
                </button>
                {uploadError && <div className="error-message">{uploadError}</div>}
            </div>

            {summary && (
                <div className="summary-section">
                    <h3>Summary</h3>
                    <div className="summary-content">{summary}</div>
                </div>
            )}
        </div>
    );
};

export default FallnikAIPage;