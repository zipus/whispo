#!/bin/bash

mkdir -p resources/bin

cd whispo-rs

cargo build -r --features wayland

cp target/release/whispo-rs ../resources/bin/whispo-rs
