const path = require("path");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const proxy = require("express-http-proxy");
const http = require("http");
const fs = require("fs-extra");

const routeSwaggerSpec = require("./src/swagger-spec");
const routeConnect = require('./src/connect');
const routeGDrive = require('./src/connect-gdrive');
const { DIR_SPEC, GDRIVE_CLIENT_ID, GDRIVE_API_KEY, GDRIVE_PROJECT_ID } = require("./global-var");

const PORT = process.env.NODE_PORT || 3003;

const app = express();

app.use(cors());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get("/", function(req, res) {
  let pageHtml = fs.readFileSync(path.join(__dirname, "../kasru-ui/build", "index.html"), {encoding: 'utf8'});
  pageHtml = pageHtml.replace('insert_global_variable', `
    window.GDRIVE_CLIENT_ID = "${GDRIVE_CLIENT_ID}";
    window.API_KEY="${GDRIVE_API_KEY}";
    window.PROJ_NUMBER="${GDRIVE_PROJECT_ID}";
  `)
  res.header({'content-type': 'text/html'});
  res.send(pageHtml);
  res.end();
});

app.use(express.static(path.join(__dirname, "../kasru-ui/build")));

if (process.env.NODE_ENV === "development") {
  console.info('simulate delay response...');
  app.use(function delayResponse(req, res, next) {
    setTimeout(() => {
      next();
    }, 300);
  });
}


app.use("/swagger-spec", routeSwaggerSpec);
app.use('/connect', routeConnect);
app.use('/gdrive', routeGDrive);


app.use("/mb/:port(\\d+)", (req, res, next) => {
  const port = req.params.port;
  return proxy(`http://127.0.0.1:${port}`, {
    proxyReqPathResolver(req) {
      return req.path;
    }
  })(req, res, next);
});

app.listen(PORT, "0.0.0.0", () => {
  console.info("Server started on port %s", PORT);
  autoRunMBServer();
});

function autoRunMBServer() {
  // fs.readdir(path.resolve(DIR_SPEC)).then(files => {
  //   specNames = files
  //     .filter(f => path.extname(f) === ".yaml")
  //     .map(f => path.basename(f, ".yaml"));
  //   let $p = Promise.resolve("");
  //   specNames.forEach(specName => {
  //     console.info("auto start", specName);
  //     $p = $p.then(
  //       () =>
  //         new Promise(resolve =>
  //           http.get(
  //             `http://127.0.0.1:${PORT}/swagger-spec/${specName}/mb-exec`,
  //             res => {
  //               resolve();
  //             }
  //           )
  //         )
  //     );
  //   });
  // });
}
