import { CodeExecutionService } from '../src/services/codeExecution/codeExecution.service.js';

async function run() {
  console.log('--- Testing CodeExecutionService directly ---');

  const javaCode = `class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`;

  console.log('1. Executing Java...');
  try {
    const javaResult = await CodeExecutionService.executeStandalone({
      userId: null,
      language: 'java',
      sourceCode: javaCode,
      stdin: ''
    });
    console.log('Java Result:', JSON.stringify(javaResult, null, 2));
  } catch (err) {
    console.error('Java Execution Error:', err.message);
  }

  const pyCode = `name = input()
print("Hello", name)`;

  console.log('\n2. Executing Python with stdin...');
  try {
    const pyResult = await CodeExecutionService.executeStandalone({
      userId: null,
      language: 'python',
      sourceCode: pyCode,
      stdin: 'Sanket'
    });
    console.log('Python Result:', JSON.stringify(pyResult, null, 2));
  } catch (err) {
    console.error('Python Execution Error:', err.message);
  }

  const jsCode = `console.log("Hello World");`;
  console.log('\n3. Executing JavaScript...');
  try {
    const jsResult = await CodeExecutionService.executeStandalone({
      userId: null,
      language: 'javascript',
      sourceCode: jsCode,
      stdin: ''
    });
    console.log('JavaScript Result:', JSON.stringify(jsResult, null, 2));
  } catch (err) {
    console.error('JavaScript Execution Error:', err.message);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
