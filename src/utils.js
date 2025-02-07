const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);

const execCommand = async (command) => {
  try {
    await execAsync(command);
  } catch (error) {
    const { stdout, stderr } = error;

    console.log(stdout);
    console.error(stderr);

    throw new Error(`Command '${command}' failed with exit code ${error.code}`);
  }
};

module.exports = {
  execCommand,
};
