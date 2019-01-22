# <img src="icon.png" width=48> ioBroker templates

This is a collection of templates for ioBroker developers. Just select the template you need, copy its contents from the sub directory and begin working on your project.

<!-- TODO: Links to documentation and stuff -->

## Templates
Currently, the following templates are available:

### Adapter and visualization

#### [JavaScript](JavaScriptVIS)

#### [TypeScript](TypeScriptVIS)

### Adapter only

#### [JavaScript](JavaScript)

#### [TypeScript](TypeScript)

## [Visualization only](VIS)


## Features
All templates come with the following features:
* IntelliSense (auto completion and tooltips) in supporting editors
* JavaScript only:
  * [ESLint](https://github.com/eslint/eslint) for code quality
  * Type checking based on the ioBroker declarations
* TypeScript only:
  * [TSLint](https://github.com/palantir/tslint) for code quality
  * [nyc](https://github.com/istanbuljs/nyc) for code coverage
* Built-in component tests using `mocha` & `chai` (with `chai-as-promised`) and `sinon` (with `sinon-chai`) for:
  * Correctly defined package files
  * and your own tests
* ... [and more to come](https://github.com/ioBroker/create-adapter/blob/master/README.md#roadmap)

## Anything missing?
The templates are automatically generated using [`@iobroker/create-adapter`](https://github.com/ioBroker/create-adapter). If you're missing a feature or found a bug, please open an issue in that repository. Or consider using the tool directly for much more configuration goodness.

## For developers
Please don't edit these files directly (except this README). Instead the CI builds in the `create-adapter` repo should be updated.