import React, { Component } from "react";
import loadjs from "loadjs";
import "semantic-ui-css/semantic.css";
import "swagger-ui/dist/swagger-ui.css";
import "swagger-editor/dist/swagger-editor.css";

// import SwaggerEditor from "swagger-editor";
import "./App.css";

// import SwaggerEditorPresets from "./standalone";

class App extends Component {
  componentDidMount() {
    loadjs(["https://apis.google.com/js/api.js"], () => {
      console.info('loaded.... google api');
      import(/* webpackChunkName: "swagger-editor" */ "swagger-editor").then(
        SwaggerEditor => {
          import("./swagger-plugins").then(SwaggerEditorPresets => {
            SwaggerEditor({
              dom_id: "#swagger-editor",
              layout: "StandaloneLayout",
              presets: [SwaggerEditorPresets.default],
              displayRequestDuration: true,
            });
          });
        }
      );
    });
  }
  render() {
    return <div className="App" id="swagger-editor" />;
  }
}

export default App;
