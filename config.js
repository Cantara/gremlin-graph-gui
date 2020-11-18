if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const config = {};
config.targetDevice = "the-simulator";

module.exports = config;