'use strict';

const http = require('http');
const port = 3333;

const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./db');
const authenticate = require('./middlewares/authMiddleware');

require('dotenv').config();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended: false}));

const server = http.createServer(app);

server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

app.get('/', function(req, res) {
  return res.status(200).json({ message: 'SwingSpot API' });
});

app.get('/topics', async (req, res) => {

    if (req.query.search) {
        console.log("SEARCH QUERY", req.query);
        const uppercase = req.query.search.toUpperCase();
        const lowercase = req.query.search.toLowerCase();
        try {
            const response = [];
            const topics = await db.any(
                `SELECT * FROM topics
                WHERE upper(name) LIKE '%${uppercase}%'
                OR lower(name) LIKE '%${lowercase}%';`
            )
            for (let i = 0; i < topics.length; i++) {
                const comments = await db.any(
                    `SELECT * FROM comments
                    WHERE topic_id=${topics[i].id};`
                )
                const likes = await db.one(
                    `SELECT sum(value) FROM likes
                    WHERE topic_id=${topics[i].id};`
                )
                response.push({
                    topic_data: topics[i],
                    vote_count: parseInt(likes.sum),
                    comments: comments
                });
            }
            res.json(response);
        } catch (error) {
            res.json({
                message: error.message
            });
        }
    } else {
        try {
            const response = [];
            const topics = await db.any(
                `SELECT * FROM topics
                ORDER BY last_post DESC;`
            )
            for (let i = 0; i < topics.length; i++) {
                const comments = await db.any(
                    `SELECT * FROM comments
                    WHERE topic_id=${topics[i].id};`
                )
                const likes = await db.one(
                    `SELECT sum(value) FROM likes
                    WHERE topic_id=${topics[i].id};`
                )
                response.push({
                    topic_data: topics[i],
                    vote_count: parseInt(likes.sum),
                    comments: comments
                });
            }
            res.json(response);
        } catch (error) {
            res.json({
                message: error.message
            });
        }
    }
    
});

app.get('/topics/top', async (req, res) => {
    try {
        const response = [];
        const topics = await db.any(
            `SELECT * FROM topics
            ORDER BY views DESC;`
        )
        for (let i = 0; i < topics.length; i++) {
            const comments = await db.any(
                `SELECT * FROM comments
                WHERE topic_id=${topics[i].id};`
            )
            const likes = await db.one(
                `SELECT sum(value) FROM likes
                WHERE topic_id=${topics[i].id};`
            )
            response.push({
                topic_data: topics[i],
                vote_count: parseInt(likes.sum),
                comments: comments
            });
        }
        res.json(response);
    } catch (error) {
        res.json({
            message: error.message
        });
    }
});

app.get('/topics/latest', async (req, res) => {
    try {
        const response = [];
        const topics = await db.any(
            `SELECT * FROM topics
            ORDER BY last_post DESC;`
        )
        for (let i = 0; i < topics.length; i++) {
            const comments = await db.any(
                `SELECT * FROM comments
                WHERE topic_id=${topics[i].id};`
            )
            const likes = await db.one(
                `SELECT sum(value) FROM likes
                WHERE topic_id=${topics[i].id};`
            )
            response.push({
                topic_data: topics[i],
                vote_count: parseInt(likes.sum),
                comments: comments
            });
        }
        res.json(response);
    } catch (error) {
        res.json({
            message: error.message
        });
    }
});


app.get('/topics/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const addView = await db.result(
            `UPDATE topics
            SET views = views + 1
            WHERE slug='${slug}';`
        )
        const topic = await db.one(
            `SELECT * FROM topics
            WHERE slug='${slug}'`
        );
        const comments = await db.any(
            `SELECT * FROM comments
            WHERE topic_id=${topic.id};`
        );
        res.json({
            topic_data: topic,
            comments
        });
    } catch (error) {
        res.json({
            message: error.message
        });
    }
});

app.post('/topics/add', authenticate, async (req, res) => {
    const { slug, name, author, author_id, topic_comment } = req.body;
    const newName = name.replace("'", "''");

    try {
        const topicResponse = await db.one(
            `INSERT INTO topics
                (slug, name, author, author_id, last_post_author, topic_comment)
            VALUES
                ('${slug}', '${newName}', '${author}', '${author_id}','${author}', '${topic_comment}')
            RETURNING id;`
        )
        const commentResponse = await db.result(
            `INSERT INTO comments
                (author, author_id, topic_id, comment_text)
            VALUES
                ('${author}', '${author_id}',${topicResponse.id}, '${topic_comment}');`
        )
        res.sendStatus(200);
    } catch(error) {
        console.error("ERROR: ", error);
        res.status(500).json(error);
    }
});

app.post('/comments/add', async (req, res) => {
    const { author, author_id, topic_id, comment_text } = req.body;

    try {
        const commentResponse = await db.result(
            `INSERT INTO comments
                (author, author_id, topic_id, comment_text)
            VALUES
                ('${author}', '${author_id}',${topic_id}, '${comment_text}');`
        )
        const topicResponse = await db.result(
            `UPDATE topics
            SET last_post = NOW(),
                last_post_author='${author}'
            WHERE id=${topic_id}`
        )
        const addReply = await db.result(
            `UPDATE topics
            SET replies = replies + 1
            WHERE id=${topic_id};`
        )
        res.status(200).json({ success: true });
    } catch(error) {
        console.error("ERROR: ", error);
        res.status(500).json({ success: false, message: error});
    }

})

app.post('/comments/add_quote', async (req, res) => {
    const { author, author_id, topic_id, comment_text, quoted_text, quoted_text_author } = req.body;

    try {
        const commentResponse = await db.result(
            `INSERT INTO comments
                (author, author_id, topic_id, comment_text, quoted_comment, quoted_comment_author)
            VALUES
                ('${author}', '${author_id}',${topic_id}, '${comment_text}', '${quoted_text}', '${quoted_text_author}');`
        )
        const topicResponse = await db.result(
            `UPDATE topics
            SET last_post = NOW(),
                last_post_author='${author}'
            WHERE id=${topic_id}`
        )
        const addReply = await db.result(
            `UPDATE topics
            SET replies = replies + 1
            WHERE id=${topic_id};`
        )
        res.status(200).json({ success: true });
    } catch(error) {
        console.error("ERROR: ", error);
        res.status(500).json({ success: false, message: error});
    }
});

const usersController = require('./routes/users');

app.use('/users', usersController);