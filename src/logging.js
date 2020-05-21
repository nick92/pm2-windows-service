const winston = require('winston');

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint, splat, simple, json } = format;

let logger = createLogger({
    level: 'debug',
    format: combine( 
        timestamp(),
        prettyPrint()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error', handleExceptions: true }),
        new winston.transports.File({ filename: 'basic.log', level: 'info' }),
        new winston.transports.File({ filename: 'debug.log', level: 'debug' })
    ]
});
  

exports.info = function(message) {
    logger.info(message);
};

exports.debug = function(message) {
    logger.debug(message);
};

exports.warn = function(message) {
    logger.warn(message);
};

exports.error = function(message) {
    logger.error(message);
};
