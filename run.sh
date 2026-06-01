#!/bin/bash
fileName=$(python test/get_site_name.py "$1")

if test -f "out/$fileName.xlsx"; then
    echo "$fileName already exists"
    exit 0
fi

if [ ! -f "node_modules/axe-core/axe.min.js" ]; then
    echo "axe-core not found, running npm install..."
    npm install
fi

python test/access_tests.py "$@"
if [ $? -ne 0 ]; then
    echo "Audit of $fileName failed"
    exit 1
fi
