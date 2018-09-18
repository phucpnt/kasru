import React, { Component } from "react";
import { Container, Button, Loader } from "semantic-ui-react";
import { helpers } from "swagger-client";
import { connect } from "react-redux";
import qs from "query-string";
import { List, is } from "immutable";
import { parse } from "uri-js";
import memoize from "lodash/memoize";
import { createSimpleMatchTest } from "../utils/validate";

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
    const {
      op,
      queryUrl,
      specActions,
      specSelectors,
      response,
      queryPath
    } = this.props;
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
      const queryVars = { ...parts.query, ...varsInPath };

      Object.keys(queryVars).forEach(k => {
        const val = queryVars[k];
        this.props.specActions.changeParamByIdentity(
          [path, method],
          resolved.get("parameters").find(p => p.get("name") === k),
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

export default class QuickCheckOperation extends Component {
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
    const { queryOp, queryUrl, queryPath } = this.state;
    return (
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
        <Button color="grey" style={{ marginBottom: "1.5em" }}>
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
    );
  }
}
