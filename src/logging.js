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
        new winston.transports.File({ filename: 'error.log', level: 'error', handleExceptions: true })
    ]
});
  
exports.error = function(message) {
    logger.error(message);
};
