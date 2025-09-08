const cds = require('@sap/cds');
const broker = require("../adapters/EventBroker");

cds.on('bootstrap', async app => {
    await broker.connect();
})
