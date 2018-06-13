import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Button, Dropdown } from "semantic-ui-react";
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

  render() {
    const { children, specList, dropdownItems = null, specName = 'Select spec' } = this.props;
    return (
      <Button.Group color="green">
        <Dropdown
          text={specName}
          icon="bars"
          floating
          labeled
          button
          className="icon"
        >
          <Dropdown.Menu>
            <Dropdown.Header>Select spec</Dropdown.Header>
            {specList.map(item => {
              return (
                <Dropdown.Item key={item.specName} onClick={this.onSpecSelect.bind(this, item)}>
                  {item.specName}
                </Dropdown.Item>
              );
            })}
            {dropdownItems}
          </Dropdown.Menu>
        </Dropdown>
      </Button.Group>
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
