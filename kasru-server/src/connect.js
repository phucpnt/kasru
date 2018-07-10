const { Router } = require("express");
const session = require("express-session");
const passport = require("passport");
const { OAuth2Strategy } = require("passport-oauth");

const {GH_CLIENT_ID, GH_CLIENT_SECRET, GH_CALLBACK_HOST} = require('../global-var');

const route = Router();

route.use(session({ secret: "kasru-session", resave: false, saveUninitialized: false }));
route.use(passport.initialize());
route.use(passport.session());

passport.use(
  "github",
  new OAuth2Strategy(
    {
      authorizationURL: "https://github.com/login/oauth/authorize",
      tokenURL: "https://github.com/login/oauth/access_token",
      clientID: GH_CLIENT_ID,
      clientSecret: GH_CLIENT_SECRET,
      callbackURL: `${GH_CALLBACK_HOST}/connect/github/token/callback`
    },
    (token, refreshToken, profile, done) => {
      console.info("github token", token, refreshToken, profile);
      done(false, { provider: "github", id: "anomynous", token, refreshToken });
    }
  )
);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

route.get(
  "/github",
  (req, res, next) => {
    req.session.callback = req.query.callback;
    next();
  },
  passport.authenticate("github")
);

route.get(
  "/github/token",
  passport.authenticate("github", { scope: ["gist", "read:user"] })
);
route.get(
  "/github/token/callback",
  passport.authenticate("github", {
    failureRedirect: "/connect/github/token/fail"
  }),
  (req, res) => {
    res.send(`
    <body>
      Loading...
      <script>
      window.setTimeout(function() {
        window.location = '${req.session.callback}?token=${req.user.token}';
      }, 500);
      </script>
    </body>
    `)
    res.end();
  }
);

route.get("/github/token/fail", (req, res) => {
  res.send("Fail authentication with github");
  res.end();
});

module.exports = route;
