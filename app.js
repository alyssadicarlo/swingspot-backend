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
                let comment_data = [];
                const comments = await db.any(
                    `SELECT * FROM comments
                    WHERE topic_id=${topics[i].id};`
                )
                for (let i = 0; i < comments.length; i++) {
                    const comment_likes = await db.one(
                        `SELECT count(id) FROM comment_likes
                        WHERE comment_id=${comments[i].id};`
                    )
                    comment_data.push({
                        comment: comments[i],
                        likes: parseInt(comment_likes.count)
                    });
                }
                const likes = await db.one(
                    `SELECT count(id) FROM topic_likes
                    WHERE topic_id=${topics[i].id};`
                )
                response.push({
                    topic_data: topics[i],
                    likes: parseInt(likes.count),
                    comments: comment_data
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
                let comment_data = [];
                const comments = await db.any(
                    `SELECT * FROM comments
                    WHERE topic_id=${topics[i].id};`
                )
                for (let i = 0; i < comments.length; i++) {
                    const comment_likes = await db.one(
                        `SELECT count(id) FROM comment_likes
                        WHERE comment_id=${comments[i].id};`
                    )
                    comment_data.push({
                        comment: comments[i],
                        likes: parseInt(comment_likes.count)
                    });
                }
                const likes = await db.one(
                    `SELECT count(id) FROM topic_likes
                    WHERE topic_id=${topics[i].id};`
                )
                response.push({
                    topic_data: topics[i],
                    likes: parseInt(likes.count),
                    comments: comment_data
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
            let comment_data = [];
            const comments = await db.any(
                `SELECT * FROM comments
                WHERE topic_id=${topics[i].id};`
            )
            for (let i = 0; i < comments.length; i++) {
                const comment_likes = await db.one(
                    `SELECT count(id) FROM comment_likes
                    WHERE comment_id=${comments[i].id};`
                )
                comment_data.push({
                    comment: comments[i],
                    likes: parseInt(comment_likes.count)
                });
            }
            const likes = await db.one(
                `SELECT count(id) FROM topic_likes
                WHERE topic_id=${topics[i].id};`
            )
            response.push({
                topic_data: topics[i],
                likes: parseInt(likes.count),
                comments: comment_data
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
            let comment_data = [];
            const comments = await db.any(
                `SELECT * FROM comments
                WHERE topic_id=${topics[i].id};`
            )
            for (let i = 0; i < comments.length; i++) {
                const comment_likes = await db.one(
                    `SELECT count(id) FROM comment_likes
                    WHERE comment_id=${comments[i].id};`
                )
                comment_data.push({
                    comment: comments[i],
                    likes: parseInt(comment_likes.count)
                });
            }
            const likes = await db.one(
                `SELECT count(id) FROM topic_likes
                WHERE topic_id=${topics[i].id};`
            )
            response.push({
                topic_data: topics[i],
                likes: parseInt(likes.count),
                comments: comment_data
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
        const likes = await db.one(
            `SELECT count(id) FROM topic_likes
            WHERE topic_id=${topic.id};`
        )
        let comment_data = [];

        for (let i = 0; i < comments.length; i++) {
            const comment_likes = await db.one(
                `SELECT count(id) FROM comment_likes
                WHERE comment_id=${comments[i].id};`
            )
            comment_data.push({
                comment: comments[i],
                likes: parseInt(comment_likes.count)
            });
        }

        res.json({
            topic_data: topic,
            likes: parseInt(likes.count),
            comments: comment_data
        });
    } catch (error) {
        res.json({
            message: error.message
        });
    }
});

app.get('/comments', async (req, res) => {
    try {
        const response = await db.any(
            `SELECT comments.id, topic_id, comments.author, date_posted, comment_text, quoted_comment, quoted_comment_author, topics.name, topics.slug, users.picture FROM comments
            JOIN topics ON topics.id = comments.topic_id
            JOIN users ON comments.author = users.username
            ORDER BY date_posted DESC;`
        );
        res.json(response);
    } catch(error) {
        res.status(500).json({message: error});
    }
})

app.get('/comments/:comment_id/likes', async (req, res) => {
    const { comment_id } = req.params;

    try {
        const response = await db.any(
            `SELECT * FROM comment_likes
            WHERE comment_id=${comment_id};`
        )
        res.json(response)
    } catch(error) {
        res.json({
            message: error.message
        })
    }
})

app.post('/topics/add', authenticate, async (req, res) => {
    const { slug, name, author, author_id, topic_comment } = req.body;
    const newName = name.replace("'", "''");

    try {
        const topicResponse = await db.one(
            `INSERT INTO topics
                (slug, name, author, author_id, last_post_author, topic_comment)
            VALUES
                ('${slug}', '${newName}', '${author}', ${author_id},'${author}', '${topic_comment}')
            RETURNING id;`
        )
        const commentResponse = await db.result(
            `INSERT INTO comments
                (author, author_id, topic_id, comment_text)
            VALUES
                ('${author}', ${author_id},${topicResponse.id}, '${topic_comment}');`
        )
        res.status(200).json({ success: true });
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
                ('${author}', ${author_id}, ${topic_id}, '${comment_text}');`
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
                ('${author}', ${author_id},${topic_id}, '${comment_text}', '${quoted_text}', '${quoted_text_author}');`
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

app.post('/comments/:comment_id/favorite', async (req, res) => {
    const { comment_id } = req.params;
    const { username, user_id } = req.body;

    try {
        const checkIfLiked = await db.any(
            `SELECT * FROM comment_likes
            WHERE user_id=${user_id}
            AND comment_id=${comment_id};`
        )

        if (checkIfLiked.length === 0) {
            try {
                const response = await db.result(
                    `INSERT INTO comment_likes
                        (username, user_id, comment_id)
                    VALUES
                        ('${username}', ${user_id}, ${comment_id})`
                );
        
                res.status(200).json({ success: true });
            } catch (error) {
                res.status(500).json({ success: false, message: error})
            }
        } else {
            res.status(200).json({ success: false });
        }
        
    } catch (error) {
        res.status(500).json({ success: false });
    }
})

const usersController = require('./routes/users');
const { response } = require('express');

app.use('/users', usersController);