require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const authRoutes = require('./routes/auth');
const db = require('./db');
const app = express();
const PORT = process.env.JS_FORUM_PORT || 5555;

// Session
app.use(session({
  secret: 'forum_secret', // Replace in production
  resave: false,
  saveUninitialized: false,
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static (optional)
app.use('/static', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});


app.get('/home', async (req, res) => {
  if (!req.user) return res.redirect('/');

  try {
    const [topPosts] = await db.query("SELECT * FROM posts ORDER BY views DESC LIMIT 5");
    const [latestPosts] = await db.query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 5");
    const [trendingPosts] = await db.query("SELECT * FROM posts WHERE views > 10 ORDER BY created_at DESC LIMIT 5");

    res.render('home', {
      user: req.user,
      topPosts,
      latestPosts,
      trendingPosts
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});
app.get('/account', async (req, res) => {
  if (!req.user) return res.redirect('/');

  try {
    const [rows] = await db.query('SELECT id, username, email, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).send('User not found');

    const userData = rows[0];

    res.render('account', {
      user: req.user,
      userData
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

app.post('/account/delete', async (req, res) => {
  if (!req.user) return res.redirect('/');

  const uid = req.user.id;

  try {
    // mark user's posts as deleted
    await db.query(`UPDATE posts SET deleted = 1 WHERE author_id = ?`, [uid]);

    // get all post ids by user
    const [userPosts] = await db.query(`SELECT id FROM posts WHERE author_id = ?`, [uid]);
    const userPostIds = userPosts.map(p => p.id);

    // blank comments on user's posts
    if (userPostIds.length) {
      await db.query(`
        UPDATE comments 
        SET content = '[deleted]', author_id = NULL 
        WHERE post_id IN (?)
      `, [userPostIds]);
    }

    // blank user's own comments (anywhere)
    await db.query(`
      UPDATE comments 
      SET content = '[deleted]', author_id = NULL 
      WHERE author_id = ?
    `, [uid]);

    // delete user's reactions
    await db.query(`DELETE FROM reactions WHERE user_id = ?`, [uid]);

    // delete user record
    await db.query(`DELETE FROM users WHERE id = ?`, [uid]);

    // logout safely
    req.logout(err => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).send('Failed to logout after deleting account');
      }
      res.redirect('/');
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete account');
  }
});


app.get('/new', (req, res) => {
  if (!req.user) return res.redirect('/');
  res.render('new-post', { user: req.user });
});
app.post('/new', async (req, res) => {
  if (!req.user) return res.redirect('/');
  const { title, content } = req.body;

  if (!title || !content) return res.status(400).send('Missing title or content');

  try {
    await db.query(
      'INSERT INTO posts (title, content, author_id, author_name) VALUES (?, ?, ?, ?)',
      [title, content, req.user.id, req.user.username]
    );
    res.redirect('/home');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to create post');
  }
});

app.get('/posts/:id', async (req, res) => {
  if (!req.user) return res.redirect('/');

  const { id } = req.params;

  try {
    const [[post]] = await db.query(
      `SELECT posts.*, users.username, users.avatar 
       FROM posts 
       JOIN users ON posts.author_id = users.id 
       WHERE posts.id = ?`,
      [id]
    );

    if (!post) return res.status(404).send('Post not found');

    await db.query('UPDATE posts SET views = views + 1 WHERE id = ?', [id]);

    const [comments] = await db.query(
      `SELECT comments.*, users.username 
       FROM comments 
       JOIN users ON comments.author_id = users.id 
       WHERE comments.post_id = ?
       ORDER BY comments.created_at ASC`,
      [id]
    );

    const [reactions] = await db.query(
      `SELECT comment_id, emoji, COUNT(*) AS count
       FROM reactions
       WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ?)
       GROUP BY comment_id, emoji`,
      [id]
    );

    const reactionMap = {};
    for (const r of reactions) {
      if (!reactionMap[r.comment_id]) reactionMap[r.comment_id] = {};
      reactionMap[r.comment_id][r.emoji] = r.count;
    }

    for (const c of comments) {
      c.reactions = reactionMap[c.id] || {};
    }

    res.render('post', {
      post,
      comments,
      user: req.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error');
  }
});

app.post('/comments/:postId', async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  if (!req.user) return res.redirect('/');
  await db.query(
    'INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)',
    [postId, req.user.id, content]
  );
  res.redirect(`/posts/${postId}`);
});

app.post('/comments/:postId/reply', async (req, res) => {
  const { postId } = req.params;
  const { parent_id, content } = req.body;
  if (!req.user) return res.redirect('/');
  await db.query(
    'INSERT INTO comments (post_id, author_id, content, parent_id) VALUES (?, ?, ?, ?)',
    [postId, req.user.id, content, parent_id]
  );
  res.redirect(`/posts/${postId}`);
});

const ALLOWED_EMOJIS = ['😧','😒','👿','😢','✔','🤣','👽','👍','😜','👏','😎','🎉','👀','✨','🤔'];

app.post('/react', async (req, res) => {
  const { comment_id, emoji } = req.body;
  if (!req.user || !comment_id || !ALLOWED_EMOJIS.includes(emoji)) {
    return res.status(400).send('Invalid reaction');
  }

  try {
    await db.query(
      `INSERT INTO reactions (comment_id, user_id, emoji)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE emoji = VALUES(emoji)`,
      [comment_id, req.user.id, emoji]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).send('Reaction failed');
  }
});


app.listen(PORT, () => {
  console.log(`JSForum running on http://localhost:${PORT}`);
});
