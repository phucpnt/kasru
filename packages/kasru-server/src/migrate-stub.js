const fs = require("fs-extra");
const defaultsDeep = require("lodash/defaultsDeep");

/**
 * WARNING: this function use SHORTCUT as taking advantage of obj mutate in javascript
 */
module.exports.migrateStub = function migrateStub(genStubs, stubContent) {
  const $action = Promise.resolve();

  return $action
    .then(() => {
      return [genStubs, JSON.parse(stubContent)]
    })
    .then(([newStub, currentStub]) => {
      if (currentStub === null) {
        return newStub;
      }

      const genReponses = newStub.reduce((accum, stub) => {
        stub.responses.forEach(response => {
          accum[response.is.headers["x-mb-auto-stub-id"]] = response.is.body;
        });
        return accum;
      }, {});

      // update existing auto generated stub
      const existedStubPath = [];
      const curResponses = currentStub.reduce((accum, stub) => {
        existedStubPath.push(stub['x-swagger-path']);
        const responses = stub.responses || [];
        return accum.concat(
          responses.filter(res => res.is.headers["x-mb-auto-stub-id"])
        );
      }, []);

      curResponses.forEach(res => {
        res.is.body = defaultsDeep(
          res.is.body,
          genReponses[res.is.headers["x-mb-auto-stub-id"]]
        );
      });

      // add new generated stub
      const candidateStubs = newStub.filter(stub => {
        return existedStubPath.indexOf(stub['x-swagger-path']) === -1;
      });

      return [].concat(currentStub, candidateStubs);
    });
}