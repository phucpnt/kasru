import React, { Component } from "react";
import { Button } from "semantic-ui-react";
import debounce from "lodash/debounce";
import yaml from "js-yaml";

const CLIENT_ID =
  "320957995205-qs9qa5ngvrn6jnabkijo6peb8cibbck5.apps.googleusercontent.com";
const DRIVE_SCOPE = [
  "https://www.googleapis.com/auth/drive.appfolder",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata"
].join(" ");
const gdocMimeType = 'application/vnd.google-apps.document';
const API_KEY = "AIzaSyD6FnZ52QWuzVvq38pjEltq_FNkhsXCBvw";
const PROJ_NUMBER = "320957995205";

const globalCreatePicker = debounce((oauthToken, callback) => {
  const gapi = window.gapi;
  console.info('picker callback', callback);
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
    console.info('picker', args);
  };

  updateSigninStatus = isSignedIn => {
    if (isSignedIn) {
      const gapi = window.gapi;
      // console.info(
      //   "user instance",
      //   gapi.auth2.getAuthInstance().currentUser.get()
      // );
      const userInstance = gapi.auth2.getAuthInstance().currentUser.get();
      const authResult = userInstance.getAuthResponse(true);
      // this.createPicker(authResult.access_token, this.pickerCallback);
    }
  };

  loginToGDrive = () => {
    const gapi = window.gapi;
    gapi.auth2.getAuthInstance().signIn();
  };

  createYamlContent = (spec, stub, test) => {
    const str = yaml.dump({
      spec: spec,
      stub: [],
      test: []
    });
    return str;
  };

  testCreateDoc = () => {
    const gapi = window.gapi;
    const form = new FormData();
    form.append(
      "meta",
      new File(
        [
          JSON.stringify({
            name: "test-spec.yaml",
            mimeType: "application/vnd.google-apps.document",
          })
        ],
        "meta.json",
        {
          type: "application/json"
        }
      )
    );
    form.append(
      "media",
      new File(
        [ this.createYamlContent() ],
        "test-spec.yaml",
        {
          type: "text/plain"
        }
      )
    );

    const userInstance = gapi.auth2.getAuthInstance().currentUser.get();
    const authResult = userInstance.getAuthResponse(true);

    fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          authorization: "Bearer " + authResult.access_token
        },
        body: form
      }
    )
      .then(res => res.json())
      .then(res => console.info(res));
  };

  readDocAsYaml = () => {
    const gapi = window.gapi;
    const userInstance = gapi.auth2.getAuthInstance().currentUser.get();
    const authResult = userInstance.getAuthResponse(true);
    const mimeType = encodeURIComponent('text/plain')

    const fileId = "1lBdHtmATavo8HejKgCaonWugcUa92dCqqhuZIIcy7Bc";
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${mimeType}`, {
        method: 'GET',
        headers: {
            authorization: 'Bearer ' + authResult.access_token,
        },
    }).then(res => res.text()).then(yamlStr => {
      console.info(yaml.load(yamlStr));
    });
  }

  render() {
    return (
      <div>
        <Button onClick={this.loginToGDrive}>Connect to Google Drive</Button>
        <Button onClick={this.testCreateYamlContent}>Test Yaml str</Button>
        <Button onClick={this.testCreateDoc}>Test creat doc</Button>
        <Button onClick={this.readDocAsYaml}>Read doc as yaml</Button>
      </div>
    );
  }
}

export default PageGDrive;
