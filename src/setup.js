const { exec } = require("child_process");
const fs = require("fs");
const util = require("util");
const core = require("@actions/core");
const { execCommand } = require("./utils");

const execAsync = util.promisify(exec);

// Global constants for file paths
const TMP_DIR = core.getInput('openvpn_tmp_dir');
const CONFIG_FILE = `${TMP_DIR}/client.conf`;
const PID_FILE = `${TMP_DIR}/openvpn.pid`;
const LOG_FILE = `${TMP_DIR}/openvpn.log`;

// Create a function to check prerequisite
// Ensure tmp directory exists and is writable
// Ensure OS is Debian-based
const checkPrerequisites = async () => {
  try {
    // Ensure tmp directory exists and is writable
    if (!fs.existsSync(TMP_DIR)) {
      await fs.promises.mkdir(TMP_DIR, { recursive: true });
    }
    if (!fs.existsSync(TMP_DIR)) {
      console.error("Temporary directory not found or could not be created");
      process.exit(1);
    }

    // Check OS is Debian-based
    const osName = (await execAsync("lsb_release -is")).stdout.trim().toLowerCase();
    if (!["debian", "ubuntu"].includes(osName)) {
      console.error(`This action only supports Debian-based distributions ('${osName}' not supported)`);
      process.exit(1);
    }
  } catch (error) {
    console.error("Error checking prerequisites:", error);
    process.exit(1);
  }
};

const installOpenvpn = async () => {
  try {
    // Check if openvpn binary is available
    let isInstalled = false;
    try {
      await execCommand("which openvpn");
      isInstalled = true;
    } catch (error) {
      // openvpn binary not found
      isInstalled = false;
    }

    if (!isInstalled) {
      console.log("OpenVPN not installed. Installing...");

      console.log("Updating package lists...");
      await execCommand("sudo apt-get update");

      console.log("Installing OpenVPN...");
      await execCommand(
        "sudo DEBIAN_FRONTEND=noninteractive apt-get install -yq --no-install-recommends openvpn"
      );
    } else {
      console.log("OpenVPN is already installed");
    }
  } catch (error) {
    console.error("Error installing OpenVPN:", error);
    process.exit(1);
  }
};

const saveOpenvpnConfig = async () => {
  try {
    const base64Config = core.getInput('openvpn_config_base64', { required: true });

    if (!base64Config) {
      throw new Error("OpenVPN configuration is required");
    }

    const buffer = Buffer.from(base64Config, "base64");
    await fs.promises.writeFile(CONFIG_FILE, buffer);
    console.log(`OpenVPN configuration saved at ${CONFIG_FILE}`);
  } catch (error) {
    console.error("Error saving OpenVPN configuration:", error);
    process.exit(1);
  }
};

const startOpenvpn = async () => {
  try {
    console.log("Starting OpenVPN...");
    await execCommand(`sudo openvpn --daemon --writepid ${PID_FILE} --log ${LOG_FILE} --verb 4 --config ${CONFIG_FILE}`);

    console.log("OpenVPN started successfully.");
  } catch (error) {
    console.error("Error starting OpenVPN:", error);
    process.exit(1);
  }
};

const waitForOpenvpnConnection = async () => {
  const maxRetries = 10;
  let retries = 0;

  // Make log file readable for current user
  await execCommand(`sudo chmod 644 ${LOG_FILE}`);

  while (retries < maxRetries) {
    if (!fs.existsSync(LOG_FILE)) {
      console.log("Waiting for log file to be created...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
      continue;
    }

    const log = await fs.promises.readFile(LOG_FILE, "utf8");
    if (log.includes("Initialization Sequence Completed")) {
      console.log("OpenVPN connected successfully.");

      // Print routes routed in the VPN
      const routesOutput = await execAsync(`sudo grep -E '(net_route_v4_add|net_addr_v4_add)' ${LOG_FILE}`);
      console.log("Routes that will go through the VPN:");
      console.log(routesOutput.stdout);

      break;
    }

    console.log("Waiting for OpenVPN to connect...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    retries++;
  }

  if (retries === maxRetries) {
    console.error("OpenVPN failed to connect after 10 attempts");
    process.exit(1);
  }
};

const main = async () => {
  await checkPrerequisites();
  await installOpenvpn();
  await saveOpenvpnConfig();
  await startOpenvpn();
  await waitForOpenvpnConnection();
};

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});