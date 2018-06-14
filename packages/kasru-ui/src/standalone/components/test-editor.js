import React, { Component } from "react";
import {
  Card,
  Input,
  Container,
  Dropdown,
  Header,
  Icon,
  Button,
  Form,
  Popup,
  Segment,
  Rail,
  Menu,
  Tab
} from "semantic-ui-react";
import timeDistanceInWords from "date-fns/distance_in_words_to_now";
import {
  SortableContainer,
  SortableElement,
  SortableHandle
} from "react-sortable-hoc";

import { validate } from "../utils/validate";
import JsonEditor from "./json-editor";

const methodOptions = [{ key: "get", text: "GET", value: "get" }];
const testOptions = [
  {
    key: "response_follow_spec",
    text: "Response follow spec schema",
    value: "response_follow_spec"
  }
];

const DragHandle = SortableHandle(() => <Icon name="bars" color="grey" />);
const SortableTestUnit = SortableElement(props => <TestCase {...props} />);

const SortableTestCases = SortableContainer(({ children }) => {
  return <div>{children}</div>;
});

export default class TestEditor extends Component {
  doValidate = request => {
    validate(
      {
        host: "http://localhost:5000/v1",
        urn: "/topic/1",
        method: "GET"
      },
      this.props.specSelectors.specJson().toJS()
    );
  };

  onAddTest = () => {
    this.props.testActions.add({
      urn: "",
      method: "GET"
    });
  };

  onRunTest(uniqueId, testSpec) {
    this.props.testActions.run(uniqueId, testSpec);
  }

  handleChange = (e, { name, value }) => {
    if (name === "host") {
      this.props.testActions.setHost(value);
    }
  };

  onToggleWatch(uniqueId, status) {
    if (status === false) {
      this.props.testActions.unwatch(uniqueId);
    } else {
      this.props.testActions.watch(uniqueId);
    }
  }

  onRemoveTest(uniqueId) {
    this.props.testActions.remove(uniqueId);
  }

  enableNotification = () => {
    Notification.requestPermission(function(permission) {
      // If the user accepts, let's create a notification
      if (permission === "granted") {
        var notification = new Notification(
          "You will see test result like this notification."
        );
      }
    });
  };

  onSortEnd = ({ oldIndex, newIndex }) => {
    this.props.testActions.move({ oldIndex, newIndex });
  };

  render() {
    const tests = this.props.testSelectors.tests();
    return (
      <Container fluid style={{ padding: ".5em" }}>
        <p>
          IN PROGRESS: Test cases can be setup for integration test when
          developing api.
        </p>
        <Input
          fluid
          label="API endpoint"
          placeholder="http://localhost:8080"
          name="host"
          value={this.props.testSelectors.host()}
          onChange={this.handleChange}
        />
        <Segment
          clearing
          basic
          style={{
            paddingLeft: 0,
            paddingRight: 0,
            marginLeft: 0,
            marginRight: 0
          }}
        >
          <div style={{ float: "right" }}>
            <Button basic onClick={this.enableNotification}>
              Notify test result
            </Button>
            <Button toggle>
              <Icon name="eye" /> Watch all
            </Button>
            <Button onClick={() => this.props.testScheduleActions.runAll()}>
              <Icon name="play" /> Run all
            </Button>
          </div>
        </Segment>
        <SortableTestCases useDragHandle onSortEnd={this.onSortEnd}>
          {tests.map((test, index) => {
            const uniqueId = test.get("uniqueId");
            return (
              <SortableTestUnit
                index={index}
                key={uniqueId}
                test={test}
                testId={uniqueId}
                onRunTest={this.onRunTest.bind(this, uniqueId)}
                onToggleWatch={this.onToggleWatch.bind(this, uniqueId)}
                lastRunResult={this.props.testSelectors.getTestResult(uniqueId)}
                isWatched={this.props.testSelectors.isInWatchlist(uniqueId)}
                onRemoveTest={this.onRemoveTest.bind(this, uniqueId)}
              />
            );
          })}
        </SortableTestCases>
        <p>&nbsp;</p>
        <Button
          floated="right"
          size="large"
          color="orange"
          basic
          onClick={this.onAddTest}
        >
          Add test
        </Button>
      </Container>
    );
  }
}

class TestCase extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false,
      ...props.test.toJS()
    };
  }

  onExpanded(expanded) {
    if (expanded === undefined) {
      this.setState({ expanded: !this.state.expanded });
    } else {
      this.setState({ expanded: expanded });
    }
  }

  handleChange = (e, { name, value }) => {
    this.setState({ [name]: value });
  };

  onRunTest = () => {
    this.props.onRunTest({
      urn: this.state.urn,
      method: this.state.method
    });
  };

  onToggleWatch = () => {
    const { isWatched } = this.props;
    this.props.onToggleWatch(!isWatched);
  };

  onRemoveTest = () => {
    this.props.onRemoveTest();
  };

  toggleParamsEdit = () => {
    this.setState({ displayParams: !this.state.displayParams });
  };

  renderTestResultIcon(lastRunResult) {
    if (!lastRunResult) return null;

    if (lastRunResult.get("result") === true) {
      return <Icon name="check circle" color="green" />;
    } else {
      return <Icon name="exclamation circle" color="red" />;
    }
  }

  renderTestResultDetail(lastRunResult) {
    if (!lastRunResult) return null;

    const time = lastRunResult.get("time");
    const result = lastRunResult.get("result");
    return (
      <Segment color={result.get("testResult") === true ? "green" : "red"}>
        <Header as="h4">Last test result:</Header>
        <div>
          {result.get("testResult") === true && (
            <span>
              <Icon name="check circle" color="green" />Pass
            </span>
          )}
          {result.getIn(["testResult", "errors"]) && (
            <span>
              <Icon name="exclamation circle" color="red" />Fail
            </span>
          )}
          {", "}
          <span>
            {timeDistanceInWords(new Date(time), {
              addSuffix: true
            })}
          </span>
          {result.getIn(["testResult", "errorText"]) && (
            <div>
              <Segment basic>
                <pre>{result.getIn(["testResult", "errorText"])}</pre>
              </Segment>
              <Header as="h3">Request result</Header>
              <Segment>
                <Header as="h4">Headers</Header>
                <JsonEditor
                  readOnly
                  editorOptions={{
                    minLines: 2,
                    maxLines: 20,
                    autoScrollEditorIntoView: true,
                    readOnly: true
                  }}
                  value={JSON.stringify(result.get("headers"), null, 2)}
                  name={`test-unit-response-body-${this.props.testId}`}
                />
              </Segment>
              <Segment>
                <Header as="h4">Response</Header>
                <JsonEditor
                  readOnly
                  editorOptions={{
                    minLines: 2,
                    maxLines: 20,
                    autoScrollEditorIntoView: true,
                    readOnly: true
                  }}
                  value={JSON.stringify(result.get("bodyJson"), null, 2)}
                  name={`test-unit-response-body-${this.props.testId}`}
                />
              </Segment>
            </div>
          )}
        </div>
      </Segment>
    );
  }

  renderParamsHeaders(uniqueId) {
    const panes = [
      {
        menuItem: <Menu.Item key="params">Params</Menu.Item>,
        render: () => (
          <Tab.Pane>
            <JsonEditor
              editorOptions={{
                minLines: 2,
                maxLines: 10,
                autoScrollEditorIntoView: true
              }}
              name={`test-unit-params-${uniqueId}`}
            />
          </Tab.Pane>
        )
      },
      {
        menuItem: <Menu.Item key="headers">Headers</Menu.Item>,
        render: () => (
          <Tab.Pane>
            <JsonEditor
              editorOptions={{
                minLines: 2,
                maxLines: 10,
                autoScrollEditorIntoView: true
              }}
              name={`test-unit-params-${uniqueId}`}
            />
          </Tab.Pane>
        )
      }
    ];

    return <div style={{marginBottom: '0.5em'}}><Tab panes={panes} /></div>;
  }

  render() {
    const { expanded, urn, method, uniqueId, displayParams } = this.state;
    const { isWatched, lastRunResult, test } = this.props;
    return (
      <Card fluid>
        <Card.Content>
          <Segment basic floated="right" style={{ margin: 0, padding: 0 }}>
            {this.renderTestResultIcon(lastRunResult)}
            <Popup
              trigger={<Button icon basic size="mini" icon="close" />}
              content={
                <Button
                  content="Confirm delete!"
                  color="red"
                  onClick={this.onRemoveTest}
                />
              }
              on="click"
              position="top right"
            />{" "}
            <Button
              icon
              size="mini"
              onClick={this.onToggleWatch}
              toggle
              active={isWatched}
            >
              <Icon name="eye" />
            </Button>
            <Button
              icon
              size="mini"
              loading={test.get("isRunning", false)}
              onClick={this.onRunTest}
            >
              <Icon name="play" />
            </Button>
          </Segment>
          <Card.Header>
            <Header
              as="h4"
              style={{ cursor: "pointer" }}
              onClick={() => this.onExpanded()}
            >
              <Rail
                attached
                internal
                position="left"
                style={{ cursor: "move", width: 20 }}
              >
                <DragHandle />
              </Rail>

              {expanded ? (
                <Icon name="caret down" />
              ) : (
                <Icon name="caret right" />
              )}
              <Header.Content>{[method, urn].join(" ")} </Header.Content>
            </Header>
          </Card.Header>
        </Card.Content>
        {expanded && (
          <Card.Content>
            <Form>
              <Form.Input
                fluid
                placeholder="example: /topic/9"
                label="URN"
                name="urn"
                value={urn}
                onChange={this.handleChange}
                action
                actionPosition="left"
              >
                <Dropdown
                  button
                  basic
                  floating
                  options={methodOptions}
                  value={(method || "get").toLowerCase()}
                />
                <input />
                <Button
                  toggle
                  active={displayParams}
                  onClick={this.toggleParamsEdit}
                >
                  Params + Headers
                </Button>
              </Form.Input>
              {displayParams && this.renderParamsHeaders(uniqueId)}
              <Form.Select
                options={testOptions}
                placeholder="Strategy"
                defaultValue={"response_follow_spec"}
              />
              <Form.Group>
                <Form.Button
                  toggle
                  active={isWatched}
                  onClick={this.onToggleWatch}
                >
                  <Icon name="eye" /> Watch
                </Form.Button>
                <Form.Button onClick={this.onRunTest}>
                  <Icon name="play" /> Run
                </Form.Button>
              </Form.Group>
            </Form>
            {this.renderTestResultDetail(lastRunResult)}
          </Card.Content>
        )}
      </Card>
    );
  }
}
