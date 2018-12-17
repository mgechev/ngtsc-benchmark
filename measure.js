const uglify = require('uglify-js');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const execSync = require('child_process').execSync;

function getBinarySize(string) {
  return Buffer.byteLength(string, 'utf8');
}

const measure = (dir, result = []) => {
  const files = fs.readdirSync(dir);
  for (let node of files) {
    if (fs.lstatSync(path.join(dir, node)).isDirectory()) {
      measure(path.join(dir, node), result);
    } else if (node.endsWith('.component.js') || node.endsWith('.component.ngfactory.js')) {
      const minified = uglify.minify(fs.readFileSync(path.join(dir, node)).toString());
      if (minified.error) {
        throw new Error(node + ' ' + minified.error);
      }
      result.push({
        name: path.join(dir, node),
        size: getBinarySize(minified.code)
      });
    }
  }
  return result;
};

const NGC_DIR = './out-ngc/app/src';
const NGTSC_DIR = './out-ngtsc/app/src';

rimraf.sync(NGC_DIR);
rimraf.sync(NGTSC_DIR);

execSync('./node_modules/.bin/ngc -p src/tsconfig.ngc.json');
execSync('./node_modules/.bin/ngc -p src/tsconfig.ngtsc.json');

fs.writeFileSync('stats-ngc.json', JSON.stringify(measure('./out-ngc/app/src'), null, 2));
fs.writeFileSync('stats-ngtsc.json', JSON.stringify(measure('./out-ngtsc/app/src'), null, 2));

const ngc = require('./stats-ngc.json');
const ngtsc = require('./stats-ngtsc.json');

const totalNgc = ngc.reduce((p, c) => c.size + p, 0);
const totalNgtsc = ngtsc.reduce((p, c) => c.size + p, 0);

console.log('NGC:', totalNgc, 'NGTSC:', totalNgtsc);

const ngcCmp = {};
const ngtscCmp = {};

for (let entry of ngc) {
  const key = entry.name.replace('.ngfactory', '');
  ngcCmp[key] = ngcCmp[key] || 0;
  ngcCmp[key] += entry.size;
}

const ngcCsv = [[], []];
Object.keys(ngcCmp).forEach(c => {
  ngcCsv[0].push(c.split('/').pop())
  ngcCsv[1].push(ngcCmp[c]);
});

fs.writeFileSync('stats-ngc.csv', ngcCsv[0].join(',') + '\n' + ngcCsv[1].join(','));

for (let entry of ngtsc) {
  ngtscCmp[entry.name] = entry.size;
}

const ngtscCsv = [[], []];
Object.keys(ngtscCmp).forEach(c => {
  ngtscCsv[0].push(c.split('/').pop())
  ngtscCsv[1].push(ngtscCmp[c]);
});

fs.writeFileSync('stats-ngtsc.csv', ngtscCsv[0].join(',') + '\n' + ngtscCsv[1].join(','));


