import React, { Component } from "react";
import { Button } from "semantic-ui-react";
import debounce from "lodash/debounce";

const CLIENT_ID =
  "320957995205-qs9qa5ngvrn6jnabkijo6peb8cibbck5.apps.googleusercontent.com";
const DRIVE_SCOPE = [
  "https://www.googleapis.com/auth/drive.appfolder",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata"
].join(" ");
const API_KEY = "AIzaSyD6FnZ52QWuzVvq38pjEltq_FNkhsXCBvw";
const PROJ_NUMBER = "320957995205";

const createPicker = debounce((oauthToken, callback) => {
  const gapi = window.gapi;
  gapi.load("picker", {
    callback: () => {
      const google = window.google;
      const view = new google.picker.View(google.picker.ViewId.DOCS);
      view.setMimeTypes("application/json");
      view.setQuery("title:kasru.json")
      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
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
}, 2000);

class PageGDrive extends Component {
  componentDidMount() {
    const gapi = window.gapi;
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
          gapi.auth2
            .getAuthInstance()
            .isSignedIn.listen(this.updateSigninStatus);
          this.updateSigninStatus(
            gapi.auth2.getAuthInstance().isSignedIn.get()
          );
        });
    });
  }

  componentWillUnmount() {
  }


  createPicker(oauthToken) {
    createPicker(oauthToken);
  }

  pickerCallback = () => {};

  updateSigninStatus = isSignedIn => {
    if (isSignedIn) {
      const gapi = window.gapi;
      console.info(
        "user instance",
        gapi.auth2.getAuthInstance().currentUser.get()
      );
      const userInstance = gapi.auth2.getAuthInstance().currentUser.get();
      const authResult = userInstance.getAuthResponse(true);
      this.createPicker(authResult.access_token, this.pickerCallback);
    }
  };

  loginToGDrive = () => {
    const gapi = window.gapi;
    gapi.auth2.getAuthInstance().signIn();
  };

  render() {
    return (
      <div>
        <Button onClick={this.loginToGDrive}>Connect to Google Drive</Button>
      </div>
    );
  }
}

export default PageGDrive;
