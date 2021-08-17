const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

function checkPassword(hashedPassword, password) {
    return bcrypt.compareSync(password, hashedPassword)
}

router.get('/', async (req, res) => {
    try {
        const response = await db.any(
            `SELECT id, first_name, last_name, username, email FROM users;`
        )
        res.status(200).json(response);
    } catch (error) {
        console.error('ERROR: ', error);
        res.status(500).json(error);
    }
});

router.get('/:username', async (req, res) => {

    try {
        const inputUsername = req.body.username;

        const response = await db.one(
            `SELECT * FROM users
            WHERE username='${inputUsername}';`
        )
        const {id, first_name, last_name, username, email} = response;
        res.status(200).json({
            isValid, user_id: id, first_name, last_name, username, email
        });
    } catch (error) {
        console.error('ERROR: ', error);
        res.status(500).json(error);
    }
});

router.post('/login', async (req, res) => {
    
    try {
        const inputEmail = req.body.email;
        const inputPassword = req.body.password;

        const response = await db.one(
            `SELECT * FROM users
            WHERE email = '${inputEmail}';`
        );

        const isValid = checkPassword(response.password, inputPassword);

        if (!!isValid) {
            const token = jwt.sign({
                username: response.username
            }, process.env.SECRET_KEY)
            res.json({
                success: isValid, token, username: response.username
            });
        } else {
            res.json({success: false, message: 'Not authenticated'});
        }
    } catch (error) {
        res.json({ success: false, message: 'User not found'});
    }
});

router.post('/add', async (req, res) => {

    try {
        const { first_name, last_name, username, email, password } = req.body;
    
        const salt = bcrypt.genSaltSync();
        const hash = bcrypt.hashSync(password, salt);
        
        const query = `
        INSERT INTO users
            (first_name, last_name, username, email, password)
        VALUES
            ('${first_name}','${last_name}', '${username}', '${email}','${hash}') RETURNING id;`;
        const response = await db.one(query);
        res.status(200).json({
            id: response
        });
    } catch (error) {
        console.error('ERROR: ', error);
        res.status(500).json(error);
    }
})

module.exports = router;