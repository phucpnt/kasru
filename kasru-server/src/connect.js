const { Router } = require("express");
const session = require("express-session");
const passport = require("passport");
const { OAuth2Strategy } = require("passport-oauth");
const fetch = require('unfetch');
const qs = require('querystring');

const {
  GH_CLIENT_ID,
  GH_CLIENT_SECRET,
  GH_CALLBACK_HOST,
  BB_CLIENT_ID,
  BB_CLIENT_SECRET,
  BB_CALLBACK_HOST
} = require("../global-var");

const route = Router();

route.use(
  session({ secret: "kasru-session", resave: false, saveUninitialized: false })
);
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

passport.use(
  "bitbucket",
  new OAuth2Strategy(
    {
      authorizationURL: "https://bitbucket.org/site/oauth2/authorize",
      tokenURL: "https://bitbucket.org/site/oauth2/access_token",
      clientID: BB_CLIENT_ID,
      clientSecret: BB_CLIENT_SECRET,
      callbackURL: `${BB_CALLBACK_HOST}/connect/bitbucket/token/callback`
    },
    (token, refreshToken, profile, done) => {
      console.info("bitbucket token", token, refreshToken, profile);
      done(false, {
        provider: "bitbucket",
        id: "anomynous",
        token,
        refreshToken
      });
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
        window.location = '${req.session.callback}?token=${req.user.token}&refreshToken=${req.user.refreshToken}';
      }, 500);
      </script>
    </body>
    `);
    res.end();
  }
);

route.get("/github/token/fail", (req, res) => {
  res.send("Fail authentication with github");
  res.end();
});

route.get(
  "/bitbucket",
  (req, res, next) => {
    req.session.callback = req.query.callback;
    next();
  },
  passport.authenticate("bitbucket")
);

route.get('/bitbucket/refresh-token', (req, res) => {
  const refreshToken = req.query.refreshToken;
  fetch('https://bitbucket.org/site/oauth2/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
  },
    body: qs.stringify({
      client_id: BB_CLIENT_ID,
      client_secret: BB_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  }).then(response => response.json()).then(result => {
    console.info(result);
    res.json(result);
    res.end();
  })
})

route.get("/bitbucket/token", passport.authenticate("bitbucket"));
route.get(
  "/bitbucket/token/callback",
  passport.authenticate("bitbucket", {
    failureRedirect: "/connect/bitbucket/token/fail"
  }),
  (req, res) => {
    res.send(`
    <body>
      Loading...
      <script>
      window.setTimeout(function() {
        //window.location = '${req.session.callback}?token=${req.user.token}&refreshToken=${req.user.refreshToken}';
      }, 500);
      </script>
    </body>
    `);
    res.end();
  }
);

route.get("/bitbucket/token/fail", (req, res) => {
  res.send("Fail authentication with github");
  res.end();
});

module.exports = route;
