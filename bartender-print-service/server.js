/**
 * BarTender Print Service
 *
 * Node.js backend service that interfaces with BarTender SDK
 * to automatically print labels from the web application.
 *
 * Requirements:
 * - Windows OS
 * - BarTender Automation Edition
 * - Node.js 14+
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Import BarTender controller
const BarTenderController = require('./bartender-controller');
const bartenderController = new BarTenderController();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BarTender Print Service',
    version: '1.0.0',
    bartenderReady: bartenderController.isReady()
  });
});

// Initialize BarTender engine
app.post('/api/bartender/initialize', async (req, res) => {
  try {
    await bartenderController.initialize();
    res.json({
      success: true,
      message: 'BarTender engine initialized successfully'
    });
  } catch (error) {
    console.error('Failed to initialize BarTender:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Print labels endpoint
app.post('/api/bartender/print', async (req, res) => {
  try {
    const {
      labels,           // Array of label data
      templatePath,     // Path to BTW template file
      printerName,      // Printer name (e.g., "Toshiba B-415")
      copies           // Number of copies per label (default: 1)
    } = req.body;

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Labels array is required and must not be empty'
      });
    }

    if (!templatePath) {
      return res.status(400).json({
        success: false,
        error: 'Template path is required'
      });
    }

    console.log(`Printing ${labels.length} labels to ${printerName || 'default printer'}...`);

    const result = await bartenderController.printLabels({
      labels,
      templatePath,
      printerName,
      copies: copies || 1
    });

    res.json({
      success: true,
      message: `Successfully printed ${result.printed} labels`,
      details: result
    });

  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Get printer list
app.get('/api/bartender/printers', async (req, res) => {
  try {
    const printers = await bartenderController.getPrinters();
    res.json({
      success: true,
      printers
    });
  } catch (error) {
    console.error('Failed to get printers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Shutdown BarTender engine
app.post('/api/bartender/shutdown', async (req, res) => {
  try {
    await bartenderController.shutdown();
    res.json({
      success: true,
      message: 'BarTender engine shut down successfully'
    });
  } catch (error) {
    console.error('Failed to shutdown BarTender:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║         BarTender Print Service - RUNNING                ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Service running on: http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log(`   POST http://localhost:${PORT}/api/bartender/initialize`);
  console.log(`   POST http://localhost:${PORT}/api/bartender/print`);
  console.log(`   GET  http://localhost:${PORT}/api/bartender/printers`);
  console.log(`   POST http://localhost:${PORT}/api/bartender/shutdown`);
  console.log('');
  console.log('⚙️  Service ready to receive print jobs from web application');
  console.log('');

  // Auto-initialize BarTender on startup
  bartenderController.initialize()
    .then(() => {
      console.log('✅ BarTender engine initialized and ready');
    })
    .catch((error) => {
      console.error('❌ Failed to initialize BarTender engine:', error.message);
      console.error('   Please ensure BarTender Automation is installed');
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down BarTender Print Service...');
  try {
    await bartenderController.shutdown();
    console.log('✅ BarTender engine shut down successfully');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down BarTender Print Service...');
  try {
    await bartenderController.shutdown();
    console.log('✅ BarTender engine shut down successfully');
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});
