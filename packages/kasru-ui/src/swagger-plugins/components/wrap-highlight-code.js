import React, { Component } from "react";
import JsonEditor from "./json-editor";

export default function wrapResponseBody(HighlightCode, system) {
  console.info("wrapped");
  class PrettyResponseBody extends Component {
    render() {
      let isJson = false;
      try {
        JSON.parse(this.props.value);
        isJson = true;
      } catch (ex) {}
      if (isJson) {
        return (
          <JsonEditor
            readOnly
            editorOptions={{
              minLines: 2,
              maxLines: 20,
              autoScrollEditorIntoView: true,
              readOnly: true
            }}
            value={this.props.value}
            name={`json-highlight`}
          />
        );
      }
      return <HighlightCode {...this.props} />;
    }
  }

  return PrettyResponseBody;
}
