import React, { Component } from "react";
import PropTypes from "prop-types";

import {
  HashRouter as BrowserRouter,
  Route,
  Switch,
  withRouter
} from "react-router-dom";

import {
  Button,
  Icon,
  Popup,
  Header,
  Loader,
  Segment,
  List,
  Label,
  Portal
} from "semantic-ui-react";
import Clipboard from "react-clipboard.js";
import Swagger from "swagger-client";

import SpecSelect from "./components/spec-select";

const MODE_SPEC = "spec";
const MODE_SPEC_READ_ONLY = "spec_read"
const MODE_STUB = "stub";
const MODE_TEST = "test";

class UnitSpecNavigation extends Component {
  switchMode(mode) {
    const { history, specName, uiActions } = this.props;
    uiActions.switchEditorView(mode);
    history.push(`/${specName}/${mode}`);
  }

  onSpecSelect = specName => {
    const mode = this.props.uiSelectors.currentView();
    this.props.history.push(`/${specName}/${mode}`);
  };

  render() {
    const { specName, specActions, mode } = this.props;
    return (
      <List horizontal relaxed style={{ marginBottom: 0 }}>
        <List.Item>
          <SpecSelect
            specActions={specActions}
            specName={specName}
            onSpecSelect={this.onSpecSelect}
          />
        </List.Item>
        <List.Item>
          <Button.Group style={{ marginRight: "0.1em" }}>
            <Button
              toggle
              active={mode === MODE_SPEC}
              onClick={this.switchMode.bind(this, MODE_SPEC)}
            >
              SPEC
            </Button>
            <Clipboard
              option-text={this.copySpec}
              className="ui icon toggle button"
              button-title="Copy to clipboard"
            >
              <Icon name="clipboard" />
            </Clipboard>
          </Button.Group>{" "}
          <Button.Group style={{ marginLeft: "0.1em", marginRight: "0.1em" }}>
            <Button
              toggle
              active={mode === MODE_STUB}
              onClick={this.switchMode.bind(this, MODE_STUB)}
            >
              STUB
            </Button>
            <Clipboard
              option-text={this.copyStub}
              className="ui icon toggle button"
              button-title="Copy to clipboard"
            >
              <Icon name="clipboard" />
            </Clipboard>
          </Button.Group>{" "}
          <Button.Group style={{ marginLeft: "0.1em" }}>
            <Button
              toggle
              active={mode === MODE_TEST}
              onClick={this.switchMode.bind(this, MODE_TEST)}
            >
              TEST
            </Button>
            <Clipboard
              option-text={this.copyTest}
              className="ui icon toggle button"
              button-title="Copy to clipboard"
            >
              <Icon name="clipboard" />
            </Clipboard>
          </Button.Group>
          <Label title="Session id">
            <Icon name="id badge" />
            {this.props.session}
          </Label>
        </List.Item>
      </List>
    );
  }
}

const RouteUnitSpecNavigation = withRouter(UnitSpecNavigation);

export default class StandaloneLayout extends React.Component {
  static propTypes = {
    specActions: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      showCreateForm: false,
      newSpecName: ""
    };
  }

  componentDidMount() {
    this.props.swmbActions.registerSession();
  }

  switchMode(mode) {
    this.props.uiActions.switchEditorView(mode);
  }

  copyStub = () => {
    const stubs = this.props.stubSelectors
      .stubs()
      .map(stub => stub.remove("originIndex").remove("uniqueId"));
    return JSON.stringify(stubs, null, 2);
  };

  copySpec = () => {
    return this.props.specSelectors.specStr();
  };

  persistFromUpstream = () => {
    console.info('pesist...');
    return this.props.swmbActions.persistFromUpstream(this.props.specSelectors.specName());
  }

  renderUpstreamNotify() {
    const notify = this.props.swmbSelectors.upstreamNotify();
    if (notify) {
      return (
        <Portal
          open={notify.get("display")}
          onClose={() => this.props.swmbActions.notifyUpstreamDismiss()}
        >
          <Segment
            color="orange"
            inverted
            style={{
              right: "20px",
              position: "fixed",
              top: "60px",
              zIndex: 1000
            }}
          >
            <Header>There are updates on upstream.</Header>
            <div className="clearfix">
              <Popup
                trigger={
                  <Button color="grey" floated="right" onClick={this.persistFromUpstream}>
                    Apply Update
                  </Button>
                }
                content="your current modification will be lost. You may consider copy your setup, refresh the page, then click this button. "
              />
            </div>
            <p>Please check the spec source code on repo.</p>
            <p>Click any where outside to close this window.</p>
          </Segment>
        </Portal>
      );
    }
    return null;
  }

  copyTest = () => {
    return "TODO";
  };

  render() {
    console.info(this.props.getComponents());
    const mode = this.props.uiSelectors.currentView();
    const specName = this.props.specSelectors.specName();

    const { getComponent } = this.props;
    const UnitSpecScreen = getComponent("UnitSpecScreen", true);
    const Topbar = getComponent("Topbar", true);


    return (
      <BrowserRouter>
        <div>
          {this.renderUpstreamNotify()}
          <Topbar>
            <RouteUnitSpecNavigation
              specName={specName}
              specActions={this.props.specActions}
              uiActions={this.props.uiActions}
              uiSelectors={this.props.uiSelectors}
              session={this.props.swmbSelectors.session()}
              mode={mode}
            />
          </Topbar>
          <Switch>
            <Route path={`/:specName/:mode`} component={UnitSpecScreen} />
            <Route
              component={() => (
                <Header as="h2" textAlign="center" disabled>
                  Please choose spec
                </Header>
              )}
            />
          </Switch>
        </div>
      </BrowserRouter>
    );
  }
}

export class UnitSpecScreen extends Component {
  componentDidMount() {
    const { specName, mode } = this.props.match.params;
    this.props.uiActions.handleLocationChange({location: this.props.location, match: this.props.match});
    this.props.uiActions.switchEditorView(mode);
    this.props.specActions.fetchRemoteContent(specName);
  }

  componentDidUpdate(prevProps) {
    const { specName: prevSpecName, mode: prevMode } = prevProps.match.params;
    const { specName, mode } = this.props.match.params;

    if (prevSpecName !== specName) {
      this.props.specActions.fetchRemoteContent(specName);
    }
    if (mode !== prevMode) {
      this.props.uiActions.switchEditorView(mode);
    }
  }

  render() {
    const mode = this.props.uiSelectors.currentView();
    const specName = this.props.specSelectors.specName();

    const { getComponent } = this.props;
    const EditorLayout = getComponent("EditorLayout", true);
    const StubEditorLayout = getComponent("StubEditorLayout", true);
    const TestLayout = getComponent("TestLayout", true);
    const SpecLayout = getComponent("SpecLayout", true);

    if (!specName) {
      return (
        <Loader active inline="center" size="large">
          Loading
        </Loader>
      );
    }

    return (
      <Switch>
        <Route path={`/${specName}/${MODE_SPEC}`} component={EditorLayout} />
        <Route path={`/${specName}/${MODE_SPEC_READ_ONLY}`} component={SpecLayout} />
        <Route
          path={`/${specName}/${MODE_STUB}`}
          component={StubEditorLayout}
        />
        <Route path={`/${specName}/${MODE_TEST}`} component={TestLayout} />
      </Switch>
    );
  }
}
