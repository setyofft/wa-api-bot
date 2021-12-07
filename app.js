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

app.use(express.static(__dirname + '/assets'));

app.get('/', (req, res) => {
    res.redirect('https://wa-api-bot.herokuapp.com/home');
})

app.get('/home', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
})

const SESSION_FILE_PATH = './apilogin-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

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
            '--disable-gpu'
        ],
    },
    session: sessionCfg
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
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
                socket.emit("message", "QR Code ready");
            }
        });
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        socket.emit("ready", "Client is ready!");
        socket.emit("message", "Client is ready!");
    });

    client.on('authenticated', (session) => {
        console.log('AUTHENTICATED', session);
        socket.emit("authenticated", "Client is authenticated!");
        socket.emit("message", "Client is authenticated!");
        sessionCfg = session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
            if (err) {
                console.error(err);
            }
        });
    });

    client.on('auth_failure', function(session) {
        console.log('Auth failure, restarting...');
        socket.emit('message', 'Auth failure, restarting...');
    });

})

client.on('disconnected', (reason) => {
    if (fs.existsSync(SESSION_FILE_PATH)) {
        status_disc = 1;
        console.log('Whatsapp is disconnected!', reason);
        // socket.emit('message', 'Whatsapp is disconnected!');
        fs.unlinkSync(SESSION_FILE_PATH, function(err) {
            if (err) return console.log(err);
            console.log('Session file deleted!');
        });
        client.destroy();
        client.initialize();
    } else {
        console.log("file not found !");
    }
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