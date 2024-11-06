const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema({
  city: { type: String, required: true, unique: true },
  data: { type: Object, required: true },
});

const Weather = mongoose.model('Weather', weatherSchema);

module.exports = Weather;
