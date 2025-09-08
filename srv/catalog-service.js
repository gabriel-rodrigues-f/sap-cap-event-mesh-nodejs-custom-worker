const cds = require("@sap/cds");
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

const broker = require("../adapters/EventBroker");
const consumer = require("../adapters/Consumer");
const producer = require("../adapters/Producer");

module.exports = cds.service.impl(async function () {
  await broker.connect();
  const db = await cds.connect.to("db");
  const { Orders } = this.entities;

  try {
    await consumer.consume({
      queue: "queue:em/bemol/sap/cap/poc/purchaseorder",
      handler: async ({ text }) => {
        console.log("[consumer] received:", text);
      },
    });
    console.log("[consumer] listening queue em/bemol/sap/cap/poc/purchaseorder");
  } catch (e) {
    console.error("[consumer] falha ao iniciar consumo:", e.message);
  }

  this.on("READ", "Orders", async (req) => {
    const tx = db.transaction(req);
    if (req.data?.ID !== undefined) {
      return tx.run(SELECT.from(Orders).where({ ID: req.data.ID }).limit(1));
    }
    return tx.run(SELECT.from(Orders));
  });

  this.on("CREATE", "Orders", async (req) => {
    const tx = db.transaction(req);
    await tx.run(INSERT.into(Orders).entries(req.data));
    const order = await tx.run(SELECT.from(Orders).where({ ID: req.data.ID }).limit(1));

    await producer.produce({
      topic: "topic:em/bemol/sap/cap/poc/purchaseorder/created/v1",
      payload: order
    });
    return order;
  });

  this.on("UPDATE", "Orders", async (req) => {
    const tx = db.transaction(req);
    const { ID, ...fields } = req.data;
    if (ID == null) req.reject(400, "Parâmetro 'ID' é obrigatório.");

    const affected = await tx.run(UPDATE(Orders).set(fields).where({ ID }));
    if (!affected) req.reject(404, `Order com ID=${ID} não encontrada.`);

    const order = await tx.run(SELECT.from(Orders).where({ ID }).limit(1));
    await producer.produce({ topic: "topic:em/bemol/sap/cap/poc/purchaseorder/updated/v1", payload: order });
    return order;
  });

  // DELETE
  this.on("DELETE", "Orders", async (req) => {
    const tx = db.transaction(req);
    const { ID } = req.data;
    if (ID == null) req.reject(400, "Parâmetro 'ID' é obrigatório.");

    const affected = await tx.run(DELETE.from(Orders).where({ ID }));
    if (!affected) req.reject(404, `Order com ID=${ID} não encontrada.`);

    await producer.produce({
      topic: "topic:em/bemol/sap/cap/poc/purchaseorder/deleted/v1",
      payload: ID
    });
    return { ID };
  });
});
