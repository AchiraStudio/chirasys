// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // We dropped the "_lib" part here
    chirasys::run() 
}