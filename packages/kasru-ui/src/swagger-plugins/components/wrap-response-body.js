import React, { Component } from "react";

export default function wrapResponseBody(ResponseBody, system) {
  console.info('wrapped');
  class PrettyResponseBody extends Component {
    render() {
      return (
        <div>
          <h1>Wrapped</h1>
          <ResponseBody {...this.props}/>
        </div>
      );
    }
  }

  return PrettyResponseBody;
}
