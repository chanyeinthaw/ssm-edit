#!/usr/bin/env node

const path = require('path');
const { execFileSync } = require('child_process');

const GOARCH_MAP = {
  'arm64': 'arm64',
  'x64': 'amd64',
};

const GOOS_MAP = {
  'darwin': 'darwin',
  'linux': 'linux',
  'win32': 'windows'
};

if (!(process.arch in GOARCH_MAP)) {
  console.error(`Sorry this is only packaged for ${GOARCH_MAP} at the moment.`);
  process.exit(1);
}

if (!(process.platform in GOOS_MAP)) {
  console.error(`Sorry this is only packaged for ${GOOS_MAP} at the moment.`);
  process.exit(1);
}

const arch = GOARCH_MAP[process.arch];
const platform = GOOS_MAP[process.platform];
const binaryName = `ssme-${platform}-${arch}`;

const ssmePath = path.dirname(require.resolve('ssme'));
const binPath = path.resolve(ssmePath, '..' ,'bin', binaryName);

execFileSync(binPath, process.argv.slice(2), { stdio: 'inherit' });
