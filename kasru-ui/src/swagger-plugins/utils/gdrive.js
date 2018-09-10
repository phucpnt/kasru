const CLIENT_ID =
  "320957995205-qs9qa5ngvrn6jnabkijo6peb8cibbck5.apps.googleusercontent.com";
const DRIVE_SCOPE = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.appfolder",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata"
].join(" ");
const gdocMimeType = "text/plain";
const API_KEY = "AIzaSyD6FnZ52QWuzVvq38pjEltq_FNkhsXCBvw";
const PROJ_NUMBER = "320957995205";

export function loginGDrive() {
  const gapi = window.gapi;
  return new Promise(resolve => {
    gapi.load("client:auth2", () => {
      if (gapi.auth2.getAuthInstance() && gapi.auth2.getAuthInstance().isSignedIn.get()) {
        resolve(gapi.auth2.getAuthInstance());
      } else {
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
      }
    });
  });
}

export function pickSpec(oauthToken, callback) {
  const gapi = window.gapi;
  gapi.load("picker", {
    callback: () => {
      const google = window.google;
      const view = new google.picker.View(google.picker.ViewId.DOCS);
      view.setMimeTypes(gdocMimeType);
      view.setQuery("title:.yaml");
      const picker = new google.picker.PickerBuilder()
        .setAppId(PROJ_NUMBER)
        .setOAuthToken(oauthToken)
        .addView(view)
        .addView(new google.picker.DocsUploadView())
        .setDeveloperKey(API_KEY)
        .setCallback(callback)
        .build();
      picker.setVisible(true);
    }
  });
}

export function pickFile(oauthToken, callback) {
  const gapi = window.gapi;
  gapi.load("picker", {
    callback: () => {
      const google = window.google;
      const viewFiles = new google.picker.View(google.picker.ViewId.DOCS);
      const viewImages = new google.picker.View(
        google.picker.ViewId.DOCS_IMAGES
      );
      const picker = new google.picker.PickerBuilder()
        .setAppId(PROJ_NUMBER)
        .setOAuthToken(oauthToken)
        .addView(viewFiles)
        .addView(viewImages)
        .addView(new google.picker.DocsUploadView())
        .setDeveloperKey(API_KEY)
        .setCallback(callback)
        .build();
      picker.setVisible(true);
    }
  });
}

export function doAfterLoggedIn(callback) {
  loginGDrive().then(authInstance => {
    const isSignedIn = authInstance.isSignedIn.get();
    if (!isSignedIn) {
      authInstance.isSignedIn.listen(() => {
        callback(authInstance);
      });
      authInstance.signIn();
    } else {
      callback(authInstance);
    }
  });
}
