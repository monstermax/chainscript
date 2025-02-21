#!/bin/bash


cd `dirname $0`

ts-node ./backend/src/chainscript.ts $@


