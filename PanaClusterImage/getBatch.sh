#!/bin/bash

if [ ! -f batchLinks.txt ]; then
    echo "batchLinks.txt not found!"
    exit 1
fi

while IFS= read -r link; do
    export LINK="$link"
    node index.js
done < batchLinks.txt