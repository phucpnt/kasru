import Swagger from "swagger-client";
import parseUrl from "url-parse";
import { createSelector } from "reselect";
import { List, fromJS, OrderedMap } from "immutable";
import qs from "query-string";

import TopbarPlugin from "./topbar";

import StandaloneLayout, { UnitSpecScreen } from "./standalone-layout";
import StubEditorLayout from "./stub-layout";
import TestLayout from "./test-layout";
import SpecLayout from "./spec-layout";
import CustomBaseLayout from "./components/custom-base-layout";

import makeEditor from "./components/stub-editor-next";
import TestEditor from "./components/test-editor";
import { API_HOST } from "./global-vars";
import swmb from "./state/swmb";
import stub from "./state/stub";
import test from "./state/test";
import testSchedule from "./state/test-schedule";
import wrapInfo from "./components/make-info-login-form";
import wrapOperations from "./components/wrap-operation-views";

let StubEditor = makeEditor({
  editorPluginsToRun: ["gutterClick", "pasteHandler"]
});

const burstCache = () =>
  Math.random()
    .toString()
    .slice(2);

let StandaloneLayoutPlugin = function({ getSystem }) {
  const tickets = createSelector(
    state => getSystem().specSelectors.operationsWithRootInherited(),
    ops => {
      const tickets = ops
        .map(op => op.getIn(["operation", "x-tickets"]))
        .flatten()
        .toSet()
        .toList()
        .filter(url => !!url)
        .push("default");
      return tickets;
    }
  );
  const opsByTickets = createSelector(
    tickets,
    state => getSystem().specSelectors.operationsWithRootInherited(),
    (tickets, ops) => {
      return tickets.reduce((accum, url) => {
        const foundOps = ops.filter(op => {
          let tickets = op.getIn(["operation", "x-tickets"]);
          if (!tickets) {
            tickets = List(["default"]);
          }
          return tickets.contains(url);
        });
        if (foundOps) {
          return accum.set(url, accum.get(url, List()).concat(foundOps));
        }
        return accum;
      }, OrderedMap());
    }
  );
  let specEditorInstance = null;

  return {
    wrapComponents: {
      info: wrapInfo,
      operations: wrapOperations
    },
    components: {
      StandaloneLayout,
      StubEditorLayout,
      StubEditor,
      TestLayout,
      TestEditor,
      UnitSpecScreen,
      SpecLayout,
      CustomBaseLayout
    },
    statePlugins: {
      spec: {
        actions: {
          fetchSpecList() {
            return system => {
              fetch([`${API_HOST}/swagger-spec`, burstCache()].join("?"))
                .then(res => res.json())
                .then(result => {
                  system.specActions.fetchSpecListSuccess(result.data);
                });
            };
          },
          fetchSpecListSuccess(data) {
            return {
              type: "SWMB/FETCH_SPEC_LIST_SUCCESSS",
              payload: data
            };
          },
          fetchRemoteContent(specName) {
            return system => {
              system.swmbActions.rehydrate(specName);
            };
          },
          fetchRemoteContent_success(specName, data) {
            return {
              type: "SWMB/FETCH_SPEC_CONTENT_SUCCESSS",
              payload: { data, specName }
            };
          },
          writeRemoteContent(url) {},
          runMBServer(specName, editorContent) {
            return system => {
              system.specActions.runMBServer_loading();
              const stubs = system.stubSelectors
                .stubs()
                .map(stub => stub.remove("uniqueKey").remove("originIndex"));

              return fetch(
                [`${API_HOST}/swagger-spec/${specName}`, burstCache()].join(
                  "?"
                ),
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    content: editorContent.content,
                    stub: JSON.stringify(stubs)
                  })
                }
              )
                .then(() => {
                  return fetch(
                    [
                      `${API_HOST}/swagger-spec/${specName}/mb-exec`,
                      burstCache()
                    ].join("?")
                  );
                })
                .then(response => response.json())
                .then(result => {
                  system.specActions.runMBServer_success(result.data);
                  return system.specActions.fetchRemoteContent(specName);
                });
            };
          },
          runMBServerSession(specName, editorContent) {
            return system => {
              system.specActions.runMBServer_loading();
              const stubs = system.stubSelectors
                .stubs()
                .map(stub => stub.remove("uniqueKey").remove("originIndex"));
              const session = system.swmbSelectors.session();

              return fetch(
                [
                  `${API_HOST}/swagger-spec/${specName}/mb-exec-next`,
                  burstCache()
                ].join("?"),
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    session: session,
                    specContent: editorContent.content,
                    stubContent: JSON.stringify(stubs)
                  })
                }
              )
                .then(response => response.json())
                .then(result => {
                  system.specActions.runMBServer_success({
                    mockHostUrn: result.data.mockHostUrn
                  });
                  const {
                    updatedSpec: specContent,
                    updatedStub: stubContent
                  } = result.data;

                  system.specActions.updateSpec(specContent);
                  system.specActions.fetchRemoteContent_success(specName, {
                    content: specContent,
                    stub: stubContent
                  });
                  system.stubActions.fetchRemoteContent_success(specName, {
                    content: specContent,
                    stub: stubContent
                  });
                });
            };
          },
          runMBServer_loading() {
            return {
              type: "SWMB/RUN_MB_LOADING"
            };
          },
          runMBServer_success(payload) {
            return {
              type: "SWMB/RUN_MB_SUCCESS",
              payload: { mbLoading: false, mockUrn: payload.mockHostUrn }
            };
          },
          setStub(content) {
            return {
              type: "SWMB/SET_STUB",
              payload: content
            };
          }
        },
        reducers: getReducers(),
        selectors: {
          stubStr(state) {
            return state.get("stub", "");
          },
          specName(state) {
            return state.get("specName", undefined);
          },
          isMBLoading(state) {
            return state.get("mbLoading", false);
          },
          mockUrn(state) {
            return state.get("mockUrn", undefined);
          },
          specUpstream(state){
            const specName = state.get('specName');
            let parts = specName.split(':');
            if(parts.length === 1){
              return 'server';
            } else {
              return parts[0];
            }
          },
          tickets,
          opsByTickets
        },
        wrapActions: {
          updateJsonSpec: (origAction, system) => (...args) => {
            system.stubActions.updateJsonSpec(...args);
            system.swmbActions.persist();
            return origAction(...args);
          }
        },
        wrapSelectors: {
          taggedOperations: (orginSel, system) => (...args) => {
            let ops = orginSel(...args);
            const filterTags = system.uiSelectors
              .ops()
              .getIn(["filters", "tags"], new List());
            if (filterTags.size === 0) {
              return ops;
            }
            return ops.filter((obj, tag) =>
              filterTags.some(phrase => tag.indexOf(phrase) > -1)
            );
          }
        }
      },
      ui: {
        actions: {
          switchEditorView(viewName) {
            return {
              type: "SWMB/EDITOR_SWITCH_VIEW",
              payload: { viewName }
            };
          },
          handleLocationChange({ location, match }) {
            const { search } = location;
            return {
              type: "SWMB/UI/URL_CHANGE",
              payload: {
                specName: match.params.specName,
                query: qs.parse(search),
                match,
                location
              }
            };
          },
          toggleVimMode(status = true) {
            if (specEditorInstance && specEditorInstance.setKeyboardHandler) {
              if (status) {
                specEditorInstance.setKeyboardHandler("ace/keyboard/vim");
              } else {
                specEditorInstance.setKeyboardHandler(
                  "ace/keyboard/keybinding"
                );
              }
            }
            return {
              type: "SWMB/UI/UPDATE_VIM_MODE",
              payload: {
                status
              }
            };
          },
          updateOpsFilter(type, value) {
            return {
              type: "SWMB/UI/UPDATE_OPS_FILTER",
              payload: {
                type,
                value
              }
            };
          }
        },
        reducers: {
          "SWMB/EDITOR_SWITCH_VIEW": (state, action) => {
            return state.set("editorView", action.payload.viewName);
          },
          "SWMB/UI/URL_CHANGE": (state, action) => {
            const { specName, query, match, location } = action.payload;
            const nuState = state.merge({
              location,
              match,
              specName,
              ops: fromJS({
                view: query.opsView || "tickets",
                filters: {
                  tickets: (query.tickets || "").split(","),
                  tags: (query.tags || "").split(",")
                }
              })
            });
            return nuState;
          },
          "SWMB/UI/UPDATE_VIM_MODE": (state, action) => {
            return state.set("vimMode", action.payload.status || true);
          },
          "SWMB/UI/UPDATE_OPS_FILTER": (state, action) => {
            const { type, value } = action.payload;
            return state.setIn(["ops", "filters", type], fromJS(value));
          }
        },
        selectors: {
          currentView(state) {
            return state.get("editorView", "spec");
          },
          ops(state) {
            return state.get(
              "ops",
              fromJS({
                view: "tickets",
                filters: { tickets: [], tags: [] }
              })
            );
          },
          url(state) {
            return {
              match: state.get("match"),
              location: state.get("location")
            };
          },
          urlSpecRead(state, query) {
            const curPath = state.getIn(["match", "url"]);
            const specName = state.get("specName");
            let url = window.location.origin + `/#/${specName}/spec_read`;
            url += "?" + qs.stringify(query);
            return url;
          },
        }
      },
      editor: {
        wrapActions: {
          onLoad: (ori, sys) => context => {
            const { editor } = context;
            // Any other calls for editor#onLoad
            ori(context);

            specEditorInstance = editor;
            return;
          }
        }
      },
      stub: stub({ getSystem })
    },
    fn: {
      execute: function(req) {
        req.spec.host =
          parseUrl(API_HOST).host + getSystem().specSelectors.mockUrn();
        return Swagger.execute(req);
      },
      buildRequest: function(request) {
        const bRequest = Swagger.buildRequest(request);
        const host = parseUrl(API_HOST).host;
        const parsedUrl = parseUrl(bRequest.url);
        parsedUrl.set("host", host);
        parsedUrl.set(
          "pathname",
          getSystem().specSelectors.mockUrn() + parsedUrl.pathname
        );

        bRequest.url = parsedUrl.toString();
        return bRequest;
      }
    }
  };
};

export default function() {
  return [TopbarPlugin, StandaloneLayoutPlugin, test, testSchedule, swmb];
}

function getReducers() {
  return {
    "SWMB/FETCH_SPEC_LIST_SUCCESSS": (state, action) => {
      const nuState = state.set("specList", action.payload);
      return nuState;
    },
    "SWMB/FETCH_SPEC_CONTENT_SUCCESSS": (state, action) => {
      const { payload } = action;
      const nuState = state
        .set("stub", payload.data.stub)
        .set("specName", payload.specName);
      return nuState;
    },
    "SWMB/RUN_MB_LOADING": (state, action) => {
      return state.set("mbLoading", true);
    },
    "SWMB/RUN_MB_SUCCESS": (state, action) => {
      return state
        .set("mbLoading", false)
        .set("mockUrn", action.payload.mockUrn);
    },
    "SWMB/SET_STUB": (state, action) => {
      return state.set("stub", action.payload);
    }
  };
}
