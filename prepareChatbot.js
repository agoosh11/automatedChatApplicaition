import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import readline from 'readline';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, { stdio: 'inherit' });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  try {
    // get user input
    const companyName = await askQuestion("Enter your company name (alphanumeric only): ");
    const sanitizedCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '');
    const url = await askQuestion("Enter the URL to crawl: ");
    
    // generate a unique ID
    const uniqueId = uuidv4().substring(0, 8);
    const tableName = `${sanitizedCompanyName}_${uniqueId}`;
    const chunkedTableName = `${sanitizedCompanyName}recursivesplit_${uniqueId}`;
    
    console.log(`\nPreparing chatbot system for ${companyName}...`);
    console.log(`Using table names: ${tableName} and ${chunkedTableName}\n`);
    
    // Step 1: Run the crawler
    console.log("STEP 1: Crawling website...");
    await runCommand('node', ['crawl.js', url, tableName]);
    
    // Step 2: Run the chunking script
    console.log("\nSTEP 2: Chunking content...");
    await runCommand('python', ['pureRecusive.py', tableName, chunkedTableName]);
    
    // Step 3: Generate embeddings
    console.log("\nSTEP 3: Generating embeddings...");
    await runCommand('python', ['bge-m3Embeding.py', chunkedTableName]);
    
    console.log("\nChatbot preparation complete!");
    console.log(`Crawled data table: ${tableName}`);
    console.log(`Chunked and embedded data table: ${chunkedTableName}`);

    // Step 4: Initialize the backend with the table name
    console.log("\nSTEP 4: Initializing backend with table data...");
    const response = await fetch('http://127.0.0.1:5000/api/load_data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_name: chunkedTableName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize backend: ${await response.text()}`);
    }

    console.log("Backend initialized successfully!");
    
      // Step 5: Start the frontend application
      console.log("\nSTEP 5: Starting the frontend application...");
  
      // determine the path to the frontend directory
      const frontendPath = path.join(process.cwd(), 'frontend');
      console.log(`Starting frontend from ${frontendPath}`);
      
      // start the frontend app in a detached process so it doesn't block the script
      const frontendProcess = spawn('npm', ['start'], {
        cwd: frontendPath,
        shell: true,
        detached: true,
        stdio: 'ignore'
      });
      
      // unref the child process so the main process can exit independently
      frontendProcess.unref();
      
      console.log("Frontend application started successfully!");
      console.log("Your chatbot system is now fully operational.");
      
    rl.close();
  } catch (error) {
    console.error("\nError:", error.message);
    process.exit(1);
  }
}

main();