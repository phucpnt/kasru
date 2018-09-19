import React, { Component } from "react";
import { Container } from "semantic-ui-react";

export default function wrapLiveResponse(LiveResponse, system) {
  return props => {
    return (
      <Container
        fluid
        style={{ marginBottom: "2em"}}
        className="server-reponse-container"
      >
        <LiveResponse {...props} />
        <hr />
      </Container>
    );
  };
}
