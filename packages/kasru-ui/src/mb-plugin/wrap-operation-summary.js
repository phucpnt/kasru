import React, { Component } from "react";
import {Button} from 'semantic-ui-react';

export default function(OperationSummary, system) {
  class OperationWithStub extends Component {
    constructor(props){
      super(props);
      this.state = {isShown: false};
    }
    toggleShown = () => {
      this.props.toggleShown();
      this.setState({isShown: ! this.state.isShown});
    }
    render() {
      const {isShown} = this.state;
      const {operationProps: op} = this.props;
      const SwaggerPathStubs = this.props.getComponent('SwaggerPathStubs', true);

      return (
        <div className="operation-summary-with-stub">
          <OperationSummary {...this.props} toggleShown={this.toggleShown} />
          {/* {isShown && (<Button>Stub</Button>)} */}
          <div style={{padding: '5px'}}>
          <SwaggerPathStubs swaggerPath={op.get('path')} />
          </div>
        </div>
      );
    }
  }

  return OperationWithStub;
}
