#!/bin/bash
echo "Before minification" `stat -c %s dist/main.js`
uglifyjs --ascii --compress -o build/index.js dist/main.js
echo "After minification" `stat -c %s build/index.js`

# node-minify --compressor yui-js --input 'dist/main.js' --output 'build/index.js'
# echo "After minification with node-minify" `stat -c %s build/index.js`

zip -9 build.zip build/index.js
echo "Zipped" `stat -c %s build.zip`
