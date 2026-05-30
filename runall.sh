#!/bin/bash
cat audits-src.txt | while read i; do
    ./run.sh $i
    if [ $? -ne 0 ]; then
        echo "Script terminated with error"
        break
    fi
done
