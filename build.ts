/**
 * Remove old files, copy front-end ones.
 */

import fs from 'fs-extra';
import Logger from 'jet-logger';

// Setup logger
const logger = new Logger();
logger.timestamp = false;

(async () => {
    try {
        // Remove current build
        await remove('./dist/');
        // Copy front-end files
        await copy('./src/public', './dist/src/public');
        await copy('./src/views', './dist/src/views');
        await copy('./src/config/firebase.json', './dist/src/config/firebase.json');
    } catch (err) {
        logger.err(err);
    }
})();

function remove(loc: string): Promise<void> {
    return new Promise((res, rej) => {
        return fs.remove(loc, (err) => {
            return (!!err ? rej(err) : res());
        });
    });
}

function copy(src: string, dest: string): Promise<void> {
    return new Promise((res, rej) => {
        return fs.copy(src, dest, (err) => {
            return (!!err ? rej(err) : res());
        });
    });
}