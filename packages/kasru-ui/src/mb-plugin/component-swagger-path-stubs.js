import React, { Component } from "react";
import { GroupSwaggerPathStubs } from "./stub-editor";

class SwaggerPathStubs extends Component {
  constructor(props) {
    super(props);
    this.state = { isShown: false };
  }

  onStubRemove = index => {
    const { swaggerPath } = this.props;
    this.props.stubActions.removeStub(index, swaggerPath);
  };

  onStubUpdate = (index, { predicates, responses }) => {
    const { swaggerPath } = this.props;
    this.props.stubActions.updateStub(swaggerPath, index, {
      predicates,
      responses
    });
  };

  addStubForPath = ({ predicates = [], responses = [] }) => {
    const { swaggerPath } = this.props;
    this.props.stubActions.addStub(swaggerPath, { predicates, responses });
  }

  onGenerateStub = index => {
    const { swaggerPath } = this.props;
    this.props.stubActions.generateStub(swaggerPath, index);
  };

  onChangeStubOrder = (stubIndex, direction) => {
    const { swaggerPath } = this.props;
    this.props.stubActions.changeOrder(swaggerPath, stubIndex, direction);
  }

  togglePathStubs = () => {
    this.setState({
      isShown: !this.state.isShown
    });
  }

  render() {
    const { swaggerPath } = this.props;
    return (
      <GroupSwaggerPathStubs
        swaggerPath={swaggerPath}
        active={this.state.isShown}
        onChange={this.onStubUpdate}
        onAddStub={this.addStubForPath}
        onClickTitle={this.togglePathStubs}
        onRemoveStub={this.onStubRemove}
        onGenerateStub={this.onGenerateStub}
        onChangeStubOrder={this.onChangeStubOrder}
      />
    );
  }
}

export default SwaggerPathStubs;
