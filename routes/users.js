const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authenticate = require('../middlewares/authMiddleware');

function checkPassword(hashedPassword, password) {
    return bcrypt.compareSync(password, hashedPassword)
}

router.get('/', async (req, res) => {
    try {
        const response = await db.any(
            `SELECT id, first_name, last_name, username, email, registered_date FROM users
            ORDER BY registered_date DESC;`
        )
        res.status(200).json(response);
    } catch (error) {
        console.error('ERROR: ', error);
        res.status(500).json(error);
    }
});

router.get('/:username', async (req, res) => {

    try {
        const inputUsername = req.params.username;

        const response = await db.one(
            `SELECT * FROM users
            WHERE username='${inputUsername}';`
        )
        const {id, first_name, last_name, username, email, picture, registered_date} = response;
        
        res.status(200).json({
            success: true, user_id: id, first_name, last_name, username, email, picture, registered_date
        });
    } catch (error) {
        console.error('ERROR: ', error);
        res.status(500).json({success: false, error });
    }
});

router.post('/login', async (req, res) => {
    const inputEmail = req.body.email;
    const inputPassword = req.body.password;
    
    try {

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
            res.json({success: false, message: 'Email or password is incorrect'});
        }
    } catch (error) {
        res.json({ success: false, message: 'No user found.', error: error});
    }
});

router.post('/add', async (req, res) => {

    const { first_name, last_name, username, email, password } = req.body;

    const salt = bcrypt.genSaltSync();
    const hash = bcrypt.hashSync(password, salt);

    try {
        const query = `
        INSERT INTO users
            (first_name, last_name, username, email, password, picture)
        VALUES
            ('${first_name}','${last_name}', '${username}', '${email}','${hash}', 'https://ui-avatars.com/api/?name=${first_name}+${last_name}&background=random') RETURNING id;`;
        const response = await db.one(query);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Email already in use" });
    }
})

router.post('/update/picture', authenticate, async (req, res) => {
    try {
        const { picture, username } = req.body;

        const response = await db.result(
            `UPDATE users
            SET picture='${picture}'
            WHERE username='${username}';`
        );
        res.status(200).json({ success: true });
    } catch(error) {
        res.status(500).json({ success: false, message: error });
    }
});

router.post('/update/name', authenticate, async (req, res) => {
    try {
        const { first_name, last_name, username } = req.body;

        const firstNameResponse = await db.result(
            `UPDATE users
            SET first_name='${first_name}'
            WHERE username='${username}';`
        );

        const lastNameResponse = await db.result(
            `UPDATE users
            SET last_name='${last_name}'
            WHERE username='${username}';`
        );
        
        res.status(200).json({ success: true });
    } catch(error) {
        console.error(error);
        res.status(500).json({ success: false, message: error });
    }
});

router.post('/update/password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword, username } = req.body;

        const response = await db.one(
            `SELECT * FROM users
            WHERE username = '${username}';`
        );

        const isValid = checkPassword(response.password, currentPassword);

        if (!!isValid) {

            const salt = bcrypt.genSaltSync();
            const hash = bcrypt.hashSync(newPassword, salt);

            const response = await db.result(
                `UPDATE users
                SET password='${hash}'
                WHERE username='${username}';`
            );

            res.json({ success: true });
        } else {
            res.json({success: false, message: 'Password is not correct'});
        }
    } catch(error) {
        res.json({ success: false, message: error.message });
    }
})

module.exports = router;