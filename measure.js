const uglify = require('uglify-js');
const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const execSync = require('child_process').execSync;
const minify = require('html-minifier').minify;

function getBinarySize(string) {
  return Buffer.byteLength(string, 'utf8');
}

const measure = (dir, result = []) => {
  const files = fs.readdirSync(dir);
  for (let node of files) {
    if (fs.lstatSync(path.join(dir, node)).isDirectory()) {
      measure(path.join(dir, node), result);
    } else if (node.endsWith('.component.js') || node.endsWith('.component.ngfactory.js') || node.endsWith('.component.html')) {
      const content = fs.readFileSync(path.join(dir, node)).toString();
      let minified = null;
      if (node.endsWith('.html')) {
        minified = minify(content);
      } else {
        minified = uglify.minify(content).code;
      }
      result.push({
        name: path.join(dir, node),
        size: getBinarySize(minified)
      });
    }
  }
  return result;
};

const NGC_DIR = './out-ngc/app/src';
const NGTSC_DIR = './out-ngtsc/app/src';
const BASELINE_DIR = './src';

rimraf.sync(NGC_DIR);
rimraf.sync(NGTSC_DIR);

execSync('./node_modules/.bin/ngc -p src/tsconfig.ngc.json');
execSync('./node_modules/.bin/ngc -p src/tsconfig.ngtsc.json');

fs.writeFileSync('stats-ngc.json', JSON.stringify(measure(NGC_DIR), null, 2));
fs.writeFileSync('stats-ngtsc.json', JSON.stringify(measure(NGTSC_DIR), null, 2));

const templates = measure(BASELINE_DIR);
fs.writeFileSync('stats-baseline.json', JSON.stringify(measure(NGC_DIR, templates), null, 2));

const ngc = require('./stats-ngc.json');
const ngtsc = require('./stats-ngtsc.json');
const baseline = require('./stats-baseline.json');

const totalNgc = ngc.reduce((p, c) => c.size + p, 0);
const totalNgtsc = ngtsc.reduce((p, c) => c.size + p, 0);

console.log('NGC:', totalNgc, 'NGTSC:', totalNgtsc);

const ngcCmp = {};
const ngtscCmp = {};
const baselineCmp = {};

///// NGC

for (let entry of ngc) {
  const key = entry.name.split('/').pop();
  if (key.endsWith('.html')) {
    continue;
  }
  ngcCmp[key] = entry.size;
}

const ngcCsv = [[''], ['controller'], ['template']];
Object.keys(ngcCmp).forEach(c => {
  if (!c.endsWith('.component.js')) {
    return;
  }
  ngcCsv[0].push(c.split('/').pop())
  ngcCsv[1].push(ngcCmp[c]);
  const factory = c.replace(/\.js$/, '.ngfactory.js');
  ngcCsv[2].push(ngcCmp[factory]);
});

fs.writeFileSync('stats-ngc.csv', ngcCsv.map(r => r.join(',')).join('\n'));

///// NGTSC

for (let entry of ngtsc) {
  const name = entry.name.split('/').pop();
  ngtscCmp[name] = entry.size;
}

const ngtscCsv = [[''], ['controller'], ['template']];
Object.keys(ngtscCmp).forEach(c => {
  ngtscCsv[0].push(c)
  ngtscCsv[1].push(ngcCmp[c]);
  // ngtsc output - .component.js
  ngtscCsv[2].push(ngtscCmp[c] - ngcCmp[c]);
});

fs.writeFileSync('stats-ngtsc.csv', ngtscCsv.map(r => r.join(',')).join('\n'));


///// Baseline

for (let entry of baseline) {
  const key = entry.name.split('/').pop();
  if (key.indexOf('ngfactory') >= 0) {
    continue;
  }
  baselineCmp[key] = entry.size;
}

const baselineCsv = [[''], ['controller'], ['template']];
Object.keys(baselineCmp).forEach(c => {
  if (!c.endsWith('.component.js')) {
    return;
  }
  baselineCsv[0].push(c.split('/').pop())
  baselineCsv[1].push(baselineCmp[c]);
  const template = c.replace(/\.js$/, '.html');
  baselineCsv[2].push(baselineCmp[template]);
});

fs.writeFileSync('stats-baseline.csv', baselineCsv.map(r => r.join(',')).join('\n'));

fs.writeFileSync(
  'all.csv',
  ngcCsv.map(r => r.join(',')).join('\n') + '\n' +
  ngtscCsv.map(r => r.join(',')).join('\n') + '\n' +
  baselineCsv.map(r => r.join(',')).join('\n') + '\n'
);

