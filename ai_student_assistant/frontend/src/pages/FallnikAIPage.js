import React, { useEffect, useRef, useState } from "react";
import "./FallnikAIPage.css";
import ChatBox from "../components/ChatBox";
import UploadMaterial from "../components/UploadMaterial";
import SummarySection from "../components/SummarySection";
import QuizSection from "../components/QuizSection";
import Navbar from "../components/Navbar";
import {
    loadPersistentStateFromServer,
    savePersistentStateToServer
} from "../utils/FallnikAIPersistance";

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

    const [hasSummary, setHasSummary] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);

    const quizRef = useRef(null);

    const[fileName, setFileName] = useState("");
    const [restored, setRestored] = useState(false);

    useEffect(() => {
        async function restore(){
            const serverState = await loadPersistentStateFromServer();

            if(serverState){
                    if(serverState.messages) setMessages(serverState.messages);
                    if(serverState.summary) {setSummary(serverState.summary); setHasSummary(true);}
                    if(serverState.fileName) setFileName(serverState.fileName);
                    if(serverState.quizData) {
                        setQuizData(serverState.quizData);
                        setQuizAnswers(serverState.quizAnswers || []);
                        setQuizResults(serverState.quizResults);
                        setQuizStarted(serverState.quizStarted);
                        setQuizType(serverState.quizType);
                    }
                    if(serverState.quizAnswers) setQuizAnswers(serverState.quizAnswers);
                    if(serverState.quizResults) setQuizResults(serverState.quizResults);
                    if(serverState.quizStarted) setQuizStarted(serverState.quizStarted);
                    if(serverState.downloadUrl) setDownloadUrl(serverState.downloadUrl);
            }

        setRestored(true);
    }
    restore();
    }, [])

    useEffect(() => {
        if(!restored)return;
        const state ={ 
            messages,
            summary,
            fileName:fileName,
            quizData:quizData,
            quizAnswers:quizAnswers,
            quizResults:quizResults,
            quizStarted:quizStarted,
            downloadUrl:downloadUrl,
            quizType: quizType,
        };
        savePersistentStateToServer(state);
    }, [
        messages,
        summary,
        fileName,
        quizData,
        quizAnswers,
        quizResults,
        quizStarted,
        downloadUrl,
        quizType,
    ]);


    useEffect(() => {
        const fetchWelcomeMessage = async() => {
            try{
                const res = await fetch("https://www.fallnik.com/api/welcome-message",{
                    method: "GET",
                    credentials: "include",
                });

                const data = await res.json();
                if(data.message){
                    setMessages([{sender: "ai", text: data.message}]);
                }
            }catch(err){
                setMessages([{sender: "ai", text: "Hello! I am Fallnik, your AI assistant. Upload a material and let's learn together. I will summarize it for you and than we can evaluate yourself later."}]);
            }
        };

        if(restored && messages.length === 0){
            fetchWelcomeMessage();
        }

        if(bottomRef.current && (hasSummary || quizData.length > 0)){
            bottomRef.current.scrollIntoView({behavior: "smooth"});
        }
    }, [messages, restored]);

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
        setFileName(e.target.files[0]?.name || "");
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
                setHasSummary(true);
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
                setQuizAnswers(Array(data.quiz.length).fill("")); //initlizare answers
                setQuizStarted(true);
                setTimeout(() => {
                    quizRef.current?.scrollIntoView({behavior: "smooth"});
                }, 100);
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
        <>
        <Navbar/>
        <div className="ai-page">
            <div className="card-container">
            
            <div className="card">
            <h2>Fallnik AI Assistant</h2>
            <ChatBox messages={messages} loading={loading} bottomRef={bottomRef} />

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
            </div>

            {!quizStarted && (
            <div className="card">
            <UploadMaterial 
                file={file}
                onFileChange={handleFileChange}
                onUpload={handleUpload}
                uploadLoading={uploadLoading}
                uploadError={uploadError}
            />
            {uploadLoading && (
                <div className="quiz-loader">
                    <div className="loader-bar"></div>
                </div>
            )}
            </div>
            )}
            

            {hasSummary && !quizStarted && summary && (
            <div className="card">
                <SummarySection summary={summary} downloadUrl={downloadUrl} />
            </div>
            )}


            {hasSummary && !quizStarted && !quizData.length && (
            <div className="card">
                <div className="quiz-options">
                    <h3>Want to evaluate yourself?</h3>
                    <p>I can generate a quiz for you. Choose the type of quiz that suits you best.</p>
                    <br/>
                    <button onClick={() => generateQuiz("multiple_choice")}>Multiple Choice Quiz</button>
                    <button onClick={() => generateQuiz("open_ended")}>Open Ended Quiz</button>
                </div>
            </div>
            )}

            {quizLoading && (
                <div className="quiz-loader">
                    <div className="loader-bar"></div>
                </div>
            )}
            

            {quizData.length > 0 && (
            <div className="card">
                <QuizSection 
                    quizType={quizType}
                    quizData={quizData}
                    quizAnswers={quizAnswers}
                    setQuizAnswers={setQuizAnswers}
                    submitQuiz={submitQuiz}
                    quizResults={quizResults}
                />
            </div>
            )}

            {quizStarted && (
                <div className="card">
                    <button onClick={() => {
                        setQuizStarted(false);
                        setQuizData([]);
                        setQuizResults(null);
                    }}>
                        Return to Summary
                    </button>
                </div>
            )}
        </div>
        </div>
        </>
    );
};

export default FallnikAIPage;