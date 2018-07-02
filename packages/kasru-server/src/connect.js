const { Router } = require("express");
const passport = require("passport");
const { OAuth2Strategy } = require("passport-oauth");
const route = Router();

route.use(passport.initialize());
route.use(passport.session());

route.get("/github", (req, res) => {
  const accessToken = req.query.token;
  console.info(accessToken);
  res.json({hello: 'world'});
  res.end();
  // res.redirect(res.location() + "/token");
});

passport.use(
  "github",
  new OAuth2Strategy({
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    clientID: '1641b6eb2cfb6be8d3ef',
    clientSecret: 'c3565cf4a6da7ce89fd8a84864fdce04fd12f6f5',
    callbackURL: 'http://localhost:3003/connect/github/token/callback',
  }, (token, refreshToken, profile, done) => {
    console.info('github token', token, refreshToken, profile);
    done(false, profile);
  })
);

route.get("/github/token", passport.authenticate("github", {scope: ['gist', 'read:user']}));
route.get(
  "/github/token/callback",
  passport.authenticate("github", {
    session: false,
    successRedirect: "/connect/github",
    failureRedirect: "/connect/github/token/fail"
  })
);

route.get("/github/token/fail", (req, res) => {
  res.send("Fail authentication with github");
  res.end();
});


module.exports = route;