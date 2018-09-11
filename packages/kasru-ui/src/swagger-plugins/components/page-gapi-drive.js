import React, { Component } from "react";
import { Button, Container } from "semantic-ui-react";
import debounce from "lodash/debounce";
import {withRouter} from 'react-router-dom';

import { doAfterLoggedIn, pickSpec } from "../utils/gdrive";

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

const globalCreatePicker = debounce((oauthToken, callback) => {
  const gapi = window.gapi;
  gapi.load("picker", {
    callback: () => {
      const google = window.google;
      const view = new google.picker.View(google.picker.ViewId.DOCS);
      view.setMimeTypes(gdocMimeType);
      view.setQuery("title:.yaml");
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

  componentWillUnmount() {}

  createPicker(oauthToken, callback) {
    globalCreatePicker(oauthToken, callback);
  }

  pickerCallback = (...args) => {
    console.info("picker", args);
  };

  updateSigninStatus = isSignedIn => {
    if (isSignedIn) {
      const gapi = window.gapi;
      const userInstance = gapi.auth2.getAuthInstance().currentUser.get();
      const authResult = userInstance.getAuthResponse(true);
    }
  };

  loginToGDrive = () => {
    const gapi = window.gapi;
    gapi.auth2.getAuthInstance().signIn();
  };

  openPicker = () => {
    const {history} = this.props;
    console.info('aaa');
    doAfterLoggedIn(authInstance => {
      const authResult = authInstance.currentUser
        .get()
        .getAuthResponse(true);
      pickSpec(authResult.access_token, pickResult => {
        console.info("pick", pickResult);
        if (pickResult.action === 'picked') {
          history.push(`/gdrive:${pickResult.docs[0].id}/${this.props.viewMode}`);
        }
      });
    });
  };

  render() {
    return (
      <Container textAlign="center">
        <Button onClick={this.openPicker}>Open from GDrive</Button>
      </Container>
    );
  }
}

PageGDrive.defaultProps = {
  viewMode: 'spec_read',
};

export default withRouter(PageGDrive);
