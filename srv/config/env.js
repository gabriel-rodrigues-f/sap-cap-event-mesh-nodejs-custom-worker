const [service] = JSON.parse(process.env.VCAP_SERVICES)["user-provided"].filter(credential => credential.name = "custom-service:bemol-em-credentials");
const { credentials } = service;

module.exports = {
  BROKER: {
    MESSAGING: {
      HOST: credentials.HOST,
      PORT: "443",
      PATH: "protocols/amqp10ws",
    },
    AUTH: {
      TOKEN_URL: credentials.TOKEN_URL || "",
      CLIENT_ID: credentials.CLIENT_ID || "",
      CLIENT_SECRET: credentials.CLIENT_SECRET || "",
    },
  },
}
