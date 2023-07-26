const express = require("express");
const redis = require("redis");
const { v4: uuidv4 } = require("uuid");
const config = require("./config.json");

const app = express();
const port = config.port;
const { redisHost, redisPort } = config.redis;
const SESSION_DURATION = 1000 * 60 * config.sessionDuration;
const WAIT_TIME = 1000 * 60 * config.waitTime;

// Redis client setup
const redisClient = redis.createClient({
  host: redisHost,
  port: redisPort,
});

redisClient.on("connect", () => {
  console.error("Redis connected");
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

app.get("/login", async (req, res) => {
  if (!req.query || !req.query.username) {
    res.status(401);
    res.json({ error: "Please provide username" });
  } else {
    const username = req.query.username;
    const sessionData = createSessionData(username);
    const isSaved = await redisClient.set(
      username,
      JSON.stringify(sessionData)
    );
    res.json({ isSaved, ...sessionData });
  }
});

app.get("/logout", (req, res) => {
  const sessionId = req.headers.sessionid;
  if (!sessionId) {
    res.json({
      error: "Please provide sessionId",
    });
  } else {
    const username = sessionId.split(":")[0];
    const isDeleted = redisClient.del(username);
    res.json({ isDeleted });
  }
});

// redis session middleware
app.use(async (req, res, next) => {
  const sessionIdFromHeader = req.headers.sessionid;
  const username = sessionIdFromHeader.split(":")[0];
  try {
    redisClient.get(username, (err, session) => {
      if (!session) {
        const err = new Error("No session, please login");
        err.status = 401;
        console.log(err);
        next(err);
      } else {
        req.session = JSON.parse(session);
        if (req.session.sessionId != sessionIdFromHeader) {
          err = {};
          if (username) err = expireSession(username);
          next(err);
        }
        const diff = Date.now() - req.session.date;
        if (diff > SESSION_DURATION) {
          // between 60 and 65 minutes
          if (diff < SESSION_DURATION + WAIT_TIME) {
            const currentWaitTime = SESSION_DURATION + WAIT_TIME - diff;
            console.log(currentWaitTime);
            console.log(WAIT_TIME);
            console.log(diff);
            const err = new Error(
              `403 Forbidden. Cannot use resources, please wait ${Math.floor(
                currentWaitTime / (1000 * 60)
              )} minutes and ${Math.floor(
                (currentWaitTime / 1000) % 60
              )} seconds.`
            );
            err.status = 403;
            next(err);
          }
        }
        const ttl = Math.floor(
          (SESSION_DURATION - (Date.now() - req.session.date)) / 1000
        );
        req.session.ttl = ttl >= 0 ? ttl : 0;

        next();
      }
    });
  } catch (error) {
    next(error);
  }
});

// Route protected by session
app.get("/", (req, res) => {
  res.json(req.session);
});

function createSessionData(username) {
  const sessionId = `${username}: ${uuidv4()}`;
  return {
    sessionId,
    date: Date.now(),
  };
}

async function expireSession(username) {
  const err = new Error("session expired");
  err.status = 401;
  redisClient.del(username);
  return err;
}

app.use(function (req, res, next) {
  next({ status: 404 });
});

app.use(function (err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ err: err.message });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
