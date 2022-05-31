#!/bin/bash
for entry in `ls ./diagrams/*.mmd`; 
do
    filename=`basename -s .mmd ${entry}`
    echo "Generating image for diagram: ${entry}"
    `./node_modules/.bin/mmdc -i $entry -o png/${filename}.png > /dev/null`
done
