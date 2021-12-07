const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const soketIO = require('socket.io');
const express = require('express');
const http = require('http');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { phoneNumberFormatter } = require('./helper/formater');

const app = express();
const server = http.createServer(app);
const io = soketIO(server);
let status_disc = 0;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = require('./helper/db.js');

(async() => {

    app.use(express.static(__dirname + '/assets'));

    app.get('/', (req, res) => {
        res.redirect('https://wa-api-bot.herokuapp.com/home');
    })

    app.get('/home', (req, res) => {
        res.sendFile('index.html', { root: __dirname });
    })

    const savedSession = await db.readSession();
    const client = new Client({
        restartOnAuthFail: true,
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--memory-pressure-off',
                '--no-zygote'
            ],
        },
        session: savedSession,
    });

    client.on('message', msg => {
        if (msg.body == 'PIM') {
            msg.reply('Pintar Inovasi Mandiri');
        }
    });

    client.initialize();

    io.on('connection', function(socket) {
        socket.emit("message", "Connecting...");
        client.on('qr', (qr) => {
            console.log("Client is ready scane QR Code !");
            qrcode.toDataURL(qr, (err, url) => {
                if (url == "") {
                    socket.emit("message", "Error generate QR Code !");
                } else {
                    socket.emit("qr", url);
                    socket.emit("message", "Client is ready scane QR Code !");
                }
            });
        });

        client.on('ready', () => {
            status_disc = 0;
            console.log('Client is ready!');
            socket.emit("ready", "Api client is ready!");
        });

        client.on('authenticated', (session) => {
            console.log('AUTHENTICATED', session);
            socket.emit("authenticated", "Client is authenticated!");
            db.saveSession(session);
        });

        client.on('auth_failure', function(session) {
            status_disc = 0;
            console.log('Auth failure, restarting... ' + session);
            socket.emit('auth_failure', 'Auth failure, restarting... ');
            db.removeSession();
        });

        client.on('change_battery', (batteryInfo) => {
            const { battery, plugged } = batteryInfo;
            console.log(`Battery: ${battery}% - Charging? ${plugged}`);
            socket.emit('change_battery', `Battery: ${battery}% - Charging? ${plugged}`);
        });

    })

    client.on('disconnected', (reason) => {
        status_disc = 1;
        // socket.emit('disconnected', 'Whatsapp is disconnected!');
        db.removeSession();
        client.destroy();
        client.initialize();

    });

    const checkRegisteredNumber = async function(number) {
        const isRegistered = await client.isRegisteredUser(number);
        return isRegistered;
    }

    app.post('/send-message', [
        body('number').notEmpty(),
        body('message').notEmpty()
    ], async(req, res) => {

        if (status_disc == 0) {
            const errors = validationResult(req).formatWith(({ msg }) => {
                return msg;
            })

            if (!errors.isEmpty()) {
                return res.status(422).json({
                    status: false,
                    message: errors.mapped()
                })
            } else {
                const number = phoneNumberFormatter(req.body.number);
                const message = req.body.message;

                const isRegisteredNumber = await checkRegisteredNumber(number);

                if (!isRegisteredNumber) {
                    return res.status(422).json({
                        status: false,
                        message: 'The number is not registered'
                    });
                } else {
                    client.sendMessage(number, message).then(response => {
                        res.status(200).json({
                            status: true,
                            response: response
                        })
                    }).catch(err => {
                        res.status(500).json({
                            status: false,
                            response: err
                        })
                    })
                }
            }
        } else {
            return res.status(422).json({
                status: false,
                message: 'Whatsapp is disconnected!'
            });
        }
    })

    server.listen(process.env.PORT || 8000, function() {
        console.log("App running in port 8000");
    })

})();