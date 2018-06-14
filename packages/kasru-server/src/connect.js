const { Router } = require("express");
const passport = require("passport");
const { OAuthStrategy } = require("passport-oauth");
const route = Router();

route.get("/github", (req, res) => {
  const accessToken = req.query.token;
  console.info(res.location());
  // res.redirect(res.location() + "/token");
});

passport.use(
  "github",
  new OAuthStrategy({
    requestTokenURL: "https://github.com/login/oauth/request_token",
    accessTokenURL: "https://github.com/login/oauth/access_token",
    userAuthorizationURL: "https://github.com/login/oauth/authorize",
    consumerKey: "123-456-789",
    consumerSecret: "shhh-its-a-secret",
    callbackURL: "http://localhost:3003/connect/github/token/callback"
  }, (token, tokenSecret, profile, done) => {
    console.info('github token', token, tokenSecret);
    done(profile);
  })
);

route.get("/github/token", passport.authenticate("github"));
route.get(
  "/github/token/callback",
  passport.authenticate("github", {
    successRedirect: "/",
    failureRedirect: "/github/token/fail"
  })
);

route.get("/github/token/fail", (req, res) => {
  res.send("Fail authentication with github");
  res.end();
});


module.exports = route;