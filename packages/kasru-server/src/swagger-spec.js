const path = require("path");
const fs = require("fs-extra");
const route = require("express").Router();
const YAML = require("yaml-js");
const repeat = require("lodash/repeat");
const defaultsDeep = require("lodash/defaultsDeep");
const clone = require("lodash/cloneDeep");
const map = require("lodash/map");
const max = require("lodash/max");
const Swagger = require("swagger-client");
const shortid = require("shortid");
const fetch = require("unfetch");

const SwaggerBank = require("swaggerbank");
const mountebankHelper = require("mountebank-helper");

const { DIR_SPEC } = require("../global-var");
const { migrateStub } = require("./migrate-stub");

const YAML_EXT = ".yaml";
const STUB_EXT = ".stub.json";
const SECRET_EXT = ".cred.json";

route.use((req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

let mbServer = null;
let existedMBPorts = { system: [] };

route.get("/", (req, res) => {
  fs.readdir(DIR_SPEC).then(files => {
    res.json({
      data: files.filter(f => path.extname(f) === YAML_EXT).map(f => ({
        specName: path.basename(f, YAML_EXT),
        stubName: path.basename(f, YAML_EXT) + STUB_EXT
      }))
    });
    res.end();
  });
});

/**
 * TODO defining an expired methodology
 */
route.get("/register-session", (req, res) => {
  const sessionId = req.query.mbSession || shortid.generate();
  let assignedPort = null;

  if (existedMBPorts[sessionId]) {
    assignedPort = existedMBPorts[sessionId][0];
  } else {
    assignedPort = pickNewPort();
    existedMBPorts[sessionId] = [assignedPort];
  }

  res.json({
    data: {
      sessionId,
      mbPort: assignedPort
    }
  });
  res.end();
});

route.get("/:specName", (req, res) => {
  const specName = req.params.specName;

  if(specName.indexOf('gist:') === 0){
    res.json({
      content: null,
      stub: null,
      message: 'gist spec. spec content will be queried by APP via CORS',
    });
    res.end();
    return;
  }

  const specPath = path.join(DIR_SPEC, `${specName}${YAML_EXT}`);
  const stubPath = path.join(DIR_SPEC, `${specName}${STUB_EXT}`);

  Promise.all([
    fs.readFile(path.join(DIR_SPEC, `${specName}${YAML_EXT}`), "utf-8"),
    fs.existsSync(stubPath)
      ? fs.readFile(path.join(DIR_SPEC, `${specName}${STUB_EXT}`), "utf-8")
      : Promise.resolve("")
  ]).then(([specContent, stubContent]) => {
    res.json({
      data: {
        content: specContent,
        stub: stubContent
      }
    });
    res.end();
  });
});

route.post("/:specName", (req, res) => {
  const specName = req.params.specName;
  const content = req.body.content;
  const stub = req.body.stub;

  const specPath = path.join(DIR_SPEC, `${specName}${YAML_EXT}`);
  const stubPath = path.join(DIR_SPEC, `${specName}${STUB_EXT}`);

  Promise.all([
    fs.writeFile(specPath, content, { encoding: "utf-8" }),
    fs.writeFile(stubPath, stub, { encoding: "utf-8" })
  ]).then(() => {
    res.json({
      data: {
        specName
      }
    });
    res.end();
  });
});

function walkNodePair(nodePair, nodeParts) {
  if (nodeParts.length === 0) {
    return nodePair;
  }
  const nodeValue = nodePair[1];
  const foundNode = nodeValue.value.find(n => n[0].value === nodeParts[0]);
  return walkNodePair(foundNode, nodeParts.slice(1));
}

function getNodePosition(ast, nodePath) {
  const parts = nodePath.split(":");

  return walkNodePair([null, ast], parts);
}

function writeStubId2SwaggerSpec(stubIds, specPath) {
  return fs
    .readFile(specPath, "utf8")
    .then(yamlText => {
      const astObj = YAML.compose(yamlText);
      const nodes = stubIds.map(sid => getNodePosition(astObj, sid.path));

      yamlLines = yamlText.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/g);
      indentSpace = 2;

      nodes.forEach((node, index) => {
        const nName = node[0];
        const nVal = node[1];
        const { line } = nVal.end_mark;
        const { column } = nName.start_mark;

        yamlLines.splice(
          line + index,
          0,
          repeat(" ", column + indentSpace) +
            `x-mb-auto-stub-id: ${stubIds[index].stubId}`
        );
      });
      return yamlLines;
    })
    .then(yamlLines => {
      return fs.writeFile(specPath, yamlLines.join("\n"), {
        encoding: "utf-8"
      });
    })
    .then(() => yamlLines.join("\n"));
}
route.get("/:specName/mb-exec", (req, res) => {
  const specName = req.params.specName;
  const specPath = path.join(DIR_SPEC, `${specName}${YAML_EXT}`);
  const stubPath = path.join(DIR_SPEC, `${specName}${STUB_EXT}`);

  const stubContent = fs.readFileSync(stubPath, { encoding: "utf-8" });

  const api = new SwaggerBank.API(path.normalize(specPath));

  let startMbServer = null;
  if (mbServer === null) {
    startMbServer = mountebankHelper.startMbServer(2525).then(server => {
      console.info("mb server started...");
      mbServer = server;
    });
  } else {
    startMbServer = Promise.resolve("done");
  }

  startMbServer
    .then(() => api.validateAPI())
    .then(async specObj => {
      const imposterPortNumber = !isNaN(req.query.mbPort)
        ? parseInt(req.query.mbPort)
        : specObj["x-mb-port"];
      console.info("starting mock server...");

      const Imposter = new mountebankHelper.Imposter({
        imposterPort: imposterPortNumber
      });

      if (existedMBPorts.system.indexOf(imposterPortNumber) === -1) {
        existedMBPorts.system.push(imposterPortNumber);
      }

      console.log(
        `[SWAGGER-BANK] Using ${(process.env.PROP_GEN === undefined
          ? "random"
          : process.env.PROP_GEN
        ).toUpperCase()} property generation when creating response`
      );

      let allResponses = [];

      try {
        allResponses = await api.getAllResponsesForApi();
      } catch (err) {
        // console.error(err);
        throw err;
      }

      allResponses.forEach(function(element) {
        Imposter.addRoute(element);
      });

      const stubs = Imposter.getMountebankResponse().stubs;

      // pretty body
      let prettyStubs = stubs.map(el =>
        Object.assign({}, el, {
          responses: el.responses.map(res => {
            res.is.body = JSON.parse(res.is.body);
            return res;
          })
        })
      );

      let $action = migrateStub(prettyStubs, stubContent);

      $action = $action.then(prettyStubs => {
        return fs.writeFile(
          path.join(stubPath),
          JSON.stringify(prettyStubs, null, 2),
          {
            encoding: "utf-8"
          }
        );
      });

      $action = $action.then(() => Imposter._deleteOldImposter());
      $action = $action
        .then(updatedSpec =>
          fs.exists(stubPath).then(fileExists => {
            if (fileExists) {
              return Promise.all([
                Promise.resolve(updatedSpec),
                fs.readFile(path.resolve(stubPath), {
                  encoding: "utf-8"
                })
              ]);
            } else {
              return Promise.all([
                Promise.resolve(updatedSpec),
                Promise.resolve("[]")
              ]);
            }
          })
        )
        .then(([spec, strStub]) => [spec, JSON.parse(strStub)]);

      $action = $action.then(([updatedSpec, currentStub]) => {
        const mbStubs = clone(currentStub).map(s =>
          Object.assign({}, s, {
            responses: (s.responses || []).map(res => {
              res.is.body = JSON.stringify(res.is.body);
              return res;
            })
          })
        );
        return Imposter.postToMountebank(mbStubs)
          .then(responseBody => {
            console.log(
              `[SWAGGER-BANK] SUCCESS: Your Imposter is now listening!! Use localhost:${imposterPortNumber}${api.getApiBasePath()} to start testing your swagger routes`
            );
            return {
              mockHostUrn: `/mb/${imposterPortNumber}`,
              updatedSpec
            };
          })
          .catch(error => {
            console.log("Error from postToMountebank: ");
            console.log(error);
          });
      });

      return $action;
    })
    .then(result => {
      res.json({
        data: result
      });
      res.end();
    })
    .catch(err => {
      console.error(err);
    });
});

route.post("/:specName/mb-exec-next", (req, res) => {
  const specName = req.params.specName;
  const sessionId = req.body.sessionId || shortid.generate();
  const specContent = req.body.specContent;
  const stubContent = req.body.stubContent;

  if (!specContent) {
    const specPath = path.join(DIR_SPEC, `${specName}${YAML_EXT}`);
    const stubPath = path.join(DIR_SPEC, `${specName}${STUB_EXT}`);
    specContent = fs.readFileSync(specPath, { encoding: "utf-8" });
    stubContent = fs.readFileSync(stubPath, { encoding: "utf-8" });
  }

  let mbPort;
  if (existedMBPorts[sessionId]) {
    mbPort = existedMBPorts[sessionId][0];
  } else {
    mbPort = pickNewPort();
    existedMBPorts[sessionId] = [mbPort];
  }

  const api = new SwaggerBank.API(YAML.load(specContent));

  let startMbServer = null;
  if (mbServer === null) {
    startMbServer = mountebankHelper.startMbServer(2525).then(server => {
      console.info("mb server started...");
      mbServer = server;
    });
  } else {
    startMbServer = Promise.resolve("done");
  }

  startMbServer
    .then(() => api.validateAPI())
    .then(async specObj => {
      const imposterPortNumber = mbPort;
      console.info("starting mock server...");

      const Imposter = new mountebankHelper.Imposter({
        imposterPort: imposterPortNumber
      });

      existedMBPorts[sessionId] = [mbPort];

      console.log(
        `[SWAGGER-BANK] Using ${(process.env.PROP_GEN === undefined
          ? "random"
          : process.env.PROP_GEN
        ).toUpperCase()} property generation when creating response`
      );

      let allResponses = [];

      try {
        allResponses = await api.getAllResponsesForApi();
      } catch (err) {
        // console.error(err);
        throw err;
      }

      allResponses.forEach(function(element) {
        Imposter.addRoute(element);
      });

      const stubs = Imposter.getMountebankResponse().stubs;

      // pretty body
      let prettyStubs = stubs.map(el =>
        Object.assign({}, el, {
          responses: el.responses.map(res => {
            res.is.body = JSON.parse(res.is.body);
            return res;
          })
        })
      );

      let $action = migrateStub(prettyStubs, stubContent);

      $action = $action.then(migratedStub =>
        Promise.all([
          Promise.resolve(migratedStub),
          Imposter._deleteOldImposter()
        ])
      );
      $action = $action.then(([migratedStub]) => [specContent, migratedStub]);

      $action = $action.then(([updatedSpec, currentStub]) => {
        const mbStubs = clone(currentStub).map(s =>
          Object.assign({}, s, {
            responses: (s.responses || []).map(res => {
              res.is.body = JSON.stringify(res.is.body);
              return res;
            })
          })
        );
        return Imposter.postToMountebank(mbStubs)
          .then(responseBody => {
            console.log(
              `[SWAGGER-BANK] SUCCESS: Your Imposter is now listening!! Use localhost:${imposterPortNumber}${api.getApiBasePath()} to start testing your swagger routes`
            );
            return {
              mockHostUrn: `/mb/${imposterPortNumber}`,
              updatedSpec,
              updatedStub: JSON.stringify(currentStub, null, 2)
            };
          })
          .catch(error => {
            console.log("Error from postToMountebank: ");
            console.log(error);
          });
      });

      return $action;
    })
    .then(result => {
      res.json({
        data: result
      });
      res.end();
    })
    .catch(err => {
      console.error(err);
    });
});

route.post("/:specName/generate-mock-responses", (req, res) => {
  const specName = req.params.specName;
  const specPath = path.join(DIR_SPEC, `${specName}${YAML_EXT}`);

  let specObj = null;
  if (req.body.spec) {
    specObj = YAML.load(req.body.spec);
  } else {
    specObj = YAML.load(fs.readFileSync(specPath, { encoding: "utf8" }));
  }
  const { route, verb, status } = req.body.responsePath;
  const api = new SwaggerBank.API(path.normalize(specPath));

  Swagger.resolveSubtree(specObj, [
    "paths",
    route,
    verb,
    "responses",
    status.toString()
  ])
    .then(result => result.spec)
    .then($ref => {
      console.info($ref);
      const responseManager = api.responseManager;
      const referencedTemplate = api.constructTemplateForRef(
        $ref.content['application/json'].schema,
        "property"
      );
      let populatedTemplate = responseManager.populateTemplate(
        referencedTemplate
      );
      const cr = responseManager.constructCompleteResponse({
        uri: "",
        method: verb,
        statusCode: status,
        populatedTemplate,
        extras: {
          "x-swagger-path": route
        }
      });

      const stubResponses = [
        {
          is: {
            statusCode: cr.res.statusCode,
            headers: cr.res.responseHeaders,
            body: JSON.parse(cr.res.responseBody)
          }
        }
      ];

      res.json({
        data: {
          responses: stubResponses,
          responsePath: { route, verb, status }
        }
      });
      res.end();
    });
});

route.post("/:specName/user-login", (req, res) => {
  const specName = req.params.specName;
  const secretPath = path.join(DIR_SPEC, `${specName}${SECRET_EXT}`);

  const { username, password, redirectUrl } = req.body;

  const config = JSON.parse(fs.readFileSync(secretPath, { encoding: "utf-8" }));
  const authorizationToken = Buffer.from(
    [config.oauthClientId, config.oauthSecret].join(":")
  ).toString("base64");

  fetch(
    `${
      config.oauthLoginUrl
    }?grant_type=password&username=${username}&password=${password}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorizationToken}`,
        "Content-Type": "application/json"
      }
    }
  )
    .then(response => {
      // console.info(response);
      return response.json();
    })
    .then(result => {
      // console.info(result);
      res.json(result);
      // res.json({
      //   user_name: 'test',
      //   user_id: 12345,
      //   access_token: '1345-8dfjdap fpeuwr dfadjf',
      // })
      res.end();
    })
    .catch(err => {
      console.info(err);
    });
});

route.get("/:specName/test", (req, res) => {
  const specName = req.params.specName;
  const specPath = path.join(DIR_SPEC, `${specName}${YAML_EXT}`);

  const Dredd = require("dredd");
  const EventEmitter = require("events");

  const emitter = new EventEmitter();
  const testFailure = [];
  emitter.on("test fail", test => {
    testFailure.push(test);
  });

  const dredd = new Dredd({
    server: "petstore.swagger.io",
    options: {
      path: [specPath],
      level: "verbose"
    },
    emitter
  });

  dredd.run((err, stats) => {
    res.json({
      data: {
        stats,
        testFailure
      },
      error: err
    });
    res.end();
  });
});

function pickNewPort() {
  const allPorts = Array.prototype.concat.apply(
    [],
    map(existedMBPorts, ports => ports)
  );
  const maxPort = max(allPorts);

  return maxPort + 1;
}

module.exports = route;
