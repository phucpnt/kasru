import React from "react";
import PropTypes from "prop-types";

export default class StubEditorLayout extends React.Component {
  render() {
    let { getComponent, specSelectors, specActions } = this.props;

    let UIBaseLayout = getComponent("BaseLayout", true);

    let Container = getComponent("Container");
    let EditorContainer = getComponent("EditorContainer", true);
    const SplitPaneMode = getComponent("SplitPaneMode", true);
    const TestEditor= getComponent("TestEditor", true);

    return (
      <div>
        <Container className="container">
          <SplitPaneMode>
            <div className="test-editor-container">
              <TestEditor />
            </div>
            <UIBaseLayout />
          </SplitPaneMode>
        </Container>
      </div>
    );
  }
}