const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

require('dotenv').config();

mongoose.connect(`mongodb+srv://${process.env.URI_USERNAME}:${process.env.URI_PASSWORD}@vlille.dbcaruv.mongodb.net/test`);

mongoose.connection.on('connected', onReady);
mongoose.connection.on('disconnected', () => console.log('Disconnected from database'));
mongoose.connection.on('error', error => console.log(`Error during connection to database: ${error}`));

const Station = mongoose.model("station", {
    id: Number,
    name: String,
    geometry: [Number],
    address: String,
    size: Number,
    state: Boolean,
    tpe: Boolean
});

const app = express();

const port = 1769;

app.use(express.json());

app.get('/', function(_, res) {
    res.sendFile('/index.html', { root: __dirname });
});

app.post('/findByPosition', async function(req, res) {
    console.log('oui', req.body)
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);

    if (isNaN(latitude) || isNaN(longitude))
        return res.status(400).end();

    const results = await Station.find({
        geometry: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [ 50.634268,3.048567]
                },
                $maxDistance: 1000,
                $minDistance: 0
            },
        }
    });

    res.json(results);
});

async function onReady() {
    console.log('Connected to database');

    const vlille = await fetch('https://opendata.lillemetropole.fr/api/records/1.0/search/?dataset=vlille-realtime&q=&rows=3000&facet=libelle&facet=nom&facet=commune&facet=etat&facet=type&facet=etatconnexion');
    const data = await vlille.json();

    const stations = data.records.map(function(station) {
        return Station.updateOne({
            id: station.fields.libelle
        }, {
            name: station.fields.nom,
            geometry: station.fields.geo,
            size: station.fields.nbplacesdispo,
            address: `${station.fields.adresse}, ${station.fields.commune}`,
            state: station.fields.etat == 'EN SERVICE',
            tpe: station.fields.type == 'AVEC TPE'
        }, {
            upsert: true
        });
    });
    
    const results = await Promise.all(stations);

    const result = results.reduce(function(result, current) {
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

app.listen(port, function() {
    console.log(`Server Listening on port ${port}`);
});
