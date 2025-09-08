const { Client } = require('@sap/xb-msg-amqp-v100');
const env = require('../config/env');

class EventBroker {
    constructor() {
        this._client = null;
        this._connected = false;
        this._options = {
            uri: `wss://${env.BROKER.MESSAGING.HOST}:${env.BROKER.MESSAGING.PORT}/${env.BROKER.MESSAGING.PATH}`,
            oa2: {
                endpoint: env.BROKER.AUTH.TOKEN_URL,
                client: env.BROKER.AUTH.CLIENT_ID,
                secret: env.BROKER.AUTH.CLIENT_SECRET
            }
        };
    }

    async connect({ timeoutMs = 15000 } = {}) {
        if (this._connected) return;

        this._client = new Client(this._options);
        
        const waitConnected = new Promise((resolve, reject) => {
            const to = setTimeout(() => {
                reject(new Error(`Timeout (${timeoutMs} ms) ao conectar no Event Mesh em ${this._options.uri}`));
            }, timeoutMs);

            this._client
                .on('connected', (_dest, peerInfo) => {
                    clearTimeout(to);
                    this._connected = true;
                    resolve();
                })
                .on('error', (err) => {
                    console.error('[broker] error:', err?.message || err);
                })
                .on('disconnected', (_hadError, _byBroker) => {
                    this._connected = false;
                    console.warn('[broker] disconnected');
                });
        });

        await this._client.connect();
        await waitConnected;
    }

    async disconnect() {
        if (!this._client) return;
        try {
            await this._client.disconnect();
        } finally {
            this._connected = false;
            this._client = null;
        }
    }

    async produce(topic, body) {
        this._ensureConnected();
        const sender = this._client.sender('tx');
        const stream = sender.attach(topic);

        return new Promise((resolve, reject) => {
            stream
                .on('ready', () => {
                    const payload = this._toBuffer(body);
                    const message = {
                        payload,
                        contentType: 'application/json',
                        applicationProperties: { source: 'node-producer' }
                    };

                    const ok = stream.write(message);
                    if (!ok) stream.once('drain', () => stream.end());
                    else stream.end();
                })
                .on('finish', resolve)
                .on('error', reject);
        });
    }
    async consume(queue, handler) {
        this._ensureConnected();
        const stream = this._client.receiver('rx').attach(queue);

        stream
            .on('data', async (message) => {
                const { source } = message;
                console.log((source.properties))
                try {
                    const buf = message?.payload;
                    const text = this._safeToString(buf);
                    const json = this._tryParseJSON(text);

                    await handler({ payload: buf, text, json });
                    message.done();
                } catch (e) {
                    console.error('[broker] consumer handler error:', e?.message || e);
                    message.done();
                }
            })
            .on('error', (err) => {
                console.error('[broker] consumer stream error:', err?.message || err);
            });

        return stream;
    }

    _ensureConnected() {
        if (!this._client || !this._connected) {
            throw new Error('Error when connecting to Event Broker');
        }
    }

    _toBuffer(body) {
        if (Buffer.isBuffer(body)) return body;
        if (typeof body === 'string') return Buffer.from(body, 'utf8');
        return Buffer.from(JSON.stringify(body ?? {}), 'utf8');
    }

    _safeToString(buf) {
        try {
            return Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf ?? '');
        } catch {
            return '';
        }
    }

    _tryParseJSON(text) {
        try { return JSON.parse(text); } catch { return undefined; }
    }
}

const eventBroker = new EventBroker();

module.exports = eventBroker;
