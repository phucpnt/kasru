import React from "react";
import { Button, Segment, Modal, Form } from "semantic-ui-react";
import { API_HOST } from "../global-vars";

export default function wrapInfo(SwaggerInfo, system) {
  return class InfoLoginForm extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        username: null,
        password: null,
        afterLoginPage: null,
        loading: false
      };
    }

    handleChange = (e, { name, value }) => this.setState({ [name]: value });

    handleSubmit = () => {
      const { username, password } = this.state;

      const specObj = system.specSelectors.specJson();
      const specName = system.specSelectors.specName();
      const redirectUrl = specObj.getIn(["x-login", "redirectUrl"]);

      this.setState({ loading: true });

      fetch(`${API_HOST}/swagger-spec/${specName}/user-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password,
          redirectUrl
        })
      })
        .then(response => response.json())
        .then(result => {
          if (result.errors === undefined) {
            this.setState({
              afterLoginPage: `${redirectUrl}?accessToken=${
                result.access_token
              }&userId=${result.user_id}&userName=${encodeURIComponent(
                result.user_name
              )}`,
              loading: false
            });
            window.setTimeout(() => {
              this.loginLink.click();
            }, 700);
          }
        });
    };

    render() {
      const props = this.props;
      const enableLogin = system.specSelectors.specJson().get("x-login");
      const { afterLoginPage, loading } = this.state;
      return (
        <div>
          <SwaggerInfo {...props} />
          {enableLogin && (
            <Segment basic>
              <Modal
                trigger={<Button>Demo form for user login</Button>}
                style={{
                  marginTop: 0,
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)"
                }}
                size={"small"}
              >
                <Modal.Header>Demo login form</Modal.Header>
                <Modal.Content>
                  <Form loading={loading} onSubmit={this.handleSubmit}>
                    <Form.Input
                      name="username"
                      label="Username"
                      onChange={this.handleChange}
                    />
                    <Form.Input
                      type="password"
                      name="password"
                      label="Password"
                      onChange={this.handleChange}
                    />
                    <Form.Button type="submit">Submit</Form.Button>
                  </Form>
                  {afterLoginPage && (
                    <Segment>
                      <a
                        ref={dom => (this.loginLink = dom)}
                        href={afterLoginPage}
                        target="_blank"
                      >
                        {afterLoginPage}
                      </a>
                    </Segment>
                  )}
                </Modal.Content>
              </Modal>
            </Segment>
          )}
        </div>
      );
    }
  };
}
