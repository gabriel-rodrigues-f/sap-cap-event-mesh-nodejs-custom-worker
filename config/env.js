require('dotenv').config();

const env = {
  BROKER: {
    MESSAGING: {
      HOST: process.env.HOST,
      PORT: "443",
      PATH: process.env.URL_PATH,
    },
    AUTH: {
      TOKEN_URL: process.env.TOKEN_URL || "",
      CLIENT_ID: process.env.CLIENT_ID || "",
      CLIENT_SECRET: process.env.CLIENT_SECRET || "",
    }
  }
}

module.exports = env;
