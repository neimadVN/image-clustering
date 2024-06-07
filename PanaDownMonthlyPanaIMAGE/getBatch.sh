#!/bin/bash

if [ ! -f filePaths.txt ]; then
    echo "filePaths.txt not found!"
    exit 1
fi

while IFS= read -r pathLink; do
    export PATH_LINK="$pathLink"
    node index.js
done < filePaths.txt