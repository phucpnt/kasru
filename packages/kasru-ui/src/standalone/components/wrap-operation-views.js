import React, { Component } from "react";
import {
  Accordion,
  Header,
  Icon,
  Label,
  Dropdown,
  Form,
  Menu
} from "semantic-ui-react";
import { List } from "immutable";
import Clipboard from "react-clipboard.js";

const SWAGGER2_OPERATION_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch"
];

const OAS3_OPERATION_METHODS = SWAGGER2_OPERATION_METHODS.concat(["trace"]);

class ByTicketsOperationView extends Component {
  state = {
    filters: []
  };

  componentDidMount() {
    const ops = this.props.uiSelectors.ops();
    const tickets = this.props.specSelectors.tickets();
    const ticketIds = ops.getIn(["filters", "tickets"]);
    this.setState({
      filters: tickets
        .filter(url => ticketIds.indexOf(url.split("/").slice(-1)[0]) > -1)
        .toArray()
    });
  }

  handleFilter = (evt, { name, value }) => {
    console.info(name, value);
    this.setState({ [name]: value });
  };

  getPanels(opsByTickets) {
    const { specSelectors } = this.props;
    const { filters } = this.state;
    const OperationContainer = this.props.getComponent(
      "OperationContainer",
      true
    );
    return opsByTickets
      .filter((v, url) => filters.length === 0 || filters.indexOf(url) > -1)
      .map((ops, url) => {
        const tag = url.split("/").slice(-1)[0];
        return {
          title: {
            content: (
              <Header size="medium" as="span">
                {tag} <Label>{ops.size}</Label>{" "}
                <a
                  href={url}
                  target="_blank"
                  onClick={e => {
                    e.stopPropagation();
                  }}
                >
                  <Icon name="external" />
                </a>
                {/* prevent closing the panel when click copy to clipboard */}
                <div
                  style={{ display: "inline-block", float: "right" }}
                  onClick={e => {
                    e.stopPropagation();
                  }}
                >
                  <Clipboard
                    data-clipboard-text={this.props.uiSelectors.urlSpecRead({
                      opsView: "tickets",
                      tickets: tag
                    })}
                    className="ui small button"
                    button-title="Copy to clipboard"
                  >
                    <Icon name="linkify" /> Copy link
                  </Clipboard>
                </div>
              </Header>
            ),
            key: `title-${tag}`
          },
          content: {
            content: (
              <div>
                {ops
                  .map((op,index) => {
                    const path = op.get("path");
                    const method = op.get("method");
                    const specPath = List(["paths", path, method]);

                    // FIXME: (someday) this logic should probably be in a selector,
                    // but doing so would require further opening up
                    // selectors to the plugin system, to allow for dynamic
                    // overriding of low-level selectors that other selectors
                    // rely on. --KS, 12/17
                    const validMethods = specSelectors.isOAS3()
                      ? OAS3_OPERATION_METHODS
                      : SWAGGER2_OPERATION_METHODS;

                    if (validMethods.indexOf(method) === -1) {
                      return null;
                    }

                    console.info(`${path}-${method}-${tag}`);

                    return (
                      <OperationContainer
                        key={`${path}-${method}-${tag}`}
                        specPath={specPath}
                        op={op}
                        path={path}
                        method={method}
                        tag={tag}
                      />
                    );
                  })
                  .toArray()}
              </div>
            ),
            key: `content-${tag}`
          }
        };
      })
      .toArray();
  }

  render() {
    const opsByTickets = this.props.specSelectors.opsByTickets();
    const tickets = this.props.specSelectors.tickets();
    const panels = this.getPanels(opsByTickets);
    return (
      <div
        className="kasru-operations-container"
        id="kasru-operations-container"
      >
        <Form.Field>
          <label>Filter: </label>
          <Dropdown
            placeholder="Filter APIs by tickets..."
            multiple
            search
            selection
            fluid
            options={tickets
              .map(url => ({
                text: url.split("/").slice(-1)[0],
                key: url,
                value: url
              }))
              .toArray()}
            name="filters"
            value={this.state.filters}
            onChange={this.handleFilter}
            style={{marginBottom: '0.5em'}}
          />
          <Clipboard
            data-clipboard-text={this.props.uiSelectors.urlSpecRead({
              opsView: "tickets",
              tickets: this.state.filters.map(url => url.split("/").slice(-1)[0]).join(',')
            })}
            className="ui small button"
            button-title="Copy to clipboard"
          >
            <Icon name="linkify" /> Copy link to filters
          </Clipboard>
        </Form.Field>
        <p>&nbsp;</p>
        <Accordion
          fluid
          panels={panels}
          exclusive={false}
          defaultActiveIndex={panels.map((v, k) => k)}
        />
      </div>
    );
  }
}

export default function wrapOperations(Operations, system) {
  class MultipleOperationsView extends Component {
    constructor(props) {
      super(props);
      const ops = this.props.uiSelectors.ops();
      this.state = {
        opView: ops.get("view")
      };
    }

    handleMenuClick = (e, { id }) => {
      this.setState({ opView: id });
    };

    render() {
      const activeItem = this.state.opView;

      return (
        <div>
          <Menu color="green" pointing size="large" widths={2}>
            <Menu.Item
              key="tickets"
              id="tickets"
              name="JIRA tickets"
              active={activeItem === "tickets"}
              onClick={this.handleMenuClick}
            />
            <Menu.Item
              key="tags"
              id="tags"
              name="Tags"
              active={activeItem === "tags"}
              onClick={this.handleMenuClick}
            />
          </Menu>
          {activeItem === "tickets" && (
            <ByTicketsOperationView {...this.props} />
          )}
          {activeItem === "tags" && (
            <FilterableOperations {...this.props}>
              <Operations {...this.props} />
            </FilterableOperations>
          )}
        </div>
      );
    }
  }
  return MultipleOperationsView;
}

class FilterableOperations extends Component {
  constructor(props) {
    super(props);

    const keywords = this.props.uiSelectors.ops().getIn(["filters", "tags"]);
    const tags = keywords.map(w => ({ text: w, value: w })).toJS();
    this.state = {
      options: tags,
      currentValues: keywords.toJS(),
    };
  }

  handleAddition = (e, { value }) => {
    this.setState({
      options: [{ text: value, value }, ...this.state.options]
    });
  };

  handleChange = (e, { value }) => {
    this.setState({ currentValues: value });
    this.props.uiActions.updateOpsFilter("tags", value);
  };

  render() {
    const { currentValues = [] } = this.state;
    return (
      <div>
        <Form.Field>
          <label>Filter: </label>
          <Dropdown
            options={this.state.options}
            placeholder="Search apis include tags.."
            additionLabel="Search for "
            noResultsMessage="enter your keyword..."
            search
            selection
            fluid
            multiple
            allowAdditions
            value={currentValues}
            onAddItem={this.handleAddition}
            onChange={this.handleChange}
            style={{ marginBottom: "0.5em" }}
          />
          <Clipboard
            data-clipboard-text={this.props.uiSelectors.urlSpecRead({
              opsView: "tags",
              tags: currentValues.join(",")
            })}
            className="ui small button"
            button-title="Copy to clipboard"
          >
            <Icon name="linkify" /> Copy link to filters
          </Clipboard>
        </Form.Field>
        <p>&nbsp;</p>
        {this.props.children}
      </div>
    );
  }
}
