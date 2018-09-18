import React, { Component } from "react";
import {
  Accordion,
  Header,
  Icon,
  Label,
  Dropdown,
  Form,
  Menu,
  Button,
  Dimmer,
  Loader,
  Container,
  Segment
} from "semantic-ui-react";
import { helpers } from "swagger-client";
import { List, is } from "immutable";
import Clipboard from "react-clipboard.js";
import { parse } from "uri-js";
import memoize from "lodash/memoize";
import { connect } from "react-redux";
import qs from "query-string";
import { createSimpleMatchTest } from "../utils/validate";

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
                  .map((op, index) => {
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
    console.info(this.props.specSelectors);
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
            style={{ marginBottom: "0.5em" }}
          />
          <Clipboard
            data-clipboard-text={this.props.uiSelectors.urlSpecRead({
              opsView: "tickets",
              tickets: this.state.filters
                .map(url => url.split("/").slice(-1)[0])
                .join(",")
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
          <Menu color="green" pointing size="large" widths={3}>
            <Menu.Item
              key="endpoints"
              id="endpoints"
              name="Endpoints"
              active={activeItem === "endpoints"}
              onClick={this.handleMenuClick}
            />
            <Menu.Item
              key="tags"
              id="tags"
              name="Tags"
              active={activeItem === "tags"}
              onClick={this.handleMenuClick}
            />
            <Menu.Item
              key="tickets"
              id="tickets"
              name="JIRA tickets"
              active={activeItem === "tickets"}
              onClick={this.handleMenuClick}
            />
          </Menu>
          {activeItem === "endpoints" && <EndpointOperations {...this.props} />}
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
      currentValues: keywords.toJS()
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

const wrapOperation = memoize(Operation => props => {
  return (
    <Operation
      {...props}
      operation={props.operation.set("tryItOutEnabled", true)}
    />
  );
});

class TryItOutEnabledOperationContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true
    };
  }
  componentDidMount() {
    this.props.specActions.requestResolvedSubtree([
      "paths",
      this.props.op.get("path"),
      "get"
    ]);
  }

  componentDidUpdate(prevProps, prevState) {
    const { op, queryUrl, specActions, specSelectors, response, queryPath } = this.props;
    const path = op.get("path");
    const method = op.get("method");
    const resolved = this.props.resolvedOp;

    if (!is(prevProps.resolvedOp, resolved) || prevProps.queryUrl != queryUrl) {
      console.info("calling execute", queryUrl, resolved);
      const parts = qs.parseUrl(queryUrl);

      const operationId = helpers.opId(op.get("operation"), path, method);
      this.props.layoutActions.show(
        ["operations", undefined, operationId],
        true
      );

      const matcher = createSimpleMatchTest(path);
      const varsInPath = matcher.pickInPathVar(queryPath);
      const queryVars = {...parts.query, ...varsInPath };

      Object.keys(queryVars).forEach(k => {
        const val = queryVars[k];
        this.props.specActions.changeParamByIdentity(
          [path, method],
          resolved
            .get("parameters")
            .find(p => p.get("name") === k),
          val,
          false
        );
      });

      specActions.validateParams([path, method]);
      if (specSelectors.validateBeforeExecute([path, method])) {
        this.setState({ isLoading: true });
        specActions.execute({ operation: resolved, path, method });
      }
    }

    if (this.state.isLoading && !is(response, prevProps.response)) {
      this.setState({ isLoading: false });
    }
  }

  getComponent = (...args) => {
    if (args[0] === "operation") {
      return wrapOperation(this.props.getComponent(...args));
    } else {
      return this.props.getComponent(...args);
    }
  };

  getResolvedSubtree = () => {
    const { op } = this.props;
    const resolved = this.props.specSelectors.specResolvedSubtree(
      "paths",
      op.get("path"),
      op.get("method")
    );
    if (!resolved) {
      return op;
    }
    return resolved;
  };

  render() {
    const OperationContainer = this.props.getComponent(
      "OperationContainer",
      true
    );
    const { response } = this.props;
    const { isLoading } = this.state;

    return (
      <Container fluid>
        <Loader active={isLoading} inline="centered">
          Loading
        </Loader>
        <OperationContainer {...this.props} getComponent={this.getComponent} />
      </Container>
    );
  }
}

const StatefulTryItOutOpContainer = connect((state, ownProps) => {
  const { op } = ownProps;
  const path = op.get("path");
  const method = op.get("method");
  const resovled = ownProps.specSelectors.specResolvedSubtree([
    "paths",
    path,
    method
  ]);
  const response = ownProps.specSelectors.responseFor(path, method);
  return {
    resolvedOp: resovled || op,
    response
  };
})(TryItOutEnabledOperationContainer);

class EndpointOperations extends Component {
  constructor(props) {
    super(props);
    const queryUrl = "";
    this.state = {
      queryUrl,
      inputUrl: queryUrl,
      queryOp: null
    };
  }

  queryUrl = () => {
    let queryUrl = this.state.inputUrl;
    const spec = this.props.specSelectors.specJson();
    const servers = spec.get("servers", List);

    let validPath = null;
    servers.forEach(s => {
      if (queryUrl.indexOf(s.get("url")) === 0) {
        validPath = queryUrl.replace(s.get("url"), "");
      }
    });

    if (validPath === null) {
      // invalid path
    } else {
      const parts = parse(validPath);
      const ops = this.props.specSelectors.operations();
      const foundOp = ops.find(op => {
        return (
          op.get("method") === "get" &&
          createSimpleMatchTest(op.get("path")).regex.test(parts.path)
        );
      });

      this.setState({ queryOp: foundOp, queryUrl, queryPath: parts.path });
    }
  };

  updateInputUrl = e => {
    this.setState({ inputUrl: e.target.value });
  };

  render() {
    const { specSelectors } = this.props;
    const { queryOp, queryUrl, queryPath } = this.state;
    const ops = this.props.specSelectors.operations();
    const OperationContainer = this.props.getComponent(
      "OperationContainer",
      true
    );

    return (
      <div>
        <h2>{ops.size} endpoints</h2>
        <Container
          className="endpoint-query-container"
          fluid
          style={{ padding: ".5em", background: "#ebe8fd" }}
        >
          <strong>Quick check request url</strong>
          <textarea
            placeholder="paste your url"
            style={{ minHeight: "72px", border: "1px solid #eee" }}
            value={this.state.inputUrl}
            onChange={this.updateInputUrl}
          />
          <Button
            color="purple"
            onClick={this.queryUrl}
            style={{ marginBottom: "1.5em" }}
          >
            Query & check
          </Button>
          <Button
            color="grey"
            style={{ marginBottom: "1.5em" }}
          >
            Clear
          </Button>
          {queryOp && (
            <StatefulTryItOutOpContainer
              key={`${queryOp.get("path")}-${queryOp.get(
                "method"
              )}-endpoints-queryurl`}
              specPath={List([
                "paths",
                queryOp.get("path"),
                queryOp.get("method")
              ])}
              op={queryOp}
              queryUrl={queryUrl}
              queryPath={queryPath}
              path={queryOp.get("path")}
              method={queryOp.get("method")}
              tryItOutEnabled={true}
              getComponent={this.props.getComponent}
              specActions={this.props.specActions}
              specSelectors={this.props.specSelectors}
              layoutActions={this.props.layoutActions}
            />
          )}
        </Container>
        <div className="ui divider" />
        {ops
          .map((op, index) => {
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

            return (
              <OperationContainer
                key={`${path}-${method}-endpoints`}
                specPath={specPath}
                op={op}
                path={path}
                method={method}
              />
            );
          })
          .toArray()}
      </div>
    );
  }
}
