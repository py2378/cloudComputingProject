const express = require('express');
const mongoose = require('mongoose');

require('dotenv').config();

mongoose.connect(`mongodb+srv://${process.env.URI_USERNAME}:${process.env.URI_PASSWORD}@vlille.dbcaruv.mongodb.net/test`);

mongoose.connection.on('connected', onReady);
mongoose.connection.on('disconnected', () => console.log('Disconnected from database'));
mongoose.connection.on('error', error => console.log(`Error during connection to database: ${error}`));

const Station = mongoose.model("station", {

});

const app = express();

const port = 1769;

app.get('/', function(req, res) {
    res.send('Bonjour monde !');
});

async function onReady() {
    console.log('Connected to database');

    const stations = await Station.find();

    console.log(stations);
}

app.listen(port, function() {
    console.log(`Server Listening on port ${port}`);
});
