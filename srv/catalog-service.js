const cds = require("@sap/cds");
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;
const { consumer, eventBroker, producer } = require("./adapters/index");

const domain = "em/bemol/sap/cap/poc/purchaseorder";
//em/bemol/sap/cap/poc/purchaseorder

module.exports = cds.service.impl(async function () {
  await eventBroker.connect();
  const db = await cds.connect.to("db");
  const { Orders } = this.entities;

  try {
    await consumer.consume({
      queue: `queue:${domain}`,
      handler: async ({ text }) => {
        console.log("[consumer] received:", text);
      },
    });
    console.log(`[consumer] listening to queue ${domain}`);
  } catch (e) {
    console.error("[consumer] failed to start consumption:", e.message);
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
      topic: `topic:${domain}/created/v1`,
      payload: order
    });
    return order;
  });

  this.on("UPDATE", "Orders", async (req) => {
    const tx = db.transaction(req);
    const { ID, ...fields } = req.data;
    if (ID == null) req.reject(400, "Parameter 'ID' is required.");

    const affected = await tx.run(UPDATE(Orders).set(fields).where({ ID }));
    if (!affected) req.reject(404, `Order with ID=${ID} not found.`);

    const order = await tx.run(SELECT.from(Orders).where({ ID }).limit(1));
    await producer.produce({ topic: `topic:${domain}/updated/v1`, payload: order });
    return order;
  });

  this.on("DELETE", "Orders", async (req) => {
    const tx = db.transaction(req);
    const { ID } = req.data;
    if (ID == null) req.reject(400, "Parameter 'ID' is required.");

    const affected = await tx.run(DELETE.from(Orders).where({ ID }));
    if (!affected) req.reject(404, `Order with ID=${ID} not found.`);

    await producer.produce({
      topic: `topic:${domain}/deleted/v1`,
      payload: ID
    });
    return { ID };
  });
});
