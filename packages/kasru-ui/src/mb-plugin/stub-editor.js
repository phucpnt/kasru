import React, { Component } from "react";
import {
  Segment,
  Container,
  Accordion,
  Icon,
  Header,
  Menu,
  Tab,
  Label,
  Popup,
  Button,
  Grid
} from "semantic-ui-react";
import PropTypes from "prop-types";
import { fromJS, List } from "immutable";

import isUndefined from "lodash/isUndefined";
import debounce from "lodash/debounce";

import JsonEditor from "../swagger-plugins/components/json-editor";

const NOOP = Function.prototype; // Apparently the best way to no-op

export class GroupSwaggerPathStubs extends Component {

  static defaultProps = {
    stubs: List(),
  }

  static propTypes = {
    stubs: PropTypes.instanceOf(List),
  }
  
  constructor(props) {
    super(props);
    console.info(this.props);
    const { stubs } = props;
    this.state = {
      selectedStubIndex: stubs.size ? 0 : false
    };
  }

  toggleBody = () => {
    this.setState({ isCollapsed: !this.state.isCollapsed });
  };

  selectStub = (evt, { name }) => {
    this.setState({ selectedStubIndex: parseInt(name) });
  };

  onRemove(index) {
    this.props.onRemoveStub(index);
  }

  onChangeOrder(originIndex, direction) {
    const { stubs } = this.props;
    let focusIndex = stubs.findIndex(
      stub => stub.get("originIndex") === originIndex
    );
    if (direction === "up" && focusIndex > 0) {
      focusIndex = focusIndex - 1;
    } else if (direction === "down" && focusIndex < stubs.size - 1) {
      focusIndex = focusIndex + 1;
    }
    this.props.onChangeStubOrder(originIndex, direction);
    this.setState({ selectedStubIndex: focusIndex });
  }

  render() {
    const { swaggerPath, stubs, active } = this.props;

    let { selectedStubIndex } = this.state;
    if (selectedStubIndex === false && stubs.size > 0) {
      selectedStubIndex = 0;
    }

    let focusStub = null;
    if (stubs.size > 0) {
      focusStub = stubs.get(selectedStubIndex);
    }

    return (
      <div>
        <Header
          as="h4"
          attached="top"
          onClick={this.props.onClickTitle}
        >
          {active ? <Icon name="angle down" /> : <Icon name="angle right" />}{" "}
          <Header.Content>
            Stubs{" "}<Label as="span" size="mini" color="grey" horizontal>
              {stubs.size}
            </Label>
          </Header.Content>
        </Header>
        {active && (
          <Segment attached>
            <Grid columns={2} padded={false}>
              <Grid.Column width={2}>
                <Menu fluid pointing vertical size={"mini"}>
                  {stubs.map((stub, index) => {
                    const stubIndex = stub.get("uniqueKey");
                    return (
                      <Menu.Item
                        key={stubIndex}
                        name={index + ""}
                        onClick={this.selectStub}
                        active={selectedStubIndex === index}
                      >
                        #{index}
                      </Menu.Item>
                    );
                  })}
                  <Menu.Item>
                    <Button
                      compact
                      icon
                      basic
                      color="green"
                      size={"mini"}
                      onClick={evt => {
                        evt.stopPropagation();
                        this.props.onAddStub({});
                      }}
                    >
                      <Icon name={"add"} />
                    </Button>
                  </Menu.Item>
                </Menu>
              </Grid.Column>
              <Grid.Column width={14}>
                {focusStub && (
                  <UnitStubEditor
                    predicates={focusStub.get("predicates")}
                    responses={focusStub.get("responses")}
                    specIndex={selectedStubIndex}
                    key={focusStub.get("uniqueKey")}
                    onClone={this.props.onAddStub}
                    onUpdate={this.props.onChange.bind(
                      this,
                      selectedStubIndex
                    )}
                    onRemove={this.onRemove.bind(
                      this,
                      selectedStubIndex
                    )}
                    onGenerateStub={this.props.onGenerateStub.bind(
                      null,
                      selectedStubIndex
                    )}
                    onOrderChange={this.onChangeOrder.bind(
                      this,
                      selectedStubIndex
                    )}
                  />
                )}
              </Grid.Column>
            </Grid>
          </Segment>
        )}
      </div>
    );
  }
}

class UnitStubEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isCollapsed: true,
      partFocus: "responses",
      responses: props.responses,
      predicates: props.predicates
    };
  }

  onUpdatePredicates = strContent => {
    let predicates = null;
    try {
      predicates = fromJS(JSON.parse(strContent));
    } catch (err) {}

    console.info("predicates", predicates);
    if (predicates) {
      this.setState({ predicates });
      this.props.onUpdate({ predicates, responses: this.state.responses });
    }
  };

  onUpdateResponses = strResponses => {
    let responses = null;
    try {
      responses = fromJS(JSON.parse(strResponses));
    } catch (err) {}

    if (responses) {
      this.setState({ responses });
      this.props.onUpdate({ predicates: this.state.predicates, responses });
    }
  };

  constructPanes({ predicates, responses }) {
    const editorHeight = 600;
    const panes = [
      {
        menuItem: (
          <Menu.Item key="responses">
            Responses<Label>{responses.size}</Label>
            <Popup
              trigger={<Icon name="help" />}
              content={
                <div>
                  Multiple responses will be round-robin served in the mock
                  server.{" "}
                  <a
                    href="http://www.mbtest.org/docs/api/stubs"
                    target="_blank"
                  >
                    More details
                  </a>
                </div>
              }
              on="click"
              position="top right"
            />
          </Menu.Item>
        ),
        render: () => (
          <div style={{ height: editorHeight }}>
            <JsonEditor
              value={JSON.stringify(responses, null, 2)}
              className="unit-stub-json-editor"
              name={`${this.props.specIndex}-responses`}
              onChange={this.onUpdateResponses}
            />
          </div>
        )
      },
      {
        menuItem: (
          <Menu.Item key="predicates">
            Predicates<Label>{predicates.size}</Label>
            <Popup
              trigger={<Icon name="help" />}
              content={
                <div>
                  All predicates must be qualified for sending responses.{" "}
                  <a
                    href="http://www.mbtest.org/docs/api/predicates"
                    target="_blank"
                  >
                    More details
                  </a>
                </div>
              }
              on="click"
              position="top right"
            />
          </Menu.Item>
        ),
        render: () => (
          <div style={{ height: editorHeight }}>
            <JsonEditor
              value={JSON.stringify(predicates, null, 2)}
              className="unit-stub-json-editor"
              name={`${this.props.specIndex}-predicates`}
              onChange={this.onUpdatePredicates}
            />
          </div>
        )
      }
    ];
    return panes;
  }

  displayEditor(type) {
    this.setState({ partFocus: type });
  }

  render() {
    const editorHeight = 600;
    const { partFocus, predicates, responses } = this.state;
    return (
      <div>
        <Menu attached="top" pointing secondary  size="mini">
          <Menu.Item
            fitted="vertically"
            key="responses"
            active={partFocus === "responses"}
            onClick={this.displayEditor.bind(this, "responses")}
          >
            Responses<Label>{responses.size}</Label>
            <Popup
              trigger={<Icon name="help" />}
              content={
                <div>
                  Multiple responses will be round-robin served in the mock
                  server.{" "}
                  <a
                    href="http://www.mbtest.org/docs/api/stubs"
                    target="_blank"
                  >
                    More details
                  </a>
                </div>
              }
              on="click"
              position="bottom left"
            />
          </Menu.Item>
          <Menu.Item
            fitted="vertically"
            key="predicates"
            active={partFocus === "predicates"}
            onClick={this.displayEditor.bind(this, "predicates")}
          >
            Predicates<Label>{predicates.size}</Label>
            <Popup
              trigger={<Icon name="help" />}
              content={
                <div>
                  All predicates must be qualified for sending responses.{" "}
                  <a
                    href="http://www.mbtest.org/docs/api/predicates"
                    target="_blank"
                  >
                    More details
                  </a>
                </div>
              }
              on="click"
              position="bottom left"
            />
          </Menu.Item>
          <Menu.Menu position="right">
            <Menu.Item>
              <Button.Group>
                <Button compact  icon basic>
                  <Icon
                    
                    name={"clone"}
                    onClick={() => {
                      this.props.onClone({ responses, predicates });
                    }}
                  />
                </Button>
                <Button
                  compact
                  
                  icon
                  basic
                  onClick={this.props.onGenerateStub}
                >
                  <Icon  name={"bolt"} />
                </Button>
                <Button
                  compact
                  
                  icon
                  basic
                  color="red"
                  onClick={this.props.onRemove}
                >
                  <Icon name={"remove"} />
                </Button>
              </Button.Group>
            </Menu.Item>
            <Menu.Item>
              <Button.Group>
                <Button
                  compact
                  
                  icon
                  basic
                  onClick={() => this.props.onOrderChange("up")}
                >
                  <Icon name={"arrow up"} />
                </Button>
                <Button
                  compact
                  
                  icon
                  basic
                  onClick={() => this.props.onOrderChange("down")}
                >
                  <Icon name={"arrow down"} />
                </Button>
              </Button.Group>
            </Menu.Item>
          </Menu.Menu>
        </Menu>
        <Segment  style={{ height: editorHeight }}>
          {partFocus === "responses" && (
            <JsonEditor
              value={JSON.stringify(responses, null, 2)}
              className="unit-stub-json-editor"
              name={`${this.props.specIndex}-responses`}
              onChange={this.onUpdateResponses}
            />
          )}
          {partFocus === "predicates" && (
            <JsonEditor
              value={JSON.stringify(predicates, null, 2)}
              className="unit-stub-json-editor"
              name={`${this.props.specIndex}-predicates`}
              onChange={this.onUpdatePredicates}
            />
          )}
        </Segment>
      </div>
    );
  }
}

UnitStubEditor.propTypes = {
  onUpdate: PropTypes.func
};
