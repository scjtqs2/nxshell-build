# Nxshell Build
NxShell build scripts

# How to run

```bash
git clone https://github.com/nxshell/build.git
cd build/build

npm i && node build.js

```
Build package will location at `build/dist`

```bash
# 个人在macosbook os 26上面的编译流程
git clone --recurse-submodules https://github.com/scjtqs2/nxshell-build.git
cd nxshell-build/build
# 切换node v22
nvm use 22
# 安装python 3.11，并配置环境变量。默认的3.14有问题。
brew install python@3.11
export PATH="$(brew --prefix)/opt/python@3.10/libexec/bin:$PATH"
npm i
node build.js --x64
node build.js --arm64
node build.js --universal
```