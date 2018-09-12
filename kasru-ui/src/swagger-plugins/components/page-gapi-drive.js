import React, { Component } from "react";
import { Button, Container, Step } from "semantic-ui-react";
import { withRouter } from "react-router-dom";
import debounce from "lodash/debounce";

import { doAfterLoggedIn, pickSpec, loginGDrive } from "../utils/gdrive";
import imageStep1 from './resource-page-gapi/step1.png';
import imageStep2 from './resource-page-gapi/step2.png';
import imageStep3 from './resource-page-gapi/step3.png';
import imageStep4 from './resource-page-gapi/step4.png';

const debounceLoginGdrive = debounce(loginGDrive, 2000);
class PageGDrive extends Component {
  constructor(props) {
    super(props);
    this.state = { isSignedIn: false, displayLoginButton: false };
  }

  componentDidMount() {
    debounceLoginGdrive(authInstance => {
      console.info("called", authInstance);
      const isSignedIn = authInstance.isSignedIn.get();
      if (!isSignedIn) {
        this.setState({ isSignedIn: false, displayLoginButton: true });
      } else {
        this.setState({ isSignedIn: true, displayLoginButton: false });
      }
    });
  }

  updateSigninStatus = isSignedIn => {
    if (isSignedIn) {
      const gapi = window.gapi;
      const userInstance = gapi.auth2.getAuthInstance().currentUser.get();
      const authResult = userInstance.getAuthResponse(true);
    }
  };

  loginToGDrive = () => {
    const gapi = window.gapi;
    const authInstance = gapi.auth2.getAuthInstance();
    authInstance.signIn();
    authInstance.isSignedIn.listen(() => {
      const isSignedIn = authInstance.isSignedIn.get();
      if (!isSignedIn) {
        this.setState({ isSignedIn: false, displayLoginButton: true });
      } else {
        this.setState({ isSignedIn: true, displayLoginButton: false });
      }
    });
  };

  openPicker = () => {
    const { history } = this.props;
    doAfterLoggedIn(authInstance => {
      const authResult = authInstance.currentUser.get().getAuthResponse(true);
      pickSpec(authResult.access_token, pickResult => {
        console.info("pick", pickResult);
        if (pickResult.action === "picked") {
          history.push(
            `/gdrive:${pickResult.docs[0].id}/${this.props.viewMode}`
          );
        }
      });
    });
  };

  renderRequestLogin() {
    return (
      <div>
        <Button onClick={this.loginToGDrive} size="huge" color="blue">Login to Google Drive</Button>
        <h3>Follow the steps below</h3>
        {this.renderGuideToLogin()}
        <h4>After login, you can choose spec file to open</h4>
      </div>
    );
  }

  renderGuideToLogin() {
    const width= '250px';
    return (
      <Step.Group>
        <Step link>
          <Step.Content>
            <Step.Title>Step 1</Step.Title>
            <Step.Description><img style={{width}} src={imageStep1} /></Step.Description>
          </Step.Content>
        </Step>
        <Step link>
          <Step.Content>
            <Step.Title>Step 2</Step.Title>
            <Step.Description><img style={{width}} src={imageStep2} /></Step.Description>
          </Step.Content>
        </Step>
        <Step link>
          <Step.Content>
            <Step.Title>Step 3</Step.Title>
            <Step.Description><img style={{width}} src={imageStep3} /></Step.Description>
          </Step.Content>
        </Step>
        <Step link>
          <Step.Content>
            <Step.Title>Step 4</Step.Title>
            <Step.Description><img style={{width}} src={imageStep4} /></Step.Description>
          </Step.Content>
        </Step>
      </Step.Group>
    );
  }

  render() {
    const { isSignedIn, displayLoginButton } = this.state;
    return (
      <Container textAlign="center" style={{paddingTop: '2em'}}>
        {!displayLoginButton &&
          !isSignedIn && <div>Querying Google Drive. Please wait...</div>}
        {displayLoginButton && !isSignedIn && this.renderRequestLogin()}
        {isSignedIn && (
          <Button onClick={this.openPicker}>Open spec from Google Drive</Button>
        )}
      </Container>
    );
  }
}

PageGDrive.defaultProps = {
  viewMode: "spec_read"
};

export default withRouter(PageGDrive);
