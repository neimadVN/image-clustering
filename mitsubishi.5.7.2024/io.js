const { promises: fs } = require('fs');
 
async function readLog(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
}
function writeLog(value, filePath) {
    const content = (typeof value === 'string') ? value : JSON.stringify(value);
    return fs.writeFile(filePath, content, 'utf8');
}

module.exports = {
    readLog, writeLog
};
