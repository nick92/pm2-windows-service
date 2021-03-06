'use strict';

const path = require('path'),
    co = require('co'),
    event = require('co-event'),
    promisify = require('util').promisify || require('promisify-node'),
    fsx = require('fs-extra'),
    exec = promisify(require('child_process').exec),
    Service = require('node-windows').Service,
    del = require('del'),
    inquirer = require('inquirer'),
    common = require('./common'),
    setup = require('./setup'),
    logging = require('./logging'),
    save_dir = path.resolve(process.env.APPDATA, 'pm2-windows-service'),
    sid_file = path.resolve(save_dir, '.sid');

module.exports = co.wrap(function*(name, no_setup) {
    common.check_platform();

    yield common.admin_warning();

    let setup_response = yield no_setup ? Promise.resolve({
        perform_setup: false
    }) : inquirer.prompt([{
        type: 'confirm',
        name: 'perform_setup',
        message: 'Perform environment setup (recommended)?',
        default: true
    }]);

    if(setup_response.perform_setup) {
        yield setup();
    
        let enter_user_details = yield inquirer.prompt([{
            type: 'confirm',
            name: 'perform_logonas',
            message: 'Set Log On As account for the service (if not Local System will be used)?',
            default: true
        }]);

        if(enter_user_details.perform_logonas) {
            let domain = yield inquirer.prompt([{
                type: 'input',
                name: 'domain',
                message: 'Enter logon domain:',
                default: '.'
            }])

            let username = yield inquirer.prompt([{
                type: 'input',
                name: 'username',
                message: 'Enter logon username:',
                default: ''
            }])

            let password = yield inquirer.prompt([{
                type: 'password',
                name: 'password',
                message: 'Enter logon password:',
                default: ''
            }])

            service.logOnAs.domain = domain.domain;
            service.logOnAs.account = username.username;
            service.logOnAs.password = password.password;
        }
    }

    let service = new Service({
        name: name || 'PM2',
        script: path.join(__dirname, 'service.js')
    });

    // Let this throw if we can't remove previous daemon
    try {
        yield common.remove_previous_daemon(service);
    } catch(ex) {
        logging.error('Previous daemon still in use, please stop or uninstall existing service before reinstalling.')
        throw new Error('Previous daemon still in use, please stop or uninstall existing service before reinstalling.');
    }

    // NOTE: We don't do (name = name || 'PM2') above so we don't end up
    // writing out a sid_file for default name
    yield* save_sid_file(name);

    yield* kill_existing_pm2_daemon();

    yield* install_and_start_service(service);
});

function* save_sid_file(name) {
    if(name) {
        // Save name to %APPDATA%/pm2-windows-service/.sid, if supplied
        yield fsx.outputFile(sid_file, name);
    }
}

function* kill_existing_pm2_daemon() {
    try {
        yield exec('pm2 kill');
    } catch (ex) {
        logging.error("pm2 instance not running");
        // PM2 daemon wasn't running, no big deal
    }
}

function* install_and_start_service(service) {
    // Make sure we kick off the install events on next tick BEFORE we yield
    setImmediate(_ => service.install());

    // Now yield on install/alreadyinstalled/start events
    let e;
    while (e = yield event(service)) {
        switch (e.type) {
            case 'alreadyinstalled':
            case 'install':
                service.start();
                break;

            case 'start':
                return;
        }
    }
}
