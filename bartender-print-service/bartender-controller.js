/**
 * BarTender Controller
 *
 * Interfaces with BarTender SDK using edge-js to call .NET APIs
 * Handles label printing automation
 */

const edge = require('edge-js');
const path = require('path');
const fs = require('fs');

class BarTenderController {
  constructor() {
    this.engine = null;
    this.ready = false;
    this.bartenderPath = process.env.BARTENDER_PATH || 'C:\\Program Files\\Seagull\\BarTender 2021';
  }

  /**
   * Initialize BarTender SDK Engine
   */
  async initialize() {
    if (this.ready) {
      console.log('BarTender engine already initialized');
      return;
    }

    try {
      console.log('Initializing BarTender SDK...');

      // Create C# function to initialize BarTender
      const initBarTender = edge.func({
        assemblyFile: path.join(__dirname, 'BarTenderSDK.dll'),
        typeName: 'BarTenderSDK.BarTenderEngine',
        methodName: 'Initialize'
      });

      const result = await initBarTender(this.bartenderPath);

      if (result.success) {
        this.ready = true;
        console.log('✅ BarTender SDK initialized successfully');
      } else {
        throw new Error(result.error || 'Failed to initialize BarTender');
      }

    } catch (error) {
      console.error('BarTender initialization error:', error);

      // Fallback: Try direct COM initialization if DLL not available
      console.log('Attempting direct COM initialization...');
      await this.initializeDirectCOM();
    }
  }

  /**
   * Direct COM initialization (fallback method)
   */
  async initializeDirectCOM() {
    try {
      // Use edge-js to create and initialize BarTender engine via COM
      const initCOM = edge.func(`
        using System;
        using System.Threading.Tasks;
        using BarTender;

        public class Startup
        {
          public async Task<object> Invoke(object input)
          {
            try
            {
              // Create BarTender Engine
              Engine btEngine = new Engine(true);

              // Start the engine
              btEngine.Start();

              return new {
                success = true,
                message = "BarTender engine started via COM",
                version = btEngine.Version
              };
            }
            catch (Exception ex)
            {
              return new {
                success = false,
                error = ex.Message
              };
            }
          }
        }
      `);

      const result = await initCOM(null);

      if (result.success) {
        this.ready = true;
        console.log(`✅ BarTender engine initialized via COM (v${result.version})`);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      throw new Error(`Failed to initialize BarTender: ${error.message}`);
    }
  }

  /**
   * Print multiple labels
   */
  async printLabels({ labels, templatePath, printerName, copies = 1 }) {
    if (!this.ready) {
      await this.initialize();
    }

    try {
      console.log(`\n📋 Print Job Started:`);
      console.log(`   Template: ${templatePath}`);
      console.log(`   Labels: ${labels.length}`);
      console.log(`   Printer: ${printerName || 'Default'}`);
      console.log(`   Copies per label: ${copies}`);

      // Create C# function to print labels
      const printLabels = edge.func(`
        using System;
        using System.Threading.Tasks;
        using BarTender;

        public class Startup
        {
          public async Task<object> Invoke(dynamic input)
          {
            Engine btEngine = null;
            LabelFormatDocument btFormat = null;
            int printed = 0;

            try
            {
              // Parse input
              string templatePath = (string)input.templatePath;
              string printerName = (string)input.printerName;
              int copies = (int)input.copies;
              var labels = input.labels;

              // Create and start BarTender engine
              btEngine = new Engine(true);
              btEngine.Start();

              // Open template
              btFormat = btEngine.Documents.Open(templatePath);

              // Set printer if specified
              if (!string.IsNullOrEmpty(printerName))
              {
                btFormat.PrintSetup.PrinterName = printerName;
              }

              // Print each label
              foreach (var label in labels)
              {
                // Set field values
                if (label.companyName != null)
                  btFormat.SubStrings["CompanyName"].Value = label.companyName;

                if (label.productName != null)
                  btFormat.SubStrings["ProductName"].Value = label.productName;

                if (label.ingredients != null && btFormat.SubStrings["Ingredients"] != null)
                  btFormat.SubStrings["Ingredients"].Value = label.ingredients;

                if (label.allergen != null)
                  btFormat.SubStrings["Allergen"].Value = label.allergen;

                if (label.bestBefore != null)
                  btFormat.SubStrings["BestBefore"].Value = label.bestBefore;

                if (label.batchNumber != null)
                  btFormat.SubStrings["BatchNumber"].Value = label.batchNumber;

                // Print the label
                Result result = btFormat.Print("", copies);

                if (result == Result.Success)
                {
                  printed++;
                }
                else
                {
                  Console.WriteLine($"Failed to print label {printed + 1}: {result}");
                }
              }

              return new
              {
                success = true,
                printed = printed,
                total = labels.Length,
                message = $"Printed {printed} of {labels.Length} labels"
              };
            }
            catch (Exception ex)
            {
              return new
              {
                success = false,
                error = ex.Message,
                printed = printed
              };
            }
            finally
            {
              // Cleanup
              if (btFormat != null)
              {
                btFormat.Close(SaveOptions.DoNotSaveChanges);
              }

              if (btEngine != null)
              {
                btEngine.Stop(SaveOptions.DoNotSaveChanges);
              }
            }
          }
        }
      `);

      const result = await printLabels({
        templatePath,
        printerName,
        copies,
        labels
      });

      if (result.success) {
        console.log(`✅ Print job completed: ${result.printed}/${result.total} labels printed`);
      } else {
        console.error(`❌ Print job failed: ${result.error}`);
      }

      return result;

    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  /**
   * Get list of available printers
   */
  async getPrinters() {
    try {
      const getPrinters = edge.func(`
        using System;
        using System.Threading.Tasks;
        using System.Drawing.Printing;
        using System.Collections.Generic;

        public class Startup
        {
          public async Task<object> Invoke(object input)
          {
            try
            {
              var printers = new List<string>();

              foreach (string printer in PrinterSettings.InstalledPrinters)
              {
                printers.Add(printer);
              }

              return new
              {
                success = true,
                printers = printers.ToArray()
              };
            }
            catch (Exception ex)
            {
              return new
              {
                success = false,
                error = ex.Message
              };
            }
          }
        }
      `);

      const result = await getPrinters(null);

      if (result.success) {
        return result.printers;
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Failed to get printers:', error);
      return [];
    }
  }

  /**
   * Shutdown BarTender engine
   */
  async shutdown() {
    if (!this.ready) {
      return;
    }

    try {
      console.log('Shutting down BarTender engine...');

      const shutdown = edge.func(`
        using System;
        using System.Threading.Tasks;
        using BarTender;

        public class Startup
        {
          public async Task<object> Invoke(object input)
          {
            try
            {
              // Cleanup would happen here if we kept engine alive
              return new { success = true };
            }
            catch (Exception ex)
            {
              return new {
                success = false,
                error = ex.Message
              };
            }
          }
        }
      `);

      await shutdown(null);
      this.ready = false;

      console.log('✅ BarTender engine shut down');

    } catch (error) {
      console.error('Shutdown error:', error);
    }
  }

  /**
   * Check if BarTender is ready
   */
  isReady() {
    return this.ready;
  }
}

module.exports = BarTenderController;
