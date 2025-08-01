require('dotenv').config();
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const db = require('../db'); 

const router = express.Router();

const scopes = ['identify', 'email'];

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length) done(null, rows[0]);
    else done(null, null);
  } catch (e) {
    done(e, null);
  }
});

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_ID,
  clientSecret: process.env.DISCORD_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK,
  scope: scopes,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Upsert user into DB
    const { id, username, email, avatar } = profile;
    await db.query(`
      INSERT INTO users (id, username, email, avatar)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE username = VALUES(username), email = VALUES(email), avatar = VALUES(avatar)
    `, [id, username, email, avatar]);
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return done(null, rows[0]);
  } catch (e) {
    return done(e, null);
  }
}));

router.get('/discord', passport.authenticate('discord'));

router.get('/integration/discord',
  passport.authenticate('discord', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/home');
  }
);

router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

module.exports = router;
