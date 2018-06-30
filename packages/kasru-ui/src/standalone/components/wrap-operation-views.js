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
  constructor(props) {
    super(props);
    this.state = {
      filters: []
    };
  }

  handleFilter = (evt, { name, value }) => {
    console.info(name, value);
    this.setState({ [name]: value });
  };

  getPanels(opsByTickets) {
    const { specSelectors } = this.props;
    const { filters } = this.state;
    console.info(filters);
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
              </Header>
            ),
            key: `title-${tag}`
          },
          content: {
            content: (
              <div>
                {ops
                  .map(op => {
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
                        key={`${path}-${method}`}
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
      <div className="kasru-operations-container">
        <Form.Field>
          <label>Filter: </label>
          <Dropdown
            placeholder="Filter by tickets..."
            multiple
            search
            selection
            options={tickets
              .map(url => ({
                text: url.split("/").slice(-1)[0],
                key: url,
                value: url
              }))
              .toArray()}
            name="filters"
            onChange={this.handleFilter}
          />
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
      this.state = {
        opView: "tickets"
      };
    }

    handleMenuClick = (e, { name }) => this.setState({ opView: name });

    render() {
      const activeItem = this.state.opView;

      return (
        <div>
          <Menu color="green" pointing size="large" widths={2}>
            <Menu.Item
              name="tickets"
              active={activeItem === "tickets"}
              onClick={this.handleMenuClick}
            />
            <Menu.Item
              name="tags"
              active={activeItem === "tags"}
              onClick={this.handleMenuClick}
            />
          </Menu>
          {activeItem === "tickets" && (
            <ByTicketsOperationView {...this.props} />
          )}
          {activeItem === "tags" && <Operations {...this.props} />}
        </div>
      );
    }
  }
  return MultipleOperationsView;
}
