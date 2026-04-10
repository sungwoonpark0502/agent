const fs = require('fs');
const out = (msg) => fs.appendFileSync('/tmp/electron-output2.txt', msg + '\n');
out('process.type: ' + process.type);
out('versions.electron: ' + process.versions.electron);
const e = require('electron');
out('typeof electron: ' + typeof e);
if (typeof e === 'object' && e !== null) {
  out('keys: ' + Object.keys(e).slice(0,10).join(','));
} else {
  out('value: ' + e);
}
out('DONE');
setTimeout(() => process.exit(0), 1000);
