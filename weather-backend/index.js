require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');
const Weather = require('./Weather'); // Ensure this path is correct

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

  app.get('/api/weather/:city', async (req, res) => {
    const city = req.params.city;
    const apiKey = process.env.WEATHER_API_KEY;
  
    try {
      const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
      const weather = await Weather.findOneAndUpdate(
        { city },
        { data: response.data },
        { new: true, upsert: true }
      );
  
      res.json(weather);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      res.status(500).send('Server error');
    }
  });
  

  app.post('/api/cities', async (req, res) => {
    const { city } = req.body;
  
    const existingCity = await Weather.findOne({ city });
    if (existingCity) {
      return res.status(400).send('City is already being tracked');
    }
  
    try {
      const apiKey = process.env.WEATHER_API_KEY;
      const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}`);
      const weather = new Weather({ city, data: response.data });
      await weather.save();
  
      res.status(201).send('City added');
    } catch (error) {
      console.error('Error adding new city:', error);
      res.status(500).send('Server error');
    }
  });
  

  app.get('/api/cities', async (req, res) => {
    try {
      const cities = await Weather.find({}, 'city data');
      res.json(cities);
    } catch (error) {
      console.error('Error retrieving tracked cities:', error);
      res.status(500).send('Server error');
    }
  });
  

  app.delete('/api/cities/:id', async (req, res) => {
    const cityId = req.params.id;
  
    try {
      await Weather.findByIdAndRemove(cityId);
      res.status(200).send('City removed');
    } catch (error) {
      console.error('Error removing city:', error);
      res.status(500).send('Server error');
    }
  });
  

// Scheduled task to update weather data every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled task to update weather data');

  try {
    const cities = await Weather.find({}, 'city');
    const apiKey = process.env.WEATHER_API_KEY;

    for (let weather of cities) {
      const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=${weather.city}&appid=${apiKey}`);
      await Weather.findOneAndUpdate(
        { city: weather.city },
        { data: response.data },
        { new: true, upsert: true }
      );
    }

    console.log('Weather data updated successfully');
  } catch (error) {
    console.error('Error updating weather data:', error);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
