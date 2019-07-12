const { inlineSource } = require('inline-source');
const fs = require('fs');
const path = require('path');
const htmlpath = path.resolve('./src/index.html');
const savepath = path.resolve('./dist')
const chokidar = require('chokidar');
const open = require('open');
let html;

async function build(callback) {
  try {
    // Inlining Resources
    if (process.env.mode === "production") {
      html = await inlineSource(htmlpath, {
        compress: true,
        rootpath: path.resolve('./src'),
      });
    } else {
      html = await inlineSource(htmlpath, {
        compress: false,
        pretty: true,
        rootpath: path.resolve('./src'),
      });
    }
    // Saving HTML
    fs.writeFile(path.join(savepath, 'index.html'), html, function (err) {
      if (err) {
        throw err;
      }
      callback();
    }); 
  } catch (err) {
    throw err;
  }
}

function watch() {
  console.log("Building...");
  build(function() {
    console.log("Done");

    console.log("Opening...");
    openpath = path.join(savepath, 'index.html');
    console.log(openpath);
    open(openpath);
    
    console.log("Watching...")
    // Watch for changes in src dir
    chokidar.watch('src', {
      ignored: /(^|[\/\\])\../
    }).on('change', (path) => {
      console.log("\nChange detected in file " + path);
      console.log("Rebuilding...");
      build(function() {
        console.log("Done");
      })
    });
  });
}

module.exports = {
  build: function() {
    console.log("Building...");
    build(function() {
      console.log("Done");
    });
  },
  watch: function() {
    watch();
  }
}
