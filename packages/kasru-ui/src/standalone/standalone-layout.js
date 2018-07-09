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
  Portal,
  Radio,
  Transition,
  Sidebar,
  Menu
} from "semantic-ui-react";
import Clipboard from "react-clipboard.js";
import "brace/keybinding/vim";

import SpecSelect from "./components/spec-select-next";

const MODE_SPEC = "spec";
const MODE_SPEC_READ_ONLY = "spec_read";
const MODE_STUB = "stub";
const MODE_TEST = "test";

class UnitSpecNavigation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shakingStatus: true
    };
  }
  switchMode(mode) {
    const { history, specName, uiActions } = this.props;
    uiActions.switchEditorView(mode);
    history.push(`/${specName}/${mode}`);
  }

  onSpecSelect = specName => {
    const mode = this.props.uiSelectors.currentView();
    this.props.history.push(`/${specName}/${mode}`);
  };

  toggleVimMode = status => {
    this.props.uiActions.toggleVimMode(status);
  };

  keepShaking = () => {
    window.setTimeout(() => {
      this.setState({ shakingStatus: !this.state.shakingStatus });
    }, 700);
  };
  persistFromUpstream = () => {
    console.info("pesist...");
    return this.props.swmbActions.persistFromUpstream(
      this.props.specSelectors.specName()
    );
  };

  render() {
    const { specName, specActions, mode } = this.props;
    const notify = this.props.swmbSelectors.upstreamNotify();

    return (
      <List horizontal relaxed style={{ marginBottom: 0 }}>
        <List.Item>
          <Button color="green" onClick={this.props.onClickTopTitle}>
            <Icon name="bars" /> {specName}
          </Button>
        </List.Item>
        {notify.get("havingUpdate") && (
          <List.Item>
            <Popup
              trigger={
                <div>
                  <Transition
                    animation="tada"
                    duration={700}
                    visible={this.state.shakingStatus}
                    transitionOnMount={true}
                    onComplete={this.keepShaking}
                  >
                    <Button
                      icon="exclamation circle"
                      color="orange"
                      onClick={this.persistFromUpstream}
                    />
                  </Transition>
                </div>
              }
              content="your current modification will be lost. You may consider copy your setup, refresh the page, then click this button. "
            />
          </List.Item>
        )}
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
          <Radio
            toggle
            fitted
            label="VIM"
            style={{ marginLeft: "0.5em" }}
            onChange={(e, data) => {
              this.toggleVimMode(data.checked);
            }}
          />
        </List.Item>
      </List>
    );
  }
}

const RouteUnitSpecNavigation = withRouter(UnitSpecNavigation);

const SpecSelectWithRouter = withRouter(props => {
  const onSpecSelect = specName => {
    const mode = props.uiSelectors.currentView();
    props.history.push(`/${specName}/${mode}`);
    props.onSpecSelect(specName);
  };

  return <SpecSelect {...props} onSpecSelect={onSpecSelect} />;
});

export default class StandaloneLayout extends React.Component {
  static propTypes = {
    specActions: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      showCreateForm: false,
      newSpecName: "",
      displayLeftSidebar: false
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
    console.info("pesist...");
    return this.props.swmbActions.persistFromUpstream(
      this.props.specSelectors.specName()
    );
  };

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
                  <Button
                    color="grey"
                    floated="right"
                    onClick={this.persistFromUpstream}
                  >
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

  toggleLeftSidebar = () => {
    this.setState({ displayLeftSidebar: !this.state.displayLeftSidebar });
  };
  handleSidebarHide = () => {
    this.setState({ displayLeftSidebar: false });
  };

  onSpecSelect = specName => {
    const mode = this.props.uiSelectors.currentView();
    this.props.history.push(`/${specName}/${mode}`);
  };

  render() {
    const { displayLeftSidebar } = this.state;
    const mode = this.props.uiSelectors.currentView();
    const specName = this.props.specSelectors.specName();

    const { getComponent } = this.props;
    const UnitSpecScreen = getComponent("UnitSpecScreen", true);
    const Topbar = getComponent("Topbar", true);

    return (
      <BrowserRouter>
        <Sidebar.Pushable as="div">
          {this.renderUpstreamNotify()}
          <Sidebar
            as={"div"}
            animation="overlay"
            direction="left"
            icon="labeled"
            onHide={this.handleSidebarHide}
            vertical
            visible={displayLeftSidebar}
            width="wide"
          >
            <SpecSelectWithRouter
              specActions={this.props.specActions}
              uiSelectors={this.props.uiSelectors}
              onSpecSelect={this.handleSidebarHide}
            />
          </Sidebar>
          <Sidebar.Pusher id="app-content">
            <Topbar>
              <RouteUnitSpecNavigation
                onClickTopTitle={this.toggleLeftSidebar}
                specName={specName}
                specActions={this.props.specActions}
                specSelectors={this.props.specSelectors}
                uiActions={this.props.uiActions}
                uiSelectors={this.props.uiSelectors}
                swmbSelectors={this.props.swmbSelectors}
                swmbActions={this.props.swmbActions}
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
          </Sidebar.Pusher>
        </Sidebar.Pushable>
      </BrowserRouter>
    );
  }
}

export class UnitSpecScreen extends Component {
  componentDidMount() {
    const { specName, mode } = this.props.match.params;
    this.props.uiActions.handleLocationChange({
      location: this.props.location,
      match: this.props.match
    });
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
        <Route
          path={`/${specName}/${MODE_SPEC_READ_ONLY}`}
          component={SpecLayout}
        />
        <Route
          path={`/${specName}/${MODE_STUB}`}
          component={StubEditorLayout}
        />
        <Route path={`/${specName}/${MODE_TEST}`} component={TestLayout} />
      </Switch>
    );
  }
}
