const cds = require("@sap/cds");
const broker = require("../adapters/EventBroker");
const consumer = require("../adapters/Consumer");
const producer = require("../adapters/Producer");

module.exports = async function () {
    await broker.connect();

    //  Exemplo para produzir mensagens no broker

    // await consumer.consume({
    //     queue: "queue:em/bemol/sap/cap/mock/account",
    //     handler: async ({ text }) => {
    //         console.log(text);
    //     }
    // });

    //  Exemplo para consumir mensagens no broker

    // producer.produce({ topic: "topic:topic/name", payload: { "id": 3 } })
};