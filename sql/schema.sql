CREATE TABLE topics (
    id serial PRIMARY KEY,
    slug text,
    name text,
    author text,
    author_id integer REFERENCES users(id),
    views integer DEFAULT 0,
    replies integer DEFAULT 0,
    last_post timestamp default NOW(),
    last_post_author text DEFAULT null,
    topic_comment text
);

CREATE TABLE comments (
    id serial PRIMARY KEY,
    author text,
    author_id integer REFERENCES users(id),
    topic_id integer REFERENCES topics(id),
    date_posted timestamp DEFAULT NOW(),
    comment_text text,
    quoted_comment text DEFAULT null,
    quoted_comment_author text DEFAULT null
);

CREATE TABLE comment_likes (
    id serial PRIMARY KEY,
    username text,
    user_id integer REFERENCES users(id),
    comment_id integer REFERENCES comments(id)
);

CREATE TABLE topic_likes (
    id serial PRIMARY KEY,
    username text,
    user_id integer REFERENCES users(id),
    topic_id integer REFERENCES topics(id)
);