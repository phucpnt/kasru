import lf from "localforage";
import { API_HOST } from "../global-vars";
import { Map, fromJS } from "immutable";
import debounce from "lodash/debounce";

const burstCache = () =>
  Math.random()
    .toString()
    .slice(2);

function getSpecFromUserGist(gistId) {
  return lf.getItem("swmb/connect").then(connect => {
    return connect && connect.github ? connect.github.token : null;
  }).then(userToken => {
    return fetch(`https://api.github.com/gists/${gistId}?${burstCache()}`, {
      headers: {
        Authorization: `Token ${userToken}`
      }
    })
      .then(res => res.json())
      .then(result => {
        const specData = {};
        Object.keys(result.files).forEach(fname => {
          if (
            fname.indexOf("spec.yaml") > -1 ||
            fname.indexOf("spec.yml") > -1
          ) {
            specData.content = result.files[fname].content;
          }
          if (fname.indexOf("stub.json") > -1) {
            specData.stub = result.files[fname].content;
          }
        });
        return { data: specData };
      });
  });
}

function getSpecFromServer(specName) {
  return fetch(
    [`${API_HOST}/swagger-spec/${specName}`, burstCache()].join("?")
  ).then(res => res.json());
}

function getSpec(specName) {
  if (specName.indexOf("gist:") === 0) {
    return getSpecFromUserGist(specName.replace("gist:", ""));
  } else {
    return getSpecFromServer(specName);
  }
}

export default function definePlugin({ getSystem }) {
  const statePlugins = {
    swmb: {
      actions: {
        registerSession() {
          return system => {
            lf.getItem("swmb/connect").then(connect => {
              system.swmbActions.connectSocial_success(connect);
            });
            lf.getItem("swmb").then(swmb => {
              if (swmb === null) {
                swmb = {};
              }
              const { sessionId: session } = swmb;
              const urls = [`${API_HOST}/swagger-spec/register-session`];
              if (session) {
                urls.push(`mbSession=${session}`);
              }
              fetch(urls.join("?"))
                .then(response => response.json())
                .then(result => {
                  lf.getItem("swmb").then(swmb => {
                    let updatedSwmb = Object.assign({}, swmb, result.data);
                    return lf.setItem("swmb", updatedSwmb);
                  });
                  system.swmbActions.registerSession_success(result.data);
                });
            });
          };
        },
        registerSession_success({ sessionId, mbPort }) {
          return {
            type: "SWMB/SWMB/SESSION",
            payload: { sessionId, mbPort }
          };
        },
        rehydrate(specName) {
          return system => {
            lf.getItem(`swmb/${specName}`).then(swmb => {
              if (!swmb || !swmb.specContent) {
                return system.swmbActions.persistFromUpstream(specName);
              }
              const {
                specContent,
                stubContent,
                tests,
                testResults,
                testMeta,
                testWatchlist
              } = swmb;
              system.specActions.updateSpec(specContent);
              system.specActions.fetchRemoteContent_success(specName, {
                content: specContent,
                stub: stubContent
              });
              system.stubActions.fetchRemoteContent_success(specName, {
                spec: specContent,
                stub: stubContent
              });
              system.testActions.fetchRemoteContent_success(specName, {
                tests: tests || [],
                testResults: testResults || [],
                testMeta: testMeta || {},
                testWatchlist: testWatchlist || []
              });
              system.swmbActions.checkUpstreamChange(specName);
            });
          };
        },
        persistFromUpstream(specName) {
          return system => {
            return getSpec(specName).then(result => {
              const upstreamSpec = result.data.content;
              const upstreamStub = result.data.stub;
              const upstreamTest = result.data.test;
              lf.setItem(`swmb/${specName}/0`, {
                specContent: upstreamSpec,
                stubContent: upstreamStub,
                tests: upstreamTest
              })
                .then(() => {
                  return lf.getItem(`swmb/${specName}`).then(data => {
                    return lf.setItem(`swmb/${specName}`, {
                      ...data,
                      specContent: upstreamSpec,
                      stubContent: upstreamStub,
                      tests:
                        upstreamTest || (data && data.tests) ? data.tests : []
                    });
                  });
                })
                .then(() => {
                  return system.swmbActions.rehydrate(specName);
                });
            });
          };
        },
        checkUpstreamChange(specName) {
          return system => {
            return getSpec(specName).then(result => {
              const upstreamSpec = result.data.content;
              const upstreamStub = result.data.stub;
              const upstreamChanged = { spec: false, stub: false };
              lf.getItem(`swmb/${specName}/0`).then(swmb => {
                if (!swmb) {
                  swmb = {};
                }
                const { specContent, stubContent } = swmb;
                if (upstreamSpec !== specContent) {
                  upstreamChanged.spec = true;
                }
                if (upstreamStub !== stubContent) {
                  upstreamChanged.stub = true;
                }
                system.swmbActions.notifyUpstreamChange(
                  specName,
                  upstreamChanged
                );
              });
            });
          };
        },
        persist: () => {
          return debounce(system => {
            const specName = system.specSelectors.specName();
            if (specName) {
              const specContent = system.specSelectors.specStr();
              const stubContent = JSON.stringify(
                system.stubSelectors
                  .stubs()
                  .map(stub => stub.remove("uniqueKey").remove("originIndex")),
                null,
                2
              );
              const tests = system.testSelectors.tests();
              const testResults = system.testSelectors.results();
              const testMeta = system.testSelectors.meta();
              const testWatchlist = system.testSelectors.watchlist();

              lf.getItem("swmb").then(swmb => {
                lf.setItem("swmb", Object.assign({}, swmb, { specName }));
              });
              lf.setItem(`swmb/${specName}`, {
                specName,
                specContent,
                stubContent,
                tests: tests.toJS(),
                testResults: testResults.toJS(),
                testMeta: testMeta.toJS(),
                testWatchlist: testWatchlist.toJS(),
                updatedAt: new Date()
              });
            }
          }, 700);
        },
        notifyUpstreamChange(specName, upstreamChanged) {
          return {
            type: "SWMB/SWMB/NOTIFY_UPSTREAM_CHANGE",
            payload: { specName, update: upstreamChanged }
          };
        },
        notifyUpstreamDismiss(specName, upstreamChanged) {
          return {
            type: "SWMB/SWMB/NOTIFY_UPSTREAM_DISMISS"
          };
        },
        connectSocial({ provider, token }) {
          return system => {
            return lf
              .getItem("swmb/connect")
              .then((val = {}) => {
                const connect = Object.assign({}, val, {
                  [provider]: {
                    token,
                    connected: true
                  }
                });
                return lf.setItem("swmb/connect", connect);
              })
              .then(() => lf.getItem("swmb/connect"))
              .then(connect => {
                system.swmbActions.connectSocial_success(connect);
              });
          };
        },
        connectSocial_success(connect) {
          return {
            type: "SWMB/SWMB/CONNECT_SOCIAL",
            payload: connect
          };
        }
      },
      reducers: {
        "SWMB/SWMB/SESSION": (state = {}, action) => {
          const { sessionId, mbPort } = action.payload;
          return state.set("sessionId", sessionId).set("mbPort", mbPort);
        },
        "SWMB/SWMB/NOTIFY_UPSTREAM_CHANGE": (state = {}, action) => {
          const {
            spec: updatedSpec,
            stub: updatedStub
          } = action.payload.update;
          return state.set(
            "upstreamNotify",
            new Map({
              display: updatedSpec || updatedStub,
              havingUpdate: updatedSpec || updatedStub,
              ...action.payload.update
            })
          );
        },
        "SWMB/SWMB/NOTIFY_UPSTREAM_DISMISS": (state, action) => {
          return state.updateIn(["upstreamNotify"], notify =>
            notify.set("display", false)
          );
        },
        "SWMB/SWMB/CONNECT_SOCIAL": (state, action) => {
          return state.set("connect", fromJS(action.payload));
        }
      },
      selectors: {
        session(state) {
          return state.get("sessionId");
        },
        upstreamNotify(state) {
          return state.get("upstreamNotify", new Map({ display: false }));
        },
        connectSocial(state, provider) {
          return state.getIn(
            ["connect", provider],
            fromJS({
              connected: false,
              token: null
            })
          );
        }
      }
    },
    test: {
      wrapActions: {
        add: persistTrigger(),
        remove: persistTrigger(),
        run_success: persistTrigger(),
        update: persistTrigger(),
        setHost: persistTrigger(),
        watch: persistTrigger(),
        unwatch: persistTrigger()
      }
    }
  };

  function persistTrigger() {
    return (oAction, system) => (...args) => {
      oAction(...args);
      return system.swmbActions.persist();
    };
  }

  return { statePlugins };
}
