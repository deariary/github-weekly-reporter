// Minimal CLI spinner (no external dependencies)

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const INTERVAL = 80;

export const withSpinner = async <T>(message: string, task: () => Promise<T>): Promise<T> => {
  // Skip animation in non-TTY environments (CI, piped output, tests)
  if (!process.stderr.isTTY) {
    process.stderr.write(`  ${message}\n`);
    return task();
  }

  let i = 0;
  const timer = setInterval(() => {
    const frame = FRAMES[i++ % FRAMES.length];
    process.stderr.write(`\r  ${frame} ${message}`);
  }, INTERVAL);

  try {
    const result = await task();
    clearInterval(timer);
    process.stderr.write(`\r  ✔ ${message}\n`);
    return result;
  } catch (error) {
    clearInterval(timer);
    process.stderr.write(`\r  ✖ ${message}\n`);
    throw error;
  }
};
