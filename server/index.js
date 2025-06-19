import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { initializeSocket } from './controllers/socketController.js';
import session from 'express-session';
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import User from './models/User.js';
import getPool from './config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
});

app.use(
  session({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, 
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy.Strategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/api/users/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const pool = await getPool();
        let user = await User.findByGoogleId(profile.id);
        if (!user) {
          user = await User.findByEmail(profile.emails[0].value);
          if (user) {
            await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [profile.id, user.id]);
          } else {
            const userId = await User.create({
              username: profile.displayName || `user_${profile.id}`,
              email: profile.emails[0].value,
              google_id: profile.id,
            });
            user = await User.findById(userId);
          }
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.use(
  new FacebookStrategy.Strategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: 'http://localhost:3000/api/users/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const pool = await getPool();
        let user = await User.findByFacebookId(profile.id);
        if (!user) {
          user = await User.findByEmail(profile.emails ? profile.emails[0].value : null);
          if (user) {
            await pool.query('UPDATE users SET facebook_id = ? WHERE id = ?', [profile.id, user.id]);
          } else {
            const userId = await User.create({
              username: profile.displayName || `user_${profile.id}`,
              email: profile.emails ? profile.emails[0].value : null,
              facebook_id: profile.id,
            });
            user = await User.findById(userId);
          }
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin'],
  })
);
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.use(
  '/styles',
  express.static(join(__dirname, 'public/styles'), {
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
    },
  })
);

app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

initializeSocket(io);

async function startServer() {
  try {
    await getPool(); 
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();



