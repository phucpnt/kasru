import { List, fromJS, Map, OrderedMap } from "immutable";
import { API_HOST } from "../global-vars";

const burstCache = () =>
  Math.random()
    .toString()
    .slice(2);


export default function getStubState({ getSystem }) {
  function reconstructStubsByPath(stubs) {
    let stubsByPath = new OrderedMap();
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
      removeStub(stubIndex) {
        return system => {
          system.stubActions.removeStub_state(stubIndex);
          system.swmbActions.persist();
        };
      },
      removeStub_state(stubIndex) {
        return {
          type: "SWMB/STUB/REMOVE",
          payload: { stubIndex }
        };
      },
      updateStub(index, { predicates, responses }) {
        return system => {
          system.stubActions.updateStub_state(index, { predicates, responses });
          system.swmbActions.persist();
        };
      },
      updateStub_state(index, { predicates, responses }) {
        return {
          type: "SWMB/STUB/UPDATE",
          payload: { stubIndex: index, predicates, responses }
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
        stubs = stubs.map((stub, index) =>
          stub.set("originIndex", index).set(
            "uniqueKey",
            Math.random()
              .toString()
              .slice(2)
          )
        );
        const stubsByPath = reconstructStubsByPath(stubs);
        const nuState = state
          .set("stubs", stubs)
          .set("stubsByPath", stubsByPath);
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
        const { stubIndex } = action.payload;
        const stubs = state
          .get("stubs")
          .remove(stubIndex)
          .map((stub, index) => stub.set("originIndex", index));

        return state
          .set("stubs", stubs)
          .set("stubsByPath", reconstructStubsByPath(stubs));
      },
      "SWMB/STUB/ADD": (state, action) => {
        const { swaggerPath, predicates, responses } = action.payload;
        let stubs = state.get("stubs");

        let stub = fromJS({
          originIndex: stubs.size,
          uniqueKey: Date.now().toString(),
          "x-swagger-path": swaggerPath,
          predicates,
          responses
        });

        stubs = stubs.push(stub);
        return state.set("stubs", stubs).update("stubsByPath", sbp => {
          return sbp.update(swaggerPath, ss => ss.push(stub));
        });
      },
      "SWMB/STUB/UPDATE": (state, action) => {
        const { stubIndex, predicates, responses } = action.payload;
        const cStub = state.get("stubs").get(stubIndex);
        return state
          .updateIn(["stubs", stubIndex], stub =>
            stub
              .set("predicates", fromJS(predicates))
              .set("responses", fromJS(responses))
          )
          .updateIn(["stubsByPath"], stubs => {
            const ss = stubs.get(cStub.get("x-swagger-path"));
            const gIndex = ss.findIndex(
              s => s.get("originIndex") === stubIndex
            );
            return stubs.updateIn([cStub.get("x-swagger-path"), gIndex], stub =>
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
        return state.get("stubs", new List());
      },
      stubsByPath: state => {
        return state.get("stubsByPath");
      }
    }
  };
}