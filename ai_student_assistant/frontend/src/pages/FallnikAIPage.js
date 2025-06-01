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
    const [downloadUrl, setDownloadUrl] = useState("");

    const [quizType, setQuizType] = useState(null);
    const [quizData, setQuizData] = useState([]);
    const [quizAnswers, setQuizAnswers] = useState([]);
    const [quizResults, setQuizResults] = useState(null);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizError, setQuizError] = useState("");

    const quizRef = useRef(null);


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
                setDownloadUrl(data.download_url);
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

    const generateQuiz = async (type) => {
        setQuizType(type);
        setQuizLoading(true);
        setQuizResults(null);
        setQuizError("")
        try{
            const res = await fetch("https://www.fallnik.com/api/generate-quiz",{
                method: "POST",
                headers: { "Content-Type" : "application/json"},
                credentials : "include",
                body: JSON.stringify({quiz_type : type}),
            });

            const data = await res.json();
            if(res.ok){
                setQuizData(data.quiz);
                setTimeout(() => {
                    quizRef.current?.scrollIntoView({behavior: "smooth"});
                }, 100);
                setQuizAnswers(Array(data.quiz.length).fill("")); //initlizare answers
            }else{
                setQuizError(data.error || "Failed to generate quiz.");
            }
        }catch{
            setQuizError("Network error submitting quiz.");
        }
        setQuizLoading(false);
    };

    const submitQuiz = async () => {
        setQuizError("");
        try{
            const res = await fetch("https://www.fallnik.com/api/verify-quiz",{
                method: "POST",
                headers: { "Content-Type" : "application/json"},
                credentials: "include",
                body: JSON.stringify({answers : quizAnswers}),
            });

            const data = await res.json();
            if(res.ok){
                setQuizResults(data);
            }else{
                setQuizError(data.error || "Failed to generate quiz.");
            }
        }catch{
            setQuizError("Network error submitting quiz.");
        }
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
            {loading && <div className="typing-indicator">Fallnik writes... </div>}

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
                    {downloadUrl && (
                        <div className="download-link">
                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                                Download the summary.
                            </a>
                        </div>
                    )}
                </div>
            )}

            {summary && !quizData.length && (
                <div className="quiz-options">
                    <h3>Want to test yourself?</h3>
                    <button onClick={() => generateQuiz("multiple_choice")}>Multiple Choice Quiz</button>
                    <button onClick={() => generateQuiz("open_ended")}>Open Ended Quiz</button>
                </div>
            )}

            {quizLoading && <p>Your quiz is being generated...</p>}

            {quizData.length > 0 && (
                <div ref={quizRef} className="quiz-selection">
                    <h3>Your ({quizType === "multiple_choice" ? "Multiple Choice" : "Open Ended"}) Quiz</h3>
                    {quizData.map((item, index) => (
                        <fieldset key={index} className="quiz-item quiz-fieldset">
                            <legend><strong>{index + 1}. {item.question}</strong></legend>

                            {quizType === "multiple_choice" ? (
                                item.options.map((opt, optIdx) => {
                                    const inputId = `q${index}_opt${optIdx}`;
                                    return(
                                    <div key = {optIdx}>
                                        <input 
                                            id={inputId}
                                            type = "radio"
                                            name = {`q${index}`}
                                            value = {opt}
                                            checked = {quizAnswers[index] === opt}
                                            onChange={() => {
                                                const newAnswers = [...quizAnswers];
                                                newAnswers[index] = opt;
                                                setQuizAnswers(newAnswers);
                                            }}
                                        />
                                        <label htmlFor={inputId}>{opt}</label>
                                    </div>
                                    );
                            })
                            ):(
                                <input 
                                    type = "text"
                                    value = {quizAnswers[index]}
                                    onChange={(e) => {
                                        const newAnswers = [...quizAnswers];
                                        newAnswers[index] = e.target.value;
                                        setQuizAnswers(newAnswers);
                                    }}
                                    placeholder="Your answer"
                                />
                            )}
                        </fieldset>
                    ))}

                    <button onClick={submitQuiz}> Submit Quiz</button>

                </div>
            )}

            {quizResults && (
                <div className="quiz-results">
                    <h4> Result: {quizResults.score}</h4>
                    {quizResults.results.map((r,i) => (
                        <div key={i} className={`quiz-feedback ${r.is_correct ? "correct" : "incorrect" }`}>
                            <p><strong>{i + 1}. {r.question}</strong></p>
                            <p>Your answer: <em>{r.your_answer}</em></p>
                            {!r.is_correct && <p>✔ RIGHT Answer: <strong>{r.correct_answer || "Unavailable"}</strong></p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FallnikAIPage;