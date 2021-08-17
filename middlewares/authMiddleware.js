const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (authHeader) {
        let token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            
            if (decoded) {
                const username = decoded.username;
                
                try {
                    const user = await db.one(
                        `SELECT * FROM users
                        WHERE username='${username}'`
                    )
                    next();
                } catch (error) {
                    res.json({ success: false, message: 'User does not exist'});
                }
            } else {
                res.status(401).json({ success: false, message: 'No authorization headers found'});
            }
        } catch (error) {
            res.status(401).json({ success: false, message: 'Token has been tampered with'});
        }

    } else {
        res.status(401).json({ success: false, message: 'No authorization headers found'});
    }
}

module.exports = authenticate;