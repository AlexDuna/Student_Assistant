import React,{useEffect, useState} from "react";
import { WEATHER_API_KEY } from "../utils/config";
import "../pages/DashboardPage.css";

const OPENWEATHER_KEY = WEATHER_API_KEY;
const DEFAULT_CITY = "Bucharest";

function WeatherWidget({ onWeatherLoaded }) {
    const [weather, setWeather] = useState(null);

    useEffect( () => {
        function fetchWeather(lat, lon){
            let url = lat && lon
                ?`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`
                :`https://api.openweathermap.org/data/2.5/weather?q=${DEFAULT_CITY}&appid=${OPENWEATHER_KEY}&units=metric`;
            fetch(url)
                .then(res => res.json())
                .then(data => setWeather(data))
        }

        if("geolocation" in navigator){
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                () => fetchWeather(),
                {timeout: 3000}
            );
        }else{
            fetchWeather();
        }
    }, []);

    if(!weather) return <div className="weather-widget"> Loading weather...</div>;
    if(weather.cod !== 200) return <div className="weather-widget">Weather unavailable</div>;

    return (
        <div className="weather-widget">
          <img
            src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
            alt={weather.weather[0].main}
            className="weather-icon"
          />
          <div className="weather-main">
            <span className="weather-temp">{Math.round(weather.main.temp)}°C</span>
            <span className="weather-city">{weather.name}</span>
            <span className="weather-desc">{weather.weather[0].description}</span>
          </div>
        </div>
      );
}

export default WeatherWidget;