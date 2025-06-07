import React, {useEffect, useState} from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Navbar from "../components/Navbar";
import "./CalendarPage.css"

const CalendarPage = () =>{
    const [date, setDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [newEvent, setNewEvent] = useState({title: "", description: "", date:""});

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        const res = await fetch("https://www.fallnik.com/api/calendar/events", {
            credentials: "include"
        });
        if (res.ok){
            const data = await res.json();
            setEvents(data);
        }
    };

    const handleAddEvent = async () => {
        if(!newEvent.title || !newEvent.date){
            alert("Please enter title and date");
            return;
        }

        const res = await fetch("https://www.fallnik.com/api/calendar/events", {
            method: "POST",
            headers: {"Content-Type" : "application/json"},
            credentials: "include",
            body: JSON.stringify(newEvent),
        });

        if(res.ok){
            setNewEvent({title: "", description:"",date:""});
            fetchEvents();

            setDate(new Date(newEvent.date));
            alert("Event added!");
        }else{
            alert("Failed to add event");
        }
    };



    const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth()+1).padStart(2,'0');
        const day = String(date.getDate()).padStart(2,'0');
        return `${year}-${month}-${day}`;
    }

    const todayStr = formatDateLocal(new Date());

    const eventsOnSelectedDate = events.filter(ev => ev.date === formatDateLocal(date));



    return (
        <>
        <Navbar />
        <div className="gradient-background"></div>
            <div className="grain-overlay"></div>
            <div className="blob-container">
            <div className="blob blob1"></div>
            <div className="blob blob2"></div>
            <div className="blob blob3"></div>
            <div className="blob blob4"></div>
            <div className="blob blob5"></div>

            </div>

        <div className="calendar-wrapper">
            <h2>Calendar</h2>
            <div className="calendar-content">
            <div className="calendar-left">
            <Calendar
                onChange={setDate}
                value={date}
                showNeighboringMonth={true}
                locale="en-US"
                tileContent={({ date, view }) => {
                if (view === "month") {
                    const dayEvents = events.filter(
                    (ev) => ev.date === formatDateLocal(date)
                    );
                    return dayEvents.length ? (
                    <ul style={{ paddingLeft: "6px", marginTop: "4px", listStyle: "none", fontSize: "0.7em" }}>
                        {dayEvents.map((ev) => (
                        <li
                            key={ev.id}
                            style={{
                            backgroundColor: "#7b61ff",
                            color: "white",
                            borderRadius: "3px",
                            padding: "1px 5px",
                            marginBottom: "2px",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            cursor: "help",
                            }}
                            title={ev.title}
                        >
                            {ev.title}
                        </li>
                        ))}
                    </ul>
                    ) : null;
                }
                return null;
                }}
            />
            </div>
            
            <div className="calendar-right">

            <h3>Events on {date.toDateString()}</h3>
            <ul>
                {eventsOnSelectedDate.map(ev => (
                    <li key={ev.id}><strong>{ev.title}</strong>: {ev.description}</li>
                ))}
            </ul>

            <h3>Add Event</h3>
            <input 
                type="date"
                min={todayStr}
                value={newEvent.date}
                onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
            />
            <input 
                type="text"
                placeholder="Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
            />
            <textarea
                placeholder="Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
            />
            <button onClick={handleAddEvent}>Add Event</button>
            </div>
            
            </div>
            
        </div>
            
        </>
    );
};

export default CalendarPage;