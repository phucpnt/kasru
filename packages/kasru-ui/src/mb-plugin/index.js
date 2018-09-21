import wrapOperationSummary from "./wrap-operation-summary";
import SwaggerPathStubs from "./component-swagger-path-stubs";

import createStateStub from "./stub";

function createMBPlugin({ getSystem }) {
  const plugin = {};

  plugin.wrapComponents = {
    OperationSummary: wrapOperationSummary
  };

  plugin.components = {
    SwaggerPathStubs
  };

  plugin.statePlugins = {
    stub: createStateStub({ getSystem })
  };

  return plugin;
}

export default createMBPlugin;
