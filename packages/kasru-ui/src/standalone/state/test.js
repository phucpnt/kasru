import { List, Map, fromJS } from "immutable";
import { validate } from "../utils/validate";
import { stat } from "fs";

const ATP = "SWMB/TEST"; // action type prefix

export default function statePlugins({ getSystem }) {
  const statePlugins = {
    test: {
      actions: {
        setHost(host) {
          return {
            type: "SWMB/TEST/SET_HOST",
            payload: { host }
          };
        },
        add(
          testSpec = {
            urn: null,
            method: null,
            params: null,
            headers: null,
            body: null,
            description: null,
            status: "200",
            strategy: null
          }
        ) {
          return {
            type: "SWMB/TEST/ADD",
            payload: testSpec
          };
        },
        update(
          uniqueId,
          testSpec = {
            urn: null,
            method: null,
            params: null,
            headers: null,
            body: null,
            description: null,
            status: "200",
            strategy: null
          }
        ) {
          return {
            type: "SWMB/TEST/UPDATE",
            payload: { uniqueId, updates: testSpec }
          };
        },
        remove(uniqueId) {
          return {
            type: "SWMB/TEST/REMOVE",
            payload: uniqueId
          };
        },
        run(uniqueId, testSpec) {
          return system => {
            let testCase = system.testSelectors
              .tests()
              .find(test => test.get("uniqueId").toString() === uniqueId);
            testCase = testCase.merge(testSpec);
            const host = system.testSelectors.host();

            system.testActions.update(uniqueId, testCase);
            system.testActions.run_inprogress(uniqueId);
            validate(
              {
                host,
                ...testCase.toJS()
              },
              system.specSelectors.specJson().toJS()
            ).then(result => {
              system.testActions.run_success(uniqueId, result);
            });
          };
        },
        run_success(uniqueId, result) {
          return {
            type: "SWMB/TEST/RUN_SUCCESS",
            payload: { uniqueId, result }
          };
        },
        run_inprogress(uniqueId) {
          return {
            type: "SWMB/TEST/RUN_INPROGRESS",
            payload: { uniqueId }
          };
        },
        fetchRemoteContent_success(
          specName,
          { tests, testResults, testMeta, testWatchlist }
        ) {
          return {
            type: "SWMB/TEST/FETCH_REMOTE_CONTENT_SUCCESS",
            payload: { specName, tests, testResults, testMeta, testWatchlist }
          };
        },
        watch(uniqueId) {
          return system => {
            system.testActions.watch_success(uniqueId);
            system.testActions.run(uniqueId);
          };
        },
        watch_success(uniqueId) {
          return {
            type: `${ATP}/WATCH_SUCCESS`,
            payload: { uniqueId }
          };
        },
        unwatch(uniqueId) {
          return {
            type: `${ATP}/WATCH_REMOVE`,
            payload: { uniqueId }
          };
        },
        move({ oldIndex, newIndex }) {
          return {
            type: `${ATP}/MOVE`,
            payload: { oldIndex, newIndex }
          };
        }
      },
      reducers: {
        "SWMB/TEST/ADD": (state, action) => {
          let cList = state.get("tests", new List());
          cList = cList.push(
            fromJS(action.payload).set("uniqueId", Date.now().toString())
          );
          return state.set("tests", cList);
        },
        "SWMB/TEST/UPDATE": (state, action) => {
          const { uniqueId, updates } = action.payload;
          const updateIndex = state
            .get("tests")
            .findIndex(test => test.get("uniqueId") === uniqueId);
          return state.updateIn(["tests", updateIndex], test =>
            test.merge(updates)
          );
        },
        "SWMB/TEST/REMOVE": (state, action) => {
          const id = action.payload;
          const foundIndex = state
            .get("tests")
            .findIndex(test => test.get("uniqueId") === id);
          return state
            .updateIn(["tests"], tests => tests.remove(foundIndex))
            .updateIn(["results"], results => results.remove(id))
            .updateIn(["watchlist"], tests => tests.remove(id));
        },
        [`${ATP}/RUN_SUCCESS`]: (state, action) => {
          let testResults = state.get("results", new Map());
          const { uniqueId, result } = action.payload;
          testResults = testResults.set(
            uniqueId.toString(),
            fromJS({ result: result, time: new Date() })
          );
          return state.set("results", testResults).update("tests", tests => {
            const fi = tests.findIndex(t => t.get("uniqueId") === uniqueId);
            return tests.set(fi, tests.get(fi).set("isRunning", false));
          });
        },
        [`${ATP}/RUN_INPROGRESS`]: (state, action) => {
          const { uniqueId } = action.payload;
          return state.update("tests", tests => {
            const fi = tests.findIndex(t => t.get("uniqueId") === uniqueId);
            return tests.set(fi, tests.get(fi).set("isRunning", true));
          });
        },
        "SWMB/TEST/FETCH_REMOTE_CONTENT_SUCCESS": (state, action) => {
          const {
            tests,
            testResults,
            testMeta,
            testWatchlist
          } = action.payload;
          let nuState = state;
          if (tests) {
            nuState = nuState.set("tests", fromJS(tests));
          }
          if (testResults) {
            nuState = nuState.set("results", fromJS(testResults));
          }
          if (testMeta) {
            nuState = nuState.set("meta", fromJS(testMeta));
          }
          if (testWatchlist) {
            nuState = nuState.set("watchlist", fromJS(testWatchlist));
          }
          return nuState;
        },
        "SWMB/TEST/SET_HOST": (state, action) => {
          const { host } = action.payload;
          const meta = state.get("meta", new Map());
          return state.set("meta", meta.set("host", host));
        },
        [`${ATP}/WATCH_SUCCESS`]: (state, action) => {
          const { uniqueId } = action.payload;
          let watchlist = state.get("watchlist", new Map());
          watchlist = watchlist.set(uniqueId.toString(), true);
          return state.set("watchlist", watchlist);
        },
        [`${ATP}/WATCH_REMOVE`]: (state, action) => {
          const { uniqueId } = action.payload;
          let watchlist = state.get("watchlist", new Map());
          watchlist = watchlist.remove(uniqueId.toString());
          return state.set("watchlist", watchlist);
        },
        [`${ATP}/MOVE`]: (state, action) => {
          const { oldIndex, newIndex } = action.payload;
          let tests = state.get("tests");
          const test = tests.get(oldIndex);
          tests = tests.remove(oldIndex).splice(newIndex, 0, test);
          return state.set("tests", tests);
        }
      },
      selectors: {
        tests(state) {
          return state.get("tests", new List());
        },
        results(state) {
          return state.get("results", new Map());
        },
        get(state, index) {
          return state.get("tests").get(index);
        },
        getById(state, id) {
          return state.get("tests").find(test => test.get("uniqueId") === id);
        },
        getTestResult(state, id) {
          return state.get("results", new Map()).get(id.toString(), undefined);
        },
        host(state) {
          return state.getIn(["meta", "host"]);
        },
        meta(state) {
          return state.get("meta", new Map());
        },
        watchlist(state) {
          return state.get("watchlist", new Map());
        },
        isInWatchlist(state, uniqueId) {
          return state.get("watchlist", new Map()).has(uniqueId.toString());
        }
      }
    }
  };
  return { statePlugins };
}
