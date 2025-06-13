import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../utils/config";
import "./DashboardPage.css";
import Navbar from "../components/Navbar";
import { FaClipboardCheck, FaFileUpload, FaQuestionCircle, FaRegStar, FaSignInAlt, FaUpload } from "react-icons/fa";
import { motion, AnimatePresence} from "framer-motion";
import WeatherWidget from "../components/WeatherWidget";


const DashboardPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(true);
    const [aiQuote, setAiQuote] = useState("");
    const [greeting, setGreeting] = useState("");
    const [activities, setActivities] = useState([]);
    const [recap, setRecap] = useState(null);
    const [weather, setWeather] = useState(null);


    function formatActivity(act){
        switch(act.type){
            case "upload": return `Generated a summary about ${act.details}`;
            case "generate_quiz": return `Generated a quiz (${act.details})`;
            case "finish_quiz" : return `Completed a quiz (${act.details})`;
            case "login": return "Logged in";
            default: return act.details || act.type;
        }
    }

    function getActivityIcon(type){
        switch(type){
            case "upload": return <FaFileUpload style={{color:"#a855f7", marginRight:8}}/>;
            case "generate_quiz": return <FaQuestionCircle style={{color:"#00b894", marginRight:8}}/>;
            case "finish_quiz" : return <FaClipboardCheck style={{color:"#ffd700", marginRight:8}}/>;
            case "login": return <FaSignInAlt style={{color:"#888", marginRight:8}}/>;
            default: return <FaRegStar style={{color:"#ccc", marginRight:8}}/>;
        }
    }

    function formatDate(dt){
        return new Date(dt).toLocaleString();
    }

    function getWeatherMessage(weather){
        if(!weather) return "";
        const code = weather.weather[0].main.toLowerCase();
        switch (code) {
            case "clear": return "Soare afară – profită de energie și fă ceva WOW!";
            case "clouds": return "Cer înnorat. Atmosfera perfectă pentru concentrare 🧠";
            case "rain": return "Plouă? Un ceai cald și un rezumat nou sună bine ☔";
            case "drizzle": return "Mărunt afară. Poate citești o lecție rapidă?";
            case "thunderstorm": return "E furtună! Stai la adăpost și devino mai bun 💪";
            case "snow": return "Ninge! Ia o pauză, dar nu uita de quiz-ul zilei!";
            case "mist":
            case "fog": return "E ceață. Concentrează-te, ca să vezi clar drumul spre succes!";
            default: return "Zi bună pentru învățat cu Fallnik!";
          }
    }

    function getWeatherColor(main) {
        switch (main) {
          case "Clear": return "#f7c948";      // sunny yellow
          case "Clouds": return "#8395a7";     // gray blue
          case "Rain": case "Drizzle": return "#6c63ff"; // rainy blue-purple
          case "Thunderstorm": return "#433b6e";
          case "Snow": return "#dbeafe";       // pale blue
          case "Mist":
          case "Fog": return "#868e96";
          default: return "#b892ff";
        }
      }
      

    useEffect(() => {
        const fetchUsername = async () => {
            try{
                const res = await fetch (`${API_URL}/check-session`,{
                    method: "GET",
                    credentials: "include"
                });

                if(res.ok){
                    const data = await res.json();
                    setUsername(data.username);
                }else{
                    navigate("/login");
                }
            }catch(err){
                navigate("login");
            }finally{
                setLoading(false);
            }
    };

    fetchUsername();
}, [navigate]);



    useEffect(() => {
        fetch(`${API_URL}/ai-quote`)
            .then(res => res.json())
            .then(data => setAiQuote(data.quote))
            .catch(() => setAiQuote("Keep pushing forward, every small step counts!"));
    }, []);



    useEffect(() => {
        const hour = new Date().getHours();
        let msg = "";
        if(hour >= 5 && hour < 12) msg = "Good morning";
        else if(hour >= 12 && hour < 18) msg = "Good afternoon";
        else msg = "Good evening";
        setGreeting(msg);
    }, []);


    useEffect(() => {
        fetch(`${API_URL}/last-activities`,{
            credentials: 'include'
        })
        .then(res => res.json())
        .then(data => setActivities(data.activities || []));
    }, []);

    useEffect(() => {
        fetch(`${API_URL}/weekly-recap`,{
            credentials: 'include'
        })
        .then(res => res.json())
        .then(data => setRecap(data));
    }, []);


    if (loading) return <p> Loading...</p>

    return(
        <>
        <div className="dashboard-container" style={{paddingTop: "80px"}}>
            <Navbar username={username}/>
            <div className="gradient-background"></div>
            <div className="grain-overlay"></div>
            <div className="blob-container">
            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
            <div className="blob blob3"></div>
            <div className="blob blob4"></div>
            <div className="blob blob5"></div>

            </div>

            <div className="dashboard-main">
                <h2 className="dashboard-title">{greeting}, {username}</h2>
                <div className="dashboard-quote">
                    <em>{aiQuote}</em>
                    <small style={{fontSize: "0.9rem", color:"#bbb"}}>- by Fallnik</small>
                </div>
            </div>


            <div className="dashboard-main-two-cols">
            <div className="dashboard-activity">
                <h3 style={{marginBottom: "1em"}}>Last activity</h3>
                {activities.length === 0 && <p>No recent activity yet.</p>}
                <ul className="activity-list">
                    <AnimatePresence>
                        {activities.map((act, i) => (
                        <motion.li
                            key={i}
                            className="activity-card"
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 18 }}
                            transition={{ duration: 0.36, delay: i * 0.08 }}
                        >
                            <span className="activity-icon">{getActivityIcon(act.type)}</span>
                            <span className="activity-details">
                            <span className="activity-title">
                                {formatActivity(act)}
                                <span className={`activity-badge badge-${act.type}`}>
                                {act.type.replace("_", " ")}
                                </span>
                            </span>
                            <span className="activity-date">{formatDate(act.date)}</span>
                            </span>
                        </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
            </div>
            <div className="weekly-recap-card">
            <div className="recap-trophy">
                🏆
            </div>
                <h3>Your Weekly Recap</h3>
                {recap ? (
                    <div>
                        <div><b>Generated summaries: </b>{recap.num_summaries}</div>
                        <div><b>Completed quizzes: </b>{recap.num_quizzes}</div>
                        <div>
                            <b>Average quiz score:</b>{" "}
                            {recap.avg_score !== null ? `${recap.avg_score}%` : "-"}
                        </div>
                        {recap.streak >= 3 && (
                            <div className="recap-streak">
                                🔥 <b>Streak:</b> {recap.streak} days!
                                {recap.streak >= 5 && (
                                    <span className="recap-medal" title="Awesome streak!">🏅</span>
                                )}
                            </div>
                        )}

                        <div className="recap-motivational">{recap.motivational}</div>
                    </div>
                ):(
                    <div>Loading recap...</div>
                )}

            </div>
            <div className="weather-widget" 
                    style={
                        weather 
                        ?{background: getWeatherColor(weather.weather[0].main) + "22"} 
                        : {}
                    }>
                <WeatherWidget onWeatherLoaded={setWeather} className="weather-widget weather-widget-dashboard"/>
                {weather && (
                    <div className="weather-message">{getWeatherMessage(weather)}</div>
                )}
            </div>
        </div>
            
        </div>
        </>
    );
};

export default DashboardPage;