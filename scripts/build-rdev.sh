#!/bin/bash

mkdir -p resources/bin

cd whispo-rdev

cargo build -r

cp target/release/whispo-rdev ../resources/bin/whispo-rdev
