import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Button, Dropdown, Menu, Icon, Form } from "semantic-ui-react";
import { API_HOST } from "../global-vars";

class SpecSelect extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDisplaySpecList: false,
      specName: "Select spec"
    };
  }

  componentDidMount() {
    this.props.specActions.fetchSpecList();
  }

  toggleSpecList(isDisplay = null) {
    const isDisplaySpecList =
      isDisplay === null ? !this.state.isDisplaySpecList : isDisplay;
    this.setState({ isDisplaySpecList });
  }

  onSpecSelect(spec) {
    this.setState({ specName: spec.specName });
    this.props.onSpecSelect(spec.specName);
  }

  handleChange = (e, { name, value }) => this.setState({ [name]: value });

  onQueryGist = () => {
    this.onSpecSelect({ specName: `gist:${this.state.gistId}` });
  };

  render() {
    const { specList } = this.props;
    const connectGithub = this.props.swmbSelectors.connectSocial("github");

    return (
      <Menu vertical fluid fixed="left">
        <Menu.Item>
          Server
          <Menu.Menu>
            {specList.size === 0 && "No spec on server."}
            {specList.map(item => {
              return (
                <Menu.Item
                  key={item.specName}
                  onClick={this.onSpecSelect.bind(this, item)}
                >
                  {item.specName}
                </Menu.Item>
              );
            })}
          </Menu.Menu>
        </Menu.Item>
        <Menu.Item>
          <Icon name="github" /> Gist
          <Menu.Menu>
            <Menu.Item>
              {!connectGithub.get('connected') && (
                <Button
                  fluid
                  color="blue"
                  onClick={() => {
                    const url = `${API_HOST}/connect/github?callback=${encodeURIComponent(
                      window.location.origin + '/#/connect/github'
                    )}`;
                    window.location = url;
                  }}
                >
                  <Icon name="github" /> Connect to Github/Gist
                </Button>
              )}
              {connectGithub.get('connected') && (
                <Form>
                  <Form.Group>
                    <Form.Input
                      name="gistId"
                      placeholder="enter your gist id"
                      onChange={this.handleChange}
                    />
                    <Form.Button icon onClick={this.onQueryGist}>
                      <Icon name="play" />
                    </Form.Button>
                  </Form.Group>
                </Form>
              )}
            </Menu.Item>
          </Menu.Menu>
        </Menu.Item>
      </Menu>
    );
  }
}

SpecSelect.propTypes = {
  children: PropTypes.func,
  specActions: PropTypes.object,
  specList: PropTypes.array
};

SpecSelect.defaultProps = {
  specList: []
};

export default connect(
  (state, props) => {
    return {
      specList: state.getIn(["spec", "specList"])
    };
  },
  (dispatch, props) => {
    return {};
  }
)(SpecSelect);
