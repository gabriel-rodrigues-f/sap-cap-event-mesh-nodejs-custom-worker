const broker = require('./EventBroker');

class Producer {
  _broker = broker;

  async produce({ topic, payload }) {
    if (!topic) throw new Error('topic is required');
    await this._broker.produce(topic, payload);
  }
}

module.exports = new Producer();
