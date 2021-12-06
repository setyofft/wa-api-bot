const express = require('express');
const wbm = require('wbm');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/kirim', (req, res) => {
    wbm.start().then(async() => {
        const phones = ['6285725531089'];
        const message = 'Hae pendekar, good morning.';
        await wbm.send(phones, message);
        await wbm.end();
    }).catch(err => console.log(err));
})

app.listen(8000, function() {
    console.log("App running in port 8000");
})