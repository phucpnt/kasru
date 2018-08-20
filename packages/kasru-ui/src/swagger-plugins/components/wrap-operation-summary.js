import React, { Component } from "react";
import { Image } from "semantic-ui-react";
import Lightbox from "react-images";

export default function withAssets(OperationSummary, system) {
  class OperationSummaryAssets extends Component {
    constructor(props) {
      super(props);
      this.state = {
        lightboxIsOpen: false,
        lbCurrentIndex: 0
      };
    }
    openLightbox(index) {
      this.setState({ lightboxIsOpen: true, lbCurrentIndex: index });
    }
    closeLightbox = () => {
      this.setState({ lightboxIsOpen: false, lbCurrentIndex: 0 });
    };
    render() {
      const specPath = this.props.specPath.toJS();
      const imageUrls = system.specSelectors
        .specJson()
        .getIn(specPath.concat(["x-files"]), [])
        .filter(url => /\.(png|jpg|jpeg)$/.test(url.trim()));
      return (
        <div>
          <OperationSummary {...this.props} />
          {imageUrls.size > 0 && (
            <div style={{ padding: "5px" }}>
              <Image.Group size="small">
                {imageUrls.map((image, index) => (
                  <Image
                    style={{ cursor: "pointer" }}
                    src={image}
                    key={image}
                    verticalAlign="top"
                    onClick={() => this.openLightbox(index)}
                  />
                ))}
              </Image.Group>
              <Lightbox
                images={imageUrls.map(img => ({ src: img })).toJS()}
                currentImage={this.state.lbCurrentIndex}
                isOpen={this.state.lightboxIsOpen}
                onClickNext={(e, index) => {
                  this.setState({ lbCurrentIndex: this.state.lbCurrentIndex + 1 });
                }}
                onClickPrev={(e, index) => {
                  this.setState({ lbCurrentIndex: this.state.lbCurrentIndex - 1 });
                }}
                onClickThumbnail={(index) => {
                  this.setState({ lbCurrentIndex: index });
                }}
                onClose={this.closeLightbox}
                showThumbnails
              />
            </div>
          )}
        </div>
      );
    }
  }

  return OperationSummaryAssets;
}
