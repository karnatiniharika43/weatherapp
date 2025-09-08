import React, { useState } from "react";
import "./index.css";

// API endpoints
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"; // for fetching city coordinates
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast"; // for fetching weather data

// Mapping open-meteo weather codes to labels + icons
const weatherIcons = {
  0: {
    label: "Clear",
    icon: "https://cdn-icons-png.flaticon.com/512/869/869869.png",
  },
  1: {
    label: "Mainly Clear",
    icon: "https://cdn-icons-png.flaticon.com/512/1146/1146869.png",
  },
  2: {
    label: "Partly Cloudy",
    icon: "https://cdn-icons-png.flaticon.com/512/414/414825.png",
  },
  3: {
    label: "Overcast",
    icon: "https://cdn-icons-png.flaticon.com/512/414/414825.png",
  },
  45: {
    label: "Fog",
    icon: "https://cdn-icons-png.flaticon.com/512/4005/4005901.png",
  },
  48: {
    label: "Rime Fog",
    icon: "https://cdn-icons-png.flaticon.com/512/4005/4005901.png",
  },
  51: {
    label: "Light Drizzle",
    icon: "https://cdn-icons-png.flaticon.com/512/3076/3076129.png",
  },
  61: {
    label: "Rain",
    icon: "https://cdn-icons-png.flaticon.com/512/116/116251.png",
  },
  71: {
    label: "Snow",
    icon: "https://cdn-icons-png.flaticon.com/512/642/642102.png",
  },
  95: {
    label: "Thunderstorm",
    icon: "https://cdn-icons-png.flaticon.com/512/1146/1146860.png",
  },
};

function App() {
  // state variables
  const [city, setCity] = useState(""); // stores city input from user
  const [weather, setWeather] = useState(null); // stores current weather data
  const [nextHours, setNextHours] = useState([]); // stores next 6 hours forecast
  const [unit, setUnit] = useState("celsius"); // temperature Unit: celsius or fahrenheit
  const [loading, setLoading] = useState(false); // Loading state while fetching data
  const [error, setError] = useState(""); // stores error messages

  // fucntion to fetch weather for a given city
  async function fetchWeatherForCity(cityName) {
    if (!cityName.trim()) {
      //check if city input is empty
      setError("Please enter a city name");
      return;
    }

    try {
      setLoading(true); // show loading spinner
      setError(""); // reset error
      setWeather(null); // reset previous weather
      setNextHours([]); // reset previous forecast

      // fetch city coordinates using geocoding API
      const geoRes = await fetch(
        `${GEO_URL}?name=${encodeURIComponent(cityName)}&count=1`
      );
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        // handle city not fond
        setError("City not found. Please check the spelling.");
        return;
      }

      const { latitude, longitude, name, country, admin1 } = geoData.results[0]; // get city info

      // fetch weather data for coordinates
      const weatherRes = await fetch(
        `${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=apparent_temperature,precipitation,uv_index,temperature_2m,weathercode&timezone=auto`
      );
      const weatherData = await weatherRes.json();
      const current = weatherData.current_weather;

      const currentTime = new Date(current.time); // current time for reference

      // find the index of the first hourly forecast after current time
      const nextHourIndex = weatherData.hourly.time.findIndex(
        (t) => new Date(t) > currentTime
      );

      // prepare next 6 hours forecast
      const hours = weatherData.hourly.time
        .slice(nextHourIndex, nextHourIndex + 6)
        .map((t, i) => ({
          time: t,
          tempC: weatherData.hourly.temperature_2m[nextHourIndex + i],
          feelsLikeC:
            weatherData.hourly.apparent_temperature[nextHourIndex + i],
          precipitation: weatherData.hourly.precipitation[nextHourIndex + i],
          uvIndex: weatherData.hourly.uv_index[nextHourIndex + i],
          weathercode: weatherData.hourly.weathercode[nextHourIndex + i],
          icon: weatherIcons[weatherData.hourly.weathercode[nextHourIndex + i]]
            ?.icon,
          label:
            weatherIcons[weatherData.hourly.weathercode[nextHourIndex + i]]
              ?.label,
        }));
      setNextHours(hours); // save next 6 hours forecast

      // prepare current weather info
      setWeather({
        city: name,
        country,
        region: admin1,
        time: current.time,
        temperatureC: current.temperature,
        feelsLikeC:
          weatherData.hourly.apparent_temperature[nextHourIndex - 1] ??
          current.temperature,
        windspeed: current.windspeed,
        weathercode: current.weathercode,
        description: weatherIcons[current.weathercode]?.label ?? "Weather",
        icon: weatherIcons[current.weathercode]?.icon,
        precipitation: weatherData.hourly.precipitation[nextHourIndex - 1] ?? 0,
        uvIndex: weatherData.hourly.uv_index[nextHourIndex - 1] ?? "N/A",
      });
    } catch (err) {
      console.error(err); // log any errors
      setError("Failed to fetch weather. Please try again."); // show error to user
    } finally {
      setLoading(false); // stop loading spinner
    }
  }

  // Temperature conversion between celsius and fahrenheit
  function formatTemp(tempC) {
    if (tempC == null) return "—";
    return unit === "celsius"
      ? tempC.toFixed(1)
      : ((tempC * 9) / 5 + 32).toFixed(1);
  }

  return (
    <div className="app">
      <div className="weather-card">
        <h2>Weather App</h2>
        <div className="search">
          <input
            type="text"
            placeholder="Enter city..."
            value={city}
            onChange={(e) => setCity(e.target.value)} // update city name on typing
            onKeyDown={(e) => e.key === "Enter" && fetchWeatherForCity(city)} // enter key triggers search
          />
          <button onClick={() => fetchWeatherForCity(city)}>Search</button>
          <button
            onClick={() =>
              setUnit(unit === "celsius" ? "fahrenheit" : "celsius")
            }
          >
            Switch to {unit === "celsius" ? "°F" : "°C"}
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="error">{error}</p>}

        {weather && (
          <div className="weather-info">
            <h3>
              {weather.city}, {weather.country}
            </h3>
            <p>
              Local Time:{" "}
              {new Date(weather.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <img src={weather.icon} alt={weather.description} width="80" />
            <p>
              {formatTemp(weather.temperatureC)}°
              {unit === "celsius" ? "C" : "F"}
            </p>
            <p>{weather.description}</p>
            <div className="extra-info">
              <p>Feels Like: {formatTemp(weather.feelsLikeC)}°</p>
              <p>Wind: {weather.windspeed} km/h</p>
              <p>Precipitation: {weather.precipitation} mm</p>
              <p>UV Index: {weather.uvIndex}</p>
            </div>

            {nextHours.length > 0 && (
              <div className="hourly-forecast">
                <h4>Next 6 Hours Forecast</h4>
                <div className="forecast-cards">
                  {nextHours.map((hour, idx) => (
                    <div key={idx} className="forecast-card">
                      <p>
                        {new Date(hour.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <img src={hour.icon} alt={hour.label} width="40" />
                      <p>{formatTemp(hour.tempC)}°</p>
                      <p>{hour.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
