const cds = require("@sap/cds");
const logger = cds.log('sql');
const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;
const { consumer, eventBroker, producer } = require("./adapters/index");

const DOMAIN = "em/lab2dev/sap/cap/purchaseorder";

module.exports = cds.service.impl(async function () {
  await eventBroker.connect();
  const db = await cds.connect.to("db");
  const { Orders } = this.entities;

  // try {
  //   await consumer.consume({
  //     queue: `queue:${DOMAIN}`,
  //     handler: async ({ text }) => {
  //       logger.info(text)
  //     },
  //   });
  //   console.log(`[consumer] listening to queue ${DOMAIN}`);
  // } catch (e) {
  //   console.error("[consumer] failed to start consumption:", e.message);
  // }

  this.on("READ", "Orders", async (req) => {
    const tx = db.transaction(req);
    const orders = await tx.run(SELECT.from(Orders));
    logger.info(orders);
    return orders;
  });

  this.on("CREATE", "Orders", async (req) => {
    const tx = db.transaction(req);
    await tx.run(INSERT.into(Orders).entries(req.data));
    const order = await tx.run(SELECT.from(Orders).where({ ID: req.data.ID }).limit(1));

    const message = {
      topic: `topic:${DOMAIN}/created/v1`,
      payload: order
    }

    await producer.produce(message);
    logger.info(message);

    return order;
  });

  this.on("UPDATE", "Orders", async (req) => {
    const tx = db.transaction(req);
    const { ID, ...fields } = req.data;
    if (ID == null) req.reject(400, "Parameter 'ID' is required.");

    const affected = await tx.run(UPDATE(Orders).set(fields).where({ ID }));
    if (!affected) req.reject(404, `Order with ID=${ID} not found.`);

    const order = await tx.run(SELECT.from(Orders).where({ ID }).limit(1));

    const message = { 
      topic: `topic:${DOMAIN}/updated/v1`, 
      payload: order 
  }

    await producer.produce(message);
    logger.info(message);
    return order;
  });

  this.on("DELETE", "Orders", async (req) => {
    const tx = db.transaction(req);
    const { ID } = req.data;
    if (ID == null) req.reject(400, "Parameter 'ID' is required.");

    const affected = await tx.run(DELETE.from(Orders).where({ ID }));
    if (!affected) req.reject(404, `Order with ID=${ID} not found.`);

    const message = {
      topic: `topic:${DOMAIN}/deleted/v1`,
      payload: ID
    };

    await producer.produce(message);
    logger.info(message);

    return { ID };
  });
});
