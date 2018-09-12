import {CLIENT_ID, API_KEY, PROJ_NUMBER} from '../global-vars';
const DRIVE_SCOPE = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.appfolder",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata"
].join(" ");
const gdocMimeType = "text/plain";

export function loginGDrive(callback) {
  const gapi = window.gapi;
  return new Promise(resolve => {
    gapi.load("client:auth2", () => {
      if (gapi.auth2.getAuthInstance() && gapi.auth2.getAuthInstance().isSignedIn.get()) {
        resolve(gapi.auth2.getAuthInstance());
        callback && callback(gapi.auth2.getAuthInstance());
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
            callback && callback(gapi.auth2.getAuthInstance());
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
      const teamView = new google.picker.DocsView(google.picker.ViewId.DOCS);
      teamView.setEnableTeamDrives(true);
      teamView.setMimeTypes(gdocMimeType);
      teamView.setQuery("title:.yaml");

      const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
      view.setMimeTypes(gdocMimeType);
      view.setQuery("title:.yaml");
      const picker = new google.picker.PickerBuilder()
        .setAppId(PROJ_NUMBER)
        .setOAuthToken(oauthToken)
        .addView(view)
        .addView(teamView)
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
      const viewFiles = new google.picker.DocsView(google.picker.ViewId.DOCS);
      viewFiles.setSelectFolderEnabled(true);
      viewFiles.setIncludeFolders(true);

      const teamViewFiles = new google.picker.DocsView(google.picker.ViewId.DOCS);
      teamViewFiles.setEnableTeamDrives(true);
      teamViewFiles.setSelectFolderEnabled(true);
      teamViewFiles.setIncludeFolders(true);

      const viewImages = new google.picker.DocsView(
        google.picker.ViewId.DOCS_IMAGES
      );
      viewImages.setEnableTeamDrives(true);
      viewImages.setSelectFolderEnabled(true);
      viewImages.setIncludeFolders(true);

      const teamViewImages = new google.picker.DocsView(
        google.picker.ViewId.DOCS_IMAGES
      );
      teamViewImages.setEnableTeamDrives(true);
      teamViewImages.setSelectFolderEnabled(true);
      teamViewImages.setIncludeFolders(true);

      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.SUPPORT_TEAM_DRIVES)
        .setAppId(PROJ_NUMBER)
        .setOAuthToken(oauthToken)
        .addView(viewFiles)
        .addView(viewImages)
        .addView(teamViewFiles)
        .addView(teamViewImages)
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

export function getImageLink(fileId){
  return `https://drive.google.com/uc?id=${fileId}&__type=.png`;
}
