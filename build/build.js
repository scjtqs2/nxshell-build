const shelljs = require("shelljs");
const fs = require('fs');
const path = require('path');

// download shell/core source code
// shelljs.cd("../");
// shelljs.exec("git clone https://github.com/nxshell/shell.git");
// shelljs.exec("git clone https://github.com/nxshell/core.git");
// shelljs.cd("./build");

const build_packages = require('./package-lock.json');
const electron_version = build_packages['dependencies']['electron']['version'];
function electron_rebuild(packages, arch) {
  console.log('Electron version is ', electron_version);
  let p = packages.join(',')
  console.log('Will rebuild electron node packages ', p, ' for arch ', arch);
  shelljs.exec(`npm run rebuild -- -f -v ${electron_version} -w ${p} -a ${arch}`)
}


function toFix(i, n) {
  i = "" + i;
  return i.padStart(n, 0);
}

// generate build time
const currentDate = new Date();
const currentY = currentDate.getUTCFullYear();
const currentM = currentDate.getUTCMonth() + 1;
const currentD = currentDate.getUTCDate();
const currentH = currentDate.getUTCHours();
const currentMi = currentDate.getUTCMinutes();
const buildTimes = toFix(currentY,4) + toFix(currentM,2) + toFix(currentD,2) + toFix(currentH,2) + toFix(currentMi,2);
fs.writeFileSync('electron-builder.env', `buildTimes=${buildTimes}`)

// generate build version
const packages = require('./package.json');
const version = packages.version;
const weblink = "http://106.15.238.81:56789/oauth";
const portable = process.argv.includes("portable");
const arch = process.argv.includes("--universal") ? "universal" : (process.argv.includes("--x64") ? "x64" : (process.arch === "arm64" ? "arm64" : "x64"));
fs.writeFileSync('../core/src/version/version.json', `{"version":"${version}","portable": ${portable},"weblink": "${weblink}"}`)

/**
 * 清除历史构建
 */
shelljs.rm("-rf", "../pack");
shelljs.mkdir("-p", "../pack");
shelljs.rm("-rf", "../dist");

/**
 * 构建Core
 */
shelljs.cd("../core");
shelljs.exec("npm install --production=false");
shelljs.exec("npm run build");
shelljs.cp("./dist/*.js", "../pack");
shelljs.cp("../build/package.json", "../pack");

/**
 * 构建ShellApp
 */
shelljs.cd("../shell");
shelljs.exec("rm -rf ./node_module");
shelljs.exec("npm install --production=false");
// run elelctron build
shelljs.exec(`npm run rebuild`);

shelljs.exec("npm run build");
shelljs.exec("node devtools/buildservice.js")

/**
 * 构建分发包
 */
shelljs.cd("../pack");

/**
 * 构建二进制包
 */
shelljs.mkdir("-p", "./native");
shelljs.exec("\cp ../build/native-package.json ./native/package.json");
shelljs.cd("native");
shelljs.exec("npm install --production=false");
if (arch === "universal") {
  console.log('Building universal native modules...');
  // 1. Build arm64
  electron_rebuild(['serialport', 'node-pty'], 'arm64');
  shelljs.mv("node_modules", "node_modules_arm64");

  // 2. Build x64
  shelljs.exec("npm install --production=false");
  electron_rebuild(['serialport', 'node-pty'], 'x64');
  shelljs.mv("node_modules", "node_modules_x64");

  // 3. Merge with lipo
  console.log('Merging native modules with lipo...');
  shelljs.cp("-rf", "node_modules_arm64", "node_modules");
  const allFiles = shelljs.find("node_modules");
  allFiles.forEach(file => {
    if (fs.lstatSync(file).isFile()) {
      const relPath = path.relative("node_modules", file);
      const arm64Path = path.join("node_modules_arm64", relPath);
      const x64Path = path.join("node_modules_x64", relPath);
      
      if (fs.existsSync(x64Path)) {
        const fileInfo = shelljs.exec(`file "${file}"`, { silent: true }).stdout;
        if (fileInfo.includes("Mach-O")) {
          console.log(`Merging binary: ${relPath}`);
          shelljs.exec(`lipo -create "${arm64Path}" "${x64Path}" -output "${file}"`);
        }
      }
    }
  });
  shelljs.rm("-rf", "node_modules_arm64");
  shelljs.rm("-rf", "node_modules_x64");
} else {
  electron_rebuild(['serialport', 'node-pty'], arch);
}
shelljs.exec("npm uninstall electron-rebuild");
shelljs.cd("../");

shelljs.cd("../build");
if (arch === "universal") {
  shelljs.exec("npm run build:universal");
} else if (arch === "x64") {
  shelljs.exec("npm run build:x64");
} else {
  shelljs.exec("npm run build");
}
