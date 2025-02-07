const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');
const core = require('@actions/core');
const { execCommand } = require('./utils');

const execAsync = util.promisify(exec);

// Global constants for file paths
const TMP_DIR = core.getInput('openvpn_tmp_dir');
const PID_FILE = `${TMP_DIR}/openvpn.pid`;
const LOG_FILE = `${TMP_DIR}/openvpn.log`;

const shutdown = async () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
      console.log(`Terminating OpenVPN process (PID: ${pid})...`);
      
      try {
        // Send SIGTERM to the process
        await execCommand(`sudo kill ${pid}`);
        console.log('SIGTERM sent to OpenVPN process');

        // Wait for "process exiting" in log
        const maxRetries = 10;
        let retries = 0;

        while (retries < maxRetries) {
          const log = await fs.promises.readFile(LOG_FILE, 'utf8');
          if (log.includes("process exiting")) {
            console.log("OpenVPN process exited successfully.");
            break;
          }
          console.log("Waiting for OpenVPN to exit...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          retries++;
        }

      } catch (error) {
        console.log('OpenVPN process was already terminated');
      }

    } else {
      console.log('OpenVPN PID file not found, process may have already been terminated');
    }

    // Clean up entire tmp directory
    if (fs.existsSync(TMP_DIR)) {
      await execCommand(`sudo rm -rf ${TMP_DIR}`);
      console.log('OpenVPN temporary directory removed');
    }

  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

shutdown().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
