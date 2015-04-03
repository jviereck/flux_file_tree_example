var root = {
  'index.html': false,
  'node_modules': {
    'babel-core': {},
    'invariant': {},
    'react': {},
    'webpack-dev-server': {},
    'babel-loader': {},
    'express': {},
    'flux': {},
    'keymirror': {}
  },
  'package.json': false,
  'scripts': {
    'app.js': false,
    'backend.js': false,
    'index.js': false
  },
  'server.js': false,
  'webpack.config.js': false
}

var listDir = function(path) {
  console.log(`BACKEND: Loading content for ${path}`);

  return new Promise(function(resolve, reject) {
    var bits = path.substring(1).split('/');
    bits.pop();
    var name = bits[bits.length - 1] || '<root>';
    var obj = root;

    while (bits.length > 0) {
      obj = obj[bits.shift()];
      if (obj === undefined) {
        var errMsg = `Try to open path that is not defined: ${path}`;
        alert(errMsg);
        reject(new Error(errMsg));
      }
    }

    var res = {
      path: path,
      name: name,
      children: Object.keys(obj).map((name) => {
        return {
          path: path + name + '/',
          name: name,
          isFolder: (obj[name] !== false)
        };
      })
    };
    resolve(res);
  });
}

module.exports = { listDir: listDir }
