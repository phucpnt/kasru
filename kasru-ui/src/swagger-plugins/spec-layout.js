import React, { Component } from "react";

class SpecLayout extends Component {
  render() {
    const CustomBaseLayout = this.props.getComponent('CustomBaseLayout');
    return <CustomBaseLayout {...this.props} />;
  }
}

export default SpecLayout;
