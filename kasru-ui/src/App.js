import React, { Component } from "react";
import "semantic-ui-css/semantic.css";
import "swagger-ui/dist/swagger-ui.css";
import "swagger-editor/dist/swagger-editor.css";

// import SwaggerEditor from "swagger-editor";
import "./App.css";

// import SwaggerEditorPresets from "./standalone";

class App extends Component {
  componentDidMount() {
    import(/* webpackChunkName: "swagger-editor" */ "swagger-editor").then(SwaggerEditor => {
      import("./standalone").then(SwaggerEditorPresets => {
        SwaggerEditor({
          dom_id: "#swagger-editor",
          layout: "StandaloneLayout",
          presets: [SwaggerEditorPresets.default]
        });
      });
    });
  }
  render() {
    return <div className="App" id="swagger-editor" />;
  }
}

export default App;
