const _ = require('lodash');

function makeCSV(dataList, struct) {
    const header = Object.keys(struct);
    const result = dataList.map(data => {
        let line = '';
        for (const keyPath in struct) {
            line += (`"${_.get(data, struct[keyPath], '')}",`);
        }
        return line;
    });
    result.unshift(`"${header.join('","')}",`);
    return result.join('\n');
}

module.exports = {
    makeCSV
};
