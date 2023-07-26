const express = require("express");
const redis = require("redis");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = 3000;

// Redis client setup
const redisClient = redis.createClient({
  host: "localhost",
  port: 6379,
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
    const sessionId = `${username}: ${uuidv4()}`;
    const sessionData = {
      date: Date.now(),
    };
    const isSaved = await redisClient.set(
      username,
      JSON.stringify(sessionData)
    );
    res.json({ isSaved, sessionId, ...sessionData });
  }
});
async function expireSession() {
  const err = new Error("session expired");
  err.statusCode = 401;
  redisClient.del(username);
  return err;
}
app.use(async (req, res, next) => {
  const sessionId = req.headers.sessionid;
  const username = sessionId.split(":")[0];
  redisClient.get(username, (err, session) => {
    if (!session) {
      next(err);
    } else {
      req.session = JSON.parse(session);
      if (req.session.sessionId != sessionId) {
        const err = expireSession();
        next(err);
      }
      const oneMinuteInMs = 60000;
      const diff = Date.now() - req.session.date;
      if (diff > 1000 * 60 * 60) {
        // between 60 and 65 minutes
        if (diff < 1000 * 60 * 65) {
          const waitTime = 1000 * 60 * 5 - diff;
          const err = new Error(
            `403 Forbidden. Cannot use resources, please wait ${
              waitTime / oneMinuteInMs
            } minutes and ${waitTime % oneMinuteInMs} seconds.`
          );
          err.statusCode = 403;
          next(err);
        } else {
          const err = expireSession();
          next(err);
        }
      }
      next();
    }
  });
});

// Sample route to test sessions
app.get("/", (req, res) => {
  res.json(req.session);
  // console.log(req.headers);
  // console.log(req.session);
  // // if (req.session.cookie._expires) {
  // //   console.log("expires exist");
  // // } else {
  // //   req.session.cookie._expires = new Date(Date.now() + 1000 * 3);
  // // }
  // if (req.session.views) {
  //   req.session.views++;
  // } else {
  //   req.session.views = 1;
  // }
  // res.json({
  //   message: `Hello! You've visited this page ${req.session.views} times.`,
  //   sessionID: req.sessionID,
  //   session: req.session,
  // });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
