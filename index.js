const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

// /!\ you need to have a .env file with URI_USERNAME and URI_PASSWORD with the password and username of your database
require('dotenv').config();

// /!\ you need to change the link with your own Mongodb link
mongoose.connect(`mongodb+srv://${process.env.URI_USERNAME}:${process.env.URI_PASSWORD}@vlille.dbcaruv.mongodb.net/test`);

mongoose.connection.on('connected', onReady);
mongoose.connection.on('disconnected', () => console.log('Disconnected from database'));
mongoose.connection.on('error', error => console.log(`Error during connection to database: ${error}`));

// mongoose model creation
const Station = mongoose.model("station", {
    id: Number,
    name: String,
    geometry: [Number],
    address: String,
    availablePark: Number,
    state: Boolean,
    tpe: Boolean,
    availableBike: Number,
    dateTime: String
});

const app = express();

const port = 1769;

app.use(express.json());

// main page with all the interactive elements

app.get('/', function (_, res) {
    res.sendFile('/index.html', {root: __dirname});
});

// function that takes portion of a station names and return elements corresponding to the name given
//function 4.1
app.post('/findByName', async function (req, res) {
    const searchedName = req.body.name;
    const regExp = new RegExp(searchedName, 'i')
    const results = await Station.find({
        name: {$regex: regExp}
    });
    console.log(results);
    res.json(results)
});


//function that takes a station id and suppress it from database
//question 4.2

app.post('/deleteStation', async function (req, res) {
    const searchedId = req.body.id;
    console.log(searchedId);
    Station.deleteOne({_id: searchedId}, function (err) {
        if (err) throw err;
        console.log(searchedId + " deleted");
    });
    return res.status(200).end()
});

//function that will delete every station in a 500m diameter around the position specified
//question 4.3
app.post('/deleteArea', async function (req, res) {
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    let empty = true;
    if (isNaN(latitude) || isNaN(longitude))

        console.log(Station)
    const results = await Station.find({
        geometry: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [latitude, longitude]
                },
                $maxDistance: 500,
                $minDistance: 0
            },
        }
    }, {projection: {_id: 1}})

    for (let searchedValue of results) {
        empty = false;
        Station.deleteOne({_id: searchedValue}, function (err) {
            if (err) throw err;
            console.log(searchedValue + " deleted");
        });
    }
    if (empty) {
        console.log('there is no station nearby');
        return res.status(400).end();
    }
    res.json(results);

});
// get all the station that are under 20% occupied between 18h and 19h during the week days (monday to friday)
//as we did not do the past exercises we will imagine that we dit workers to accumulate data overtime
//question 4.4

/*app.post('/getLeastOccupied', async function (req, res) {
    const results = await Station.aggregate({
        [
            { '$match': { 'size': { '$gt': 0} } },
            { '$addFields': {'day': { '$dayOfWeek': '$date'},'hour': {'$hour':'$date'} } },
            { '$match': { $and: [{day: {$gte: 2}}, {day: {$lte: 7}}, {hour: {$eq: 18}}]}},
            { '$group': { '_id': '$id', 'size':{ '$first': '$size'},'fill': { '$addToSet' :'$bikes'}}},
            { '$addFields': { 'fill': {'$multiply': [ {'$divide': [{'$avg': '$fill'}, '$size']}, 100]}}},
            { '$match':{ 'fill': {'$lte': 20}}}
        ]
    });
    console.log(results);
    res.json(results);*/

// routine to set up the database on init of the nodeJS server
async function onReady() {
    console.log('Connected to database');

    const vlille = await fetch('https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=vlille-realtime&q=&rows=3000&facet=libelle&facet=nom&facet=commune&facet=etat&facet=type&facet=etatconnexion');
    const data = await vlille.json();

    const stations = data.records.map(function (station) {
        return Station.updateOne({
            id: station.fields.libelle
        }, {
            name: station.fields.nom,
            geometry: station.fields.geo,
            availablePark: station.fields.nbplacesdispo,
            address: `${station.fields.adresse}, ${station.fields.commune}`,
            state: station.fields.etat === 'EN SERVICE',
            tpe: station.fields.type === 'AVEC TPE',
            availableBike: station.fields.nbvelosdispo,
            dateTime: station.fields.datemiseajour
        }, {
            upsert: true
        });
    });

    const results = await Promise.all(stations);

    const result = results.reduce(function (result, current) {
        ++result.fetched;

        result.inserted += current.upsertedCount;
        result.modified += current.modifiedCount;

        return result;
    }, {
        fetched: 0,
        inserted: 0,
        modified: 0
    });

    console.log(result);
}

// listen on the specified port for new connection

app.listen(port, function () {
    console.log(`Server Listening on port ${port}`);
});
