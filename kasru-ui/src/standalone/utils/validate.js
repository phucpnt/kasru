import Ajv from "ajv";
import Swagger from "swagger-client";
import trimEnd from "lodash/trimEnd";
import trimStart from "lodash/trimStart";
import clone from "lodash/cloneDeep";
import { RegExifyURL } from "./urlManager";
import qs from "query-string";

export default function validateData(schema, data) {
  const ajv = new Ajv({ allErrors: true });
  ajv.addFormat("int64", number => {
    return !isNaN(number);
  });
  const validate = ajv.compile(schema);

  const valid = validate(data);
  if (valid) {
    return true;
  } else {
    return {
      errors: validate.errors,
      errorText: ajv.errorsText(validate.errors, {
        separator: "\n",
        dataVar: "response"
      })
    };
  }
}

export function pickSpecPath(spec, { method, urn }) {
  const regexPaths = Object.keys(spec.paths)
    .filter(path => spec.paths[path][method.toLowerCase()])
    .map(path => {
      const availParams = [].concat(
        spec.paths[path].parameters || [],
        spec.paths[path][method.toLowerCase()].parameters || []
      );
      const regexPathStr = RegExifyURL(path, availParams);
      return {
        regex: new RegExp(regexPathStr),
        specPath: path,
        params: availParams,
        specRes: clone(spec.paths[path][method.toLowerCase()])
      };
    });

  const match = regexPaths.find(rp => rp.regex.test(urn));

  return match;
}

export function validate(request, spec) {
  const {
    host,
    urn,
    method,
    headers,
    httpStatus = "200",
    body,
    params
  } = request;

  let $chain = Promise.all(
    Object.keys(spec.paths)
      .filter(path => spec.paths[path][method.toLowerCase()])
      .map(path => {
        console.info(
          method,
          spec.paths[path].parameters || [],
          spec.paths[path][method.toLowerCase()].parameters || []
        );
        const regexPathStr = RegExifyURL(
          path,
          [].concat(
            spec.paths[path].parameters || [],
            spec.paths[path][method.toLowerCase()].parameters || []
          )
        );
        return Swagger.resolveSubtree(spec, [
          "paths",
          path,
          method.toLowerCase(),
          "responses",
          httpStatus
        ]).then(schema => {
          return {
            path,
            pattern: new RegExp(regexPathStr),
            schema
          };
        });
      })
  );

  return $chain.then(regexifyPaths => {
    const matchPathSchema = regexifyPaths.find(item => item.pattern.test(urn));

    let url = [trimEnd(host, "/"), trimStart(urn, "/")].join("/");
    if (Object.keys(params || {}).length > 0) {
      url += "?" + qs.stringify(params);
    }

    return fetch(url, {
      headers,
      method,
      body: JSON.stringify(body)
    })
      .then(response =>
        Promise.all([
          response.json(),
          Promise.resolve(response.headers),
          Promise.resolve(response.status)
        ])
      )
      .then(([result, headers, status]) => {
        let headersObj = {};
        for (const pair of headers.entries()) {
          headersObj[pair[0]] = pair[1];
        }

        const schema = markSpecAttrRequire(
          clone(matchPathSchema.schema.spec.schema)
        );
        const testResult = validateData(schema, result);
        // console.info({ testResult, body: result, headers: headersObj, status });
        return { testResult, bodyJson: result, headers: headersObj, status };
      });
  });
}

// NOTICE: this function relying on the mutable JS object
function markSpecAttrRequire(schema) {
  if (schema.type === "object") {
    const requiredFields = Object.keys(schema.properties);
    schema.required = requiredFields;
    requiredFields.forEach(field =>
      markSpecAttrRequire(schema.properties[field])
    );
  }
  return schema;
}
