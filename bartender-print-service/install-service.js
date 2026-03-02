/**
 * Install BarTender Print Service as Windows Service
 *
 * Allows the service to run automatically when Windows starts
 */

const Service = require('node-windows').Service;
const path = require('path');

const isUninstall = process.argv[2] === 'uninstall';

// Create a new service object
const svc = new Service({
  name: 'BarTender Print Service',
  description: 'Automated label printing service for Momolato ordering system',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [],
  workingDirectory: __dirname,
  allowServiceLogon: true
});

// Listen for the "install" event
svc.on('install', function() {
  console.log('✅ Service installed successfully!');
  console.log('   Starting service...');
  svc.start();
});

// Listen for the "start" event
svc.on('start', function() {
  console.log('✅ Service started!');
  console.log('');
  console.log('Service is now running as Windows Service');
  console.log('You can manage it from:');
  console.log('  - Services app (services.msc)');
  console.log('  - Task Manager > Services tab');
  console.log('');
  console.log('To uninstall:');
  console.log('  npm run uninstall-service');
});

// Listen for the "uninstall" event
svc.on('uninstall', function() {
  console.log('✅ Service uninstalled successfully!');
  console.log('   The service has been removed from Windows Services');
});

// Listen for errors
svc.on('error', function(err) {
  console.error('❌ Service error:', err);
});

if (isUninstall) {
  console.log('Uninstalling BarTender Print Service...');
  svc.uninstall();
} else {
  console.log('Installing BarTender Print Service as Windows Service...');
  svc.install();
}
