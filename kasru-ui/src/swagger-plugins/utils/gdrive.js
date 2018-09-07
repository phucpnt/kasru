const CLIENT_ID =
  "320957995205-qs9qa5ngvrn6jnabkijo6peb8cibbck5.apps.googleusercontent.com";
const DRIVE_SCOPE = [
  "https://www.googleapis.com/auth/drive.appfolder",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata"
].join(" ");
const gdocMimeType = "application/vnd.google-apps.document";
const API_KEY = "AIzaSyD6FnZ52QWuzVvq38pjEltq_FNkhsXCBvw";
const PROJ_NUMBER = "320957995205";

export function loginGDrive() {
  const gapi = window.gapi;
  return new Promise(resolve => {
    gapi.load("client:auth2", () => {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
          ],
          scope: DRIVE_SCOPE
        })
        .then(() => {
          resolve(gapi.auth2.getAuthInstance());
        });
    });
  });
}
