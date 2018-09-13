const { google } = require("googleapis");
const { Router } = require("express");

const {
  PORT,
  GDRIVE_API_KEY,
  GDRIVE_CLIENT_ID,
  GDRIVE_CLIENT_SECRET,
  GDRIVE_REFRESH_TOKEN,
} = require("../global-var");

const router = Router();
const scopes = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata"
];

function getOAuthClient(req){
  return new google.auth.OAuth2(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET,
    `${req.protocol}://${req.hostname}:${PORT}${req.baseUrl}/oauthcallback`
  );
}

router.get("/", (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    GDRIVE_CLIENT_ID,
    GDRIVE_CLIENT_SECRET,
    `${req.protocol}://${req.hostname}:${PORT}${req.baseUrl}/oauthcallback`
  );

  const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
   
    // If you only need one scope you can pass it as a string
    scope: scopes
  });

  res.redirect(url);
});

router.get('/oauthcallback', async (req, res) => {
  const oauth2Client = getOAuthClient(req);
  const {code} = req.query;
  const {tokens} = await oauth2Client.getToken(code);
  console.info('code', code, tokens);
  res.end();
})

router.get('/get-file/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const oauth2Client = getOAuthClient(req);
  oauth2Client.setCredentials({
    refresh_token: GDRIVE_REFRESH_TOKEN,
  });

  const gdrive = google.drive({
    version: 'v3',
    auth: oauth2Client,
  });

  gdrive.permissions.list({
    fileId: fileId,
    supportsTeamDrives: true,
    pageSize: 100,
  }).then(response => {
    const canViewWithoutLogin = response.data.permissions.some(pem => ['domain' || 'anyone'].indexOf(pem.type) > -1 );
    if(!canViewWithoutLogin){
      res.status(403);
      throw new Error("Permission denied")
    }
  }).then(() => {
    gdrive.files.get({
      fileId: fileId,
      supportsTeamDrives: true,
      alt: 'media',
    }).then(response => {
      res.header({'content-type': response.headers['content-type']});
      res.status(response.status).send(response.data);
      res.end();
    })
  }).catch(err => {
    res.send(err.toString());
    res.end();
  });

}) 

module.exports = router;
