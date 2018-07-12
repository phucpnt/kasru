import React from "react";
import PropTypes from "prop-types";
import SplitPane from "react-split-pane";

export default class CustomBaseLayout extends React.Component {
  static propTypes = {
    errSelectors: PropTypes.object.isRequired,
    errActions: PropTypes.object.isRequired,
    specSelectors: PropTypes.object.isRequired,
    oas3Selectors: PropTypes.object.isRequired,
    oas3Actions: PropTypes.object.isRequired,
    getComponent: PropTypes.func.isRequired
  };

  render() {
    let { specSelectors, getComponent } = this.props;

    let SvgAssets = getComponent("SvgAssets");
    let InfoContainer = getComponent("InfoContainer", true);
    let VersionPragmaFilter = getComponent("VersionPragmaFilter");
    let Operations = getComponent("operations", true);
    let Models = getComponent("Models", true);
    let Row = getComponent("Row");
    let Col = getComponent("Col");
    let ServersContainer = getComponent("ServersContainer", true);
    let Errors = getComponent("errors", true);
    let SplitPaneMode = getComponent("SplitPaneMode", true);

    const SchemesContainer = getComponent("SchemesContainer", true);
    const FilterContainer = getComponent("FilterContainer", true);
    let isSwagger2 = specSelectors.isSwagger2();
    let isOAS3 = specSelectors.isOAS3();

    const isSpecEmpty = !specSelectors.specStr();

    if (isSpecEmpty) {
      let loadingMessage;
      let isLoading = specSelectors.loadingStatus() === "loading";
      if (isLoading) {
        loadingMessage = <div className="loading" />;
      } else {
        loadingMessage = <h4>No API definition provided.</h4>;
      }

      return (
        <div className="swagger-ui">
          <div className="loading-container">{loadingMessage}</div>
        </div>
      );
    }

    return (
      <div className="swagger-ui">
        <SvgAssets />
        <VersionPragmaFilter
          isSwagger2={isSwagger2}
          isOAS3={isOAS3}
          alsoShow={<Errors />}
        >
          <SplitPane
            disabledClass={""}
            split="vertical"
            defaultSize={"65%"}
            primary="second"
            minSize={0}
            allowResize={true}
            resizerStyle={{ flex: "0 0 auto", position: "relative" }}
          >
            <div>
              <Errors />
              <Row className="information-container">
                <Col mobile={12}>
                  <InfoContainer />
                </Col>
              </Row>

              <SchemesContainer />

              <ServersContainer />

              <FilterContainer />
            </div>
            <div style={{paddingTop: '1em'}}>
              <Row>
                <Col mobile={12} desktop={12}>
                  <Operations />
                </Col>
              </Row>
              <Row>
                <Col mobile={12} desktop={12}>
                  <Models />
                </Col>
              </Row>
            </div>
          </SplitPane>
        </VersionPragmaFilter>
      </div>
    );
  }
}
