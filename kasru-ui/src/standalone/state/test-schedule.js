import { List, Map } from "immutable";

const ATP = "SWMB/TEST_SCHEDULE";

export default function definePlugin({ getSystem }) {
  const statePlugins = {
    testSchedule: {
      actions: {
        runAll() {
          return system => {
            const testList = system.testSelectors.tests();
            system.testScheduleActions.unshift(
              testList.map(test => test.get("uniqueId").toString())
            );
            system.testScheduleActions.next();
          };
        },
        unshift(testIds) {
          return {
            type: `${ATP}/UNSHIFT`,
            payload: { testIds }
          };
        },
        next() {
          return system => {
            const qTest = system.testScheduleSelectors.first();
            if (qTest) {
              const testCase = system.testSelectors.getById(qTest.get("id"));
              system.testActions.run(qTest.get("id").toString(), testCase);
            }
          };
        },
        remove(testId) {
          return {
            type: `${ATP}/REMOVE`,
            payload: { testId }
          };
        },
        batchReport(testId, result) {
          return {
            type: `${ATP}/BATCH_REPORT`,
            payload: { testId, result }
          };
        },
        notifyBatchReport() {
          return system => {
            const report = system.testScheduleSelectors.report();
            const failNum = report.count(
              item => item.get("result").testResult !== true
            );
            const passNum = report.size - failNum;
            new Notification(
              `${failNum} Fail | ${passNum} Pass (Total: ${report.size})`,
              {
                icon: failNum === 0 ? "/test-pass.png" : "/test-fail.png"
              }
            );
          };
        },
        watchAll() {}
      },
      reducers: {
        [`${ATP}/UNSHIFT`]: (state, action) => {
          const time = new Date();
          const { testIds } = action.payload;
          let queue = state.get("queue", new List());
          queue = queue.unshift(...testIds.map(id => new Map({ id, time })));
          return state.set("queue", queue);
        },
        [`${ATP}/REMOVE`]: (state, action) => {
          const { testId } = action.payload;
          let queue = state.get("queue", new List());
          let index = queue.findIndex(item => item.get("id") === testId);
          if (index > -1) {
            queue = queue.remove(index);
          }
          return state.set("queue", queue);
        },
        [`${ATP}/BATCH_REPORT`]: (state, action) => {
          const { testId, result } = action.payload;
          let report = state.get("report", new List());
          report = report.push(new Map({ id: testId, result }));
          return state.set("report", report);
        }
      },
      selectors: {
        first: state => state.get("queue", new List()).get(0),
        report: state => state.get("report", new List())
      }
    },
    test: {
      wrapActions: {
        run_success: (oAction, system) => {
          return (testId, result) => {
            oAction(testId, result);
            const testCase = system.testSelectors.getById(testId);
            const nextScheduledTest = system.testScheduleSelectors.first();
            const isInBatch =
              nextScheduledTest && nextScheduledTest.get("id") === testId;
            if (!isInBatch) {
              if (Notification.permission === "granted") {
                new Notification(
                  `${
                    result.testResult === true ? "PASS" : "FAIL"
                  } - ${testCase
                    .get("method", "get")
                    .toUpperCase()} ${testCase.get("urn")}`,
                  {
                    icon:
                      result.testResult === true
                        ? "/test-pass.png"
                        : "/test-fail.png",
                    requireInteraction: true
                  }
                );
              }
            } else {
              system.testScheduleActions.batchReport(testId, result);
              system.testScheduleActions.remove(testId);
              system.testScheduleActions.next();
              const remainTest = system.testScheduleSelectors.first();
              if (!remainTest) {
                system.testScheduleActions.notifyBatchReport();
              }
            }
          };
        }
      }
    }
  };

  return { statePlugins };
}
