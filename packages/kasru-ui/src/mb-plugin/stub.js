import { List, fromJS, Map } from "immutable";
import { API_HOST } from "../swagger-plugins/global-vars";

const burstCache = () =>
  Math.random()
    .toString()
    .slice(2);

export default function getStubState({ getSystem }) {
  function reconstructStubsByPath(stubs) {
    let stubsByPath = new Map();
    const specJson = getSystem().specSelectors.specJson();
    specJson
      .get("paths")
      .keySeq()
      .forEach(path => {
        stubsByPath = stubsByPath.set(path, new List());
      });

    stubs.forEach(stub => {
      const path = stub.get("x-swagger-path");
      stubsByPath = stubsByPath.update(path, stubs => {
        return stubs ? stubs.push(stub) : new List([stub]);
      });
    });
    return stubsByPath;
  }

  return {
    actions: {
      fetchRemoteContent_success(specName, { stub, spec }) {
        return {
          type: "SWMB/STUB/FETCH_SUCCESS",
          payload: { stub, spec, specName }
        };
      },
      updateJsonSpec(jsonSpec) {
        return {
          type: "SWMB/STUB/UPDATE_JSON_SPEC",
          payload: { jsonSpec }
        };
      },
      addStub(swaggerPath, { predicates, responses }) {
        return system => {
          system.stubActions.addStub_state(swaggerPath, {
            predicates,
            responses
          });
          system.swmbActions.persist();
        };
      },
      addStub_state(swaggerPath, { predicates, responses }) {
        return {
          type: "SWMB/STUB/ADD",
          payload: { swaggerPath, predicates, responses }
        };
      },
      generateStub(swaggerPath, stubIndex) {
        return system => {
          const specName = system.specSelectors.specName();
          const currentSpec = system.specSelectors.specStr();
          return fetch(
            [
              `${API_HOST}/swagger-spec/${specName}/generate-mock-responses`,
              burstCache()
            ].join("?"),
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                spec: currentSpec,
                responsePath: {
                  route: swaggerPath,
                  verb: "get",
                  status: 200
                }
              })
            }
          )
            .then(response => response.json())
            .then(result => {
              system.stubActions.generateStub_success({
                swaggerPath,
                stubIndex,
                responses: result.data.responses,
                responsePath: result.data.responsePath
              });
              system.swmbActions.persist();
            });
        };
      },
      generateStub_success({
        swaggerPath,
        stubIndex,
        responses,
        responsePath
      }) {
        return {
          type: "SWMB/STUB/GENERATE_SUCCESS",
          payload: {
            swaggerPath,
            stubIndex,
            responses,
            responsePath
          }
        };
      },
      removeStub(swaggerPath, stubIndex) {
        return system => {
          system.stubActions.removeStub_state(swaggerPath, stubIndex);
          system.swmbActions.persist();
        };
      },
      removeStub_state(swaggerPath, stubIndex) {
        return {
          type: "SWMB/STUB/REMOVE",
          payload: { stubIndex, swaggerPath }
        };
      },
      updateStub(swaggerPath, index, { predicates, responses }) {
        return system => {
          system.stubActions.updateStub_state(swaggerPath, index, {
            predicates,
            responses
          });
          system.swmbActions.persist();
        };
      },
      updateStub_state(swaggerPath, index, { predicates, responses }) {
        return {
          type: "SWMB/STUB/UPDATE",
          payload: { stubIndex: index, predicates, responses, swaggerPath }
        };
      },
      changeOrder(swaggerPath, stubIndex, direction) {
        return system => {
          system.stubActions.changeOrder_state(
            swaggerPath,
            stubIndex,
            direction
          );
          system.swmbActions.persist();
        };
      },
      changeOrder_state(swaggerPath, stubIndex, direction) {
        return {
          type: "SWMB/STUB/CHANGE_ORDER",
          payload: { stubIndex, swaggerPath, direction }
        };
      }
    },
    reducers: {
      "SWMB/STUB/FETCH_SUCCESS": (state, action) => {
        let stubs = fromJS(JSON.parse(action.payload.stub));
        if (List.isList(stubs)) {
          stubs = new Map();
        }
        const stubsByPath = stubs;
        const nuState = state.set("stubsByPath", stubsByPath);
        return nuState;
      },
      "SWMB/STUB/UPDATE_JSON_SPEC": (state, action) => {
        let stubs = state.get("stubsByPath", new Map());
        Object.keys(action.payload.jsonSpec.paths || {}).forEach(path => {
          if (!stubs.has(path)) {
            stubs = stubs.set(path, fromJS([]));
          }
        });
        return state.set("stubsByPath", stubs);
      },
      "SWMB/STUB/REMOVE": (state, action) => {
        const { stubIndex, swaggerPath } = action.payload;
        return state.updateIn(["stubsByPath", swaggerPath], stubs =>
          stubs.remove(stubIndex)
        );
      },
      "SWMB/STUB/ADD": (state, action) => {
        const { swaggerPath, predicates, responses } = action.payload;
        let stub = fromJS({
          uniqueKey: Date.now().toString(),
          predicates,
          responses
        });

        return state.updateIn(["stubsByPath", swaggerPath], ss =>
          (ss || List()).push(stub)
        );
      },
      "SWMB/STUB/UPDATE": (state, action) => {
        const {
          stubIndex,
          predicates,
          responses,
          swaggerPath
        } = action.payload;
        return state.updateIn(["stubsByPath"], stubs => {
          return stubs.updateIn([swaggerPath, stubIndex], stub =>
            stub
              .set("predicates", fromJS(predicates))
              .set("responses", fromJS(responses))
          );
        });
      },
      "SWMB/STUB/GENERATE_SUCCESS": (state, action) => {
        const { stubIndex, swaggerPath, responses } = action.payload;
        const stub = state
          .get("stubs")
          .get(stubIndex)
          .set("responses", fromJS(responses))
          .set("uniqueKey", Date.now().toString());
        return state
          .updateIn(["stubs"], stubs => stubs.set(stubIndex, stub))
          .updateIn(["stubsByPath", swaggerPath], stubs => {
            const index = stubs.findIndex(
              stub => stub.get("originIndex") === stubIndex
            );
            return stubs.set(index, stub);
          });
      },
      "SWMB/STUB/CHANGE_ORDER": (state, action) => {
        const UP = "up";
        const DOWN = "down";

        const { swaggerPath, stubIndex, direction } = action.payload;
        const sbp = state.get("stubsByPath").get(swaggerPath);
        const groupIndex = sbp.findIndex(
          stub => stub.get("originIndex") === stubIndex
        );

        if (groupIndex === 0 && direction === UP) {
          return state;
        }
        if (groupIndex === sbp.size - 1 && direction === DOWN) {
          return state;
        }

        const nuGroupIndex = direction === UP ? groupIndex - 1 : groupIndex + 1;
        let stub = sbp.get(groupIndex);
        let stubSwap = sbp.get(nuGroupIndex);

        let index = stub.get("originIndex");
        let indexSwap = stubSwap.get("originIndex");

        stub = stub.set("originIndex", indexSwap);
        stubSwap = stubSwap.set("originIndex", index);

        let nuState = state.setIn(
          ["stubsByPath", swaggerPath],
          sbp.set(nuGroupIndex, stub).set(groupIndex, stubSwap)
        );
        return nuState.update("stubs", stubs =>
          stubs.set(index, stubSwap).set(indexSwap, stub)
        );
      }
    },
    selectors: {
      stub: (state, stubIndex) => {
        return state.get("stubs").get(stubIndex);
      },
      stubs: state => {
        return state.get("stubsByPath", new Map());
      },
      getStubsByPath: (state, path) => {
        return state.get("stubsByPath").get(path, List());
      }
    }
  };
}
