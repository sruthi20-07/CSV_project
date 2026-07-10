import assert from 'assert';
import { validateCSVRow } from './utils/validation';

console.log('====================================================');
console.log(' RUNNING VALIDATION LOGIC UNIT TESTS');
console.log('====================================================');

interface TestCase {
  name: string;
  row: Record<string, any>;
  nameCol?: string;
  emailCol?: string;
  phoneCol?: string;
  expectedErrors: string[];
}

const testCases: TestCase[] = [
  {
    name: '1. Valid lead containing name, email, and phone',
    row: { Name: 'John Doe', Email: 'john.doe@example.com', Phone: '+91 9876543210' },
    expectedErrors: [],
  },
  {
    name: '2. Valid lead containing name and email only',
    row: { Name: 'Jane Smith', Email: 'jane.smith@groweasy.ai', Phone: '' },
    expectedErrors: [],
  },
  {
    name: '3. Valid lead containing name and phone only',
    row: { Name: 'Alice Johnson', Email: '', Phone: '9876543210' },
    expectedErrors: [],
  },
  {
    name: '4. Valid lead starting with 0 dial prefix',
    row: { Name: 'Bob Brown', Email: '', Phone: '09876543210' },
    expectedErrors: [],
  },
  {
    name: '5. Valid lead with phone formatting symbols (+, -, space, brackets)',
    row: { Name: 'Charlie Davis', Email: 'charlie@domain.com', Phone: '+91 (123) 456-7890' },
    expectedErrors: [],
  },
  {
    name: '6. Invalid lead: Missing client name',
    row: { Name: '', Email: 'error@example.com', Phone: '9876543210' },
    expectedErrors: ['MISSING_REQUIRED'],
  },
  {
    name: '7. Invalid lead: Missing BOTH email and phone contact info',
    row: { Name: 'No Contact Lead', Email: '', Phone: '' },
    expectedErrors: ['MISSING_CONTACT'],
  },
  {
    name: '8. Invalid lead: Invalid email format structure',
    row: { Name: 'Wrong Mail', Email: 'wrong-email-format', Phone: '9876543210' },
    expectedErrors: ['INVALID_EMAIL'],
  },
  {
    name: '9. Invalid lead: Invalid phone structure (contains alphabetical chars)',
    row: { Name: 'Wrong Phone', Email: 'user@domain.com', Phone: '98765-PHONE' },
    expectedErrors: ['INVALID_PHONE'],
  },
  {
    name: '10. Invalid lead: Phone number is too short (< 7 digits)',
    row: { Name: 'Short Phone', Email: 'user@domain.com', Phone: '12345' },
    expectedErrors: ['INVALID_PHONE'],
  }
];

let passedTests = 0;
let failedTests = 0;

testCases.forEach((tc) => {
  try {
    const result = validateCSVRow(tc.row, tc.nameCol, tc.emailCol, tc.phoneCol);
    
    // Check if error arrays match exactly
    assert.deepStrictEqual(result.errors.sort(), tc.expectedErrors.sort());
    
    console.log(`[PASS] ${tc.name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`[FAIL] ${tc.name}`);
    console.error(`       Expected: ${JSON.stringify(tc.expectedErrors)}`);
    const actual = validateCSVRow(tc.row, tc.nameCol, tc.emailCol, tc.phoneCol);
    console.error(`       Got:      ${JSON.stringify(actual.errors)}`);
    failedTests++;
  }
});

console.log('====================================================');
console.log(` SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
