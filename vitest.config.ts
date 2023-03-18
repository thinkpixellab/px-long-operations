/// <reference types="vitest" />
// Configure Vitest (https://vitest.dev/config/)
import { defineConfig } from 'vite';
import * as inspector from 'node:inspector';

// indefinite timeout if debugger is attached
let testTimeout = 5000;
if (inspector.url()) {
    testTimeout = 2147483647; // max value
}

export default defineConfig({
    test: {
        globals: true, // auto imports functions like describe, test, expect, etc
        testTimeout,
    },
});
