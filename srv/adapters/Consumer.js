const broker = require("./EventBroker");

class Consumer {
  _broker = broker;
  _activeStreams = new Map();

  async consume({ queue, handler }) {
    const stream = await this._broker.consume(queue, handler);
    this._activeStreams.set(queue, stream);
    return stream;
  }
}

module.exports = new Consumer();
