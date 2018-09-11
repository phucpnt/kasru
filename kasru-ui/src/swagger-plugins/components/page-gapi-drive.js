import React, { Component } from "react";
import { Button, Container } from "semantic-ui-react";
import {withRouter} from 'react-router-dom';

import { doAfterLoggedIn, pickSpec } from "../utils/gdrive";

class PageGDrive extends Component {
  componentWillUnmount() {}

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
