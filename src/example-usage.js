const jsonToAudition = require('./index.js')
const fs = require('fs');

const sequenceEDLJson = require('../sample/input/example_sequence.json');
// console.log(sequenceEDLJson);

const result = jsonToAudition(sequenceEDLJson);
console.log(result)

fs.writeFileSync('./sample/output/test.xml', result) 