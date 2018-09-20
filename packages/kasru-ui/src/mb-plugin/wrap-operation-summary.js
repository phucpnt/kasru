import React, { Fragment } from "react";

export default function(OperationSummary, system) {
  return props => {
    const { tag, operationId } = props;
    return (
      <div>
        <OperationSummary {...props} />
      </div>
    );
  };
}
