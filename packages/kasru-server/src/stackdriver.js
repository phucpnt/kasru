const Logging = require('@google-cloud/logging');
const serviceKeyPath = '/Users/phucpnt/projects/tools/sentifi-frontoffice-qa-747d6d205918.json'
const logging = new Logging({
  keyFilename: serviceKeyPath,
})

logging.getEntries({
    resourceNames: [
      'projects/sentifi-frontoffice-qa',
    ],
    filter: `
    labels."compute.googleapis.com/resource_name"="qa-fo-nginx-01"
    timestamp>="2018-09-19T00:00:00Z"
    `,
    orderBy: 'timestamp asc',
    pageSize: 100,
}).then((...args)=> {
  console.info('result args count ', args.length);
  console.info(args);
});
