const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    // connectionString: 'postgres://pmrxezvavffjrt:56473c0b4fab71b92fae0ca4a3ac7aed45e6af1c5b58a8a84cd1e0cc49e64c5e@ec2-44-193-111-218.compute-1.amazonaws.com:5432/d2j1r7m2jeu4q4',
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect();

const readSession = async() => {
    try {
        const res = await client.query('SELECT * FROM session ORDER BY create_at DESC LIMIT 1');
        if (res.rows.length) return res.rows[0].session;
        return '';
    } catch (error) {
        throw error;
    }
}

const saveSession = (session) => {
    client.query('INSERT INTO session (session) VALUES($1)', [session], (err, results) => {
        if (err) {
            console.error('Failed to save session !', err);
        } else {
            console.log('Session saved!');
        }
    })
}

const removeSession = () => {
    client.query('DELETE FROM session', (err, results) => {
        if (err) {
            console.error('Failed to delete session !', err);
        } else {
            console.log('Session deleted!');
        }
    })
}

module.exports = {
    readSession,
    saveSession,
    removeSession
}