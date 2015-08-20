System.config({
  "transpiler": "babel",
  "babelOptions": {
    "optional": [
      "runtime"
    ]
  },
  "paths": {
    "*": "*.js",
    "github:*": "jspm/github/*.js",
    "npm:*": "jspm/npm/*.js",
    "github:cujojs/most@0.15.0": "jspm/github/cujojs/most@0.15.0/dist/most.min.js"
  }
});

System.config({
  "meta": {
    "alloy-editor": {
      "format": "global",
      "exports": "AlloyEditor"
    }
  }
});

System.config({
  "map": {
    "babel": "npm:babel-core@5.8.22",
    "babel-runtime": "npm:babel-runtime@5.8.20",
    "core-js": "npm:core-js@0.9.18",
    "immutable": "npm:immutable@3.7.4",
    "lipsum": "github:andrienko/lipsum-js@master",
    "lodash/lodash": "github:lodash/lodash@3.10.1",
    "most": "github:cujojs/most@0.15.0",
    "pen": "github:sofish/pen@0.2.2",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "npm:babel-runtime@5.8.20": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:core-js@0.9.18": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    }
  }
});

