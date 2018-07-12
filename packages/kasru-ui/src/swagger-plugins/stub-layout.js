import React from "react";
import PropTypes from "prop-types";

export default class StubEditorLayout extends React.Component {
  render() {
    let { getComponent, specSelectors, specActions } = this.props;

    let UIBaseLayout = getComponent("BaseLayout", true);

    let Container = getComponent("Container");
    let EditorContainer = getComponent("EditorContainer", true);
    const SplitPaneMode = getComponent("SplitPaneMode", true);
    const StubEditor = getComponent("StubEditor", true);

    return (
      <div>
        <Container className="container">
          <SplitPaneMode>
            <div className="stub-editor-container">
              <StubEditor />
            </div>
            <UIBaseLayout />
          </SplitPaneMode>
        </Container>
      </div>
    );
  }
}
