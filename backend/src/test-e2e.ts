import fs from 'fs';
import path from 'path';
import assert from 'assert';

/**
 * Robust fetch helper that retries requests when hitting Gemini Free Tier 429 rate limits
 */
async function fetchWithRateLimitRetry(url: string, options: any, maxRetries = 6): Promise<Response> {
  let attempt = 0;
  while (attempt < maxRetries) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      attempt++;
      console.warn(`[E2E Rate Limit] Hit 429 Too Many Requests. Waiting 12 seconds before retry (Attempt ${attempt}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 12000));
      continue;
    }
    return response;
  }
  throw new Error(`Exceeded maximum retries (${maxRetries}) due to rate limits at ${url}`);
}

async function runEndToEndTest() {
  console.log('====================================================');
  console.log(' RUNNING END-TO-END IMPORTER PIPELINE TEST');
  console.log('====================================================');

  const API_HOST = process.env.API_HOST || 'http://localhost:5000';
  
  // 1. Create a temporary testing CSV file
  const tempCsvPath = path.join(__dirname, 'temp_test_leads.csv');
  const csvContent = [
    'Full Name,Email Address,Phone Number,Company,City,CRM Status,Campaign Source',
    'John Doe,john.doe@example.com,+91 98765-43210,GrowEasy Agency,New York,GOOD_LEAD_FOLLOW_UP,leads_on_demand',
    'Jane Smith,jane.smith@groweasy.ai,,Meridian Realty,San Francisco,SALE_DONE,meridian_tower',
    'Missing Contact Lead,,,,Chicago,DID_NOT_CONNECT,eden_park',
    'Wrong Email Lead,invalid-email-format,9876543212,Varah Group,,BAD_LEAD,varah_swamy'
  ].join('\n');
  
  fs.writeFileSync(tempCsvPath, csvContent);
  console.log(`[E2E] Created temporary testing CSV at: ${tempCsvPath}`);

  try {
    // 2. Perform file upload POST request
    console.log(`[E2E] Step 1: Uploading file to ${API_HOST}/api/upload...`);
    
    const formData = new FormData();
    const fileBlob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('file', fileBlob, 'temp_test_leads.csv');

    // If Gemini key is set locally, forward it
    const apiKey = process.env.GEMINI_API_KEY || '';
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['x-gemini-key'] = apiKey;
    }

    const uploadResponse = await fetchWithRateLimitRetry(`${API_HOST}/api/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const uploadResult = await uploadResponse.json() as any;
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadResult)}`);
    }

    console.log(`[E2E] Upload Response:`, JSON.stringify(uploadResult, null, 2));

    // Verify jobId is generated and returned
    assert.ok(uploadResult.jobId, 'Expected jobId to be generated in upload response');
    assert.strictEqual(uploadResult.fileName, 'temp_test_leads.csv');
    assert.ok(Array.isArray(uploadResult.headers), 'Expected headers list');
    assert.ok(uploadResult.headers.includes('Full Name'), 'Expected "Full Name" header');

    const jobId = uploadResult.jobId;
    console.log(`[E2E] Verified Job ID: ${jobId}`);

    // 3. Prepare Mapping confirmations
    console.log(`[E2E] Step 2: Formulating mappings and defaults...`);
    const mappings: Record<string, string | null> = {
      name: 'Full Name',
      email: 'Email Address',
      mobile_without_country_code: 'Phone Number',
      company: 'Company',
      city: 'City',
      crm_status: 'CRM Status',
      data_source: 'Campaign Source'
    };

    // Rows from local parse logic in the frontend
    const localRows = [
      { 'Full Name': 'John Doe', 'Email Address': 'john.doe@example.com', 'Phone Number': '+91 98765-43210', Company: 'GrowEasy Agency', City: 'New York', 'CRM Status': 'GOOD_LEAD_FOLLOW_UP', 'Campaign Source': 'leads_on_demand', _rowIndex: 1 },
      { 'Full Name': 'Jane Smith', 'Email Address': 'jane.smith@groweasy.ai', 'Phone Number': '', Company: 'Meridian Realty', City: 'San Francisco', 'CRM Status': 'SALE_DONE', 'Campaign Source': 'meridian_tower', _rowIndex: 2 },
      { 'Full Name': 'Missing Contact Lead', 'Email Address': '', 'Phone Number': '', Company: '', City: 'Chicago', 'CRM Status': 'DID_NOT_CONNECT', 'Campaign Source': 'eden_park', _rowIndex: 3 },
      { 'Full Name': 'Wrong Email Lead', 'Email Address': 'invalid-email-format', 'Phone Number': '9876543212', Company: 'Varah Group', City: '', 'CRM Status': 'BAD_LEAD', 'Campaign Source': 'varah_swamy', _rowIndex: 4 }
    ];

    const defaultValues = {
      lead_owner: 'System Owner',
      crm_status: 'GOOD_LEAD_FOLLOW_UP',
      data_source: 'leads_on_demand'
    };

    // 4. Perform processing POST request
    console.log(`[E2E] Step 3: Sending batch process request to ${API_HOST}/api/process...`);
    
    const processHeaders: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      processHeaders['x-gemini-key'] = apiKey;
    }

    const processResponse = await fetchWithRateLimitRetry(`${API_HOST}/api/process`, {
      method: 'POST',
      headers: processHeaders,
      body: JSON.stringify({
        jobId,
        rows: localRows,
        mappings,
        skipDuplicates: true,
        existingEmails: [],
        existingPhones: [],
        defaultValues
      })
    });

    const processResult = await processResponse.json() as any;
    
    if (!processResponse.ok) {
      throw new Error(`Processing failed: ${JSON.stringify(processResult)}`);
    }

    console.log(`[E2E] Processing Response:`, JSON.stringify(processResult, null, 2));

    // 5. Verify results metrics
    assert.strictEqual(processResult.totalRecords, 4, 'Expected 4 total records');
    assert.strictEqual(processResult.importedCount, 3, 'Expected 3 imported leads');
    assert.strictEqual(processResult.skippedCount, 1, 'Expected 1 skipped lead (no contact)');
    assert.strictEqual(processResult.failedCount, 0, 'Expected 0 failed leads');
    
    console.log(`[E2E] SUCCESS: Pipeline E2E validation matches expectations!`);
    process.exit(0);
  } catch (err: any) {
    console.error(`[E2E FAIL] pipeline test crashed:`, err.message);
    process.exit(1);
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempCsvPath)) {
        fs.unlinkSync(tempCsvPath);
        console.log(`[E2E Cleanup] Deleted temp CSV.`);
      }
    } catch (cleanupErr) {
      console.error(`[E2E Cleanup Error]:`, cleanupErr);
    }
  }
}

runEndToEndTest();
