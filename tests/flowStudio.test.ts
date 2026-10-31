import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { FlowStorageService } from '../server/src/services/flowStorageService';
import { FlowAccountService } from '../server/src/services/flowAccountService';
import { FlowSchedulerService } from '../server/src/services/flowSchedulerService';
import { FlowJob, FlowAccount } from '../shared/src/types';

console.log('--- Running Google Flow Studio Unit Tests ---');

async function runTests() {
  // Test 1: Storage & Security Paths
  console.log('1. Testing FlowStorageService security & path sanitization...');
  FlowStorageService.initStorage();
  assert.ok(fs.existsSync(FlowStorageService.dataDir), 'data directory must exist');
  assert.ok(fs.existsSync(FlowStorageService.videosDir), 'videos directory must exist');

  const safeName = FlowStorageService.sanitizeFilename('../../malicious_path/test.mp4');
  assert.strictEqual(safeName, 'test.mp4', 'Filename must be stripped of path traversal');

  assert.throws(() => {
    FlowStorageService.getSafeVideoPath('../../../windows/system32/cmd.exe');
  }, 'Should block directory traversal attempts');
  console.log('   ✓ Path sanitization and directory traversal defenses verified');

  // Test 2: 10-Account Manager
  console.log('2. Testing 10-Account Manager initialization & profile bindings...');
  const accounts = await FlowAccountService.initAccounts();
  assert.strictEqual(accounts.length, 10, 'Must have exactly 10 Google AI Pro account slots');
  assert.strictEqual(accounts[0].slotNumber, 1, 'First account should be slot 1');
  assert.strictEqual(accounts[9].slotNumber, 10, 'Tenth account should be slot 10');

  // Verify non-fabrication of credit balances
  for (const acc of accounts) {
    assert.ok(acc.creditBalanceLabel === 'Pro Active' || acc.creditBalanceLabel === 'Unknown', 'Credits must not be fabricated');
    assert.ok(acc.profileDirectory, 'Every account must have a Chrome profile directory');
  }

  // Update friendly name
  const updated = await FlowAccountService.updateAccount('acc_1', {
    name: 'Hashim Pro Master 1'
  });
  assert.strictEqual(updated.name, 'Hashim Pro Master 1', 'Account friendly name should update');
  console.log('   ✓ 10 Google AI Pro accounts initialized and persistent');

  // Test 3: Chrome Path & Profile Discovery
  console.log('3. Testing Chrome executable & profile auto-discovery...');
  const chromePath = FlowAccountService.getChromeExecutablePath();
  const profiles = FlowAccountService.discoverAvailableProfiles();
  console.log(`   Chrome Executable: ${chromePath || 'Not installed (fallback mode)'}`);
  console.log(`   Discovered Local Chrome Profiles: ${profiles.join(', ') || 'None'}`);
  assert.ok(Array.isArray(profiles), 'Discovered profiles must be an array');
  console.log('   ✓ Chrome detection and profile discovery verified');

  // Test 4: Job Scheduler & Concurrency Control
  console.log('4. Testing Job Scheduler, Priority, and Concurrency Lock...');
  // Reset accounts to ready for testing
  for (let i = 1; i <= 10; i++) {
    await FlowAccountService.setAccountStatus(`acc_${i}`, 'ready');
  }

  // Create Job 1 (Automatic selection)
  const job1 = await FlowSchedulerService.createJob({
    prompt: 'A fluffy orange cat dancing happily on two legs in a colorful living room, playful choreography, cinematic lighting, smooth camera movement, high detail.',
    selectionMode: 'auto',
    settings: {
      aspectRatio: '16:9',
      stylePreset: 'Cinematic'
    }
  });

  assert.ok(job1.id.startsWith('flow_job_'), 'Job ID should be generated');
  assert.strictEqual(job1.status, 'pending', 'New job should start as pending');
  assert.strictEqual(job1.settings.aspectRatio, '16:9');

  // Test Account Eligibility Selection
  const select1 = await FlowSchedulerService.selectEligibleAccount();
  assert.ok(select1.account, 'An eligible account should be selected');
  const chosenAcc1 = select1.account!;

  // Simulate account 1 becoming in_use
  await FlowAccountService.setAccountStatus(chosenAcc1.id, 'in_use', 'Running test job', job1.id);
  job1.status = 'running';
  job1.accountId = chosenAcc1.id;
  await FlowSchedulerService.saveJob(job1);

  // Test Strict Concurrency: Job 2 must NOT pick chosenAcc1 while busy
  const select2 = await FlowSchedulerService.selectEligibleAccount();
  assert.ok(select2.account, 'Second job should pick next available account');
  assert.notStrictEqual(select2.account!.id, chosenAcc1.id, 'Busy account must NOT be assigned concurrently');
  console.log(`   ✓ Single-job concurrency enforced: Account ${chosenAcc1.id} locked; next job selected ${select2.account!.id}`);

  // Test Manual Account Mode
  const manualEligible = await FlowSchedulerService.selectEligibleAccount(chosenAcc1.id);
  assert.strictEqual(manualEligible.account, null, 'Manual selection of busy account must be rejected');
  assert.ok(manualEligible.reason?.includes('currently processing another job'), 'Clear reason must be returned');
  console.log('   ✓ Manual selection eligibility check passed');

  // Test 5: Safe Restart Recovery
  console.log('5. Testing Application Restart Recovery...');
  // Ensure job1 is in 'running' state
  job1.status = 'running';
  await FlowSchedulerService.saveJob(job1);

  // Trigger recovery simulation
  await FlowSchedulerService.recoverInterruptedJobs();
  const recoveredJob = await FlowSchedulerService.getJobById(job1.id);
  assert.ok(recoveredJob, 'Job must exist');
  assert.strictEqual(recoveredJob!.status, 'needs_attention', 'Running job must be marked needs_attention upon server restart');
  assert.ok(recoveredJob!.manualActionRequired, 'Needs clear instruction for user');
  console.log('   ✓ Restart recovery safely converted running job to needs_attention without data loss');

  // Test 6: Job Retry & State Transitions
  console.log('6. Testing Job Retry & Cancel transitions...');
  const retriedJob = await FlowSchedulerService.retryJob(job1.id);
  assert.strictEqual(retriedJob.status, 'pending', 'Retried job should be pending');
  assert.strictEqual(retriedJob.retryCount, 1, 'Retry count should increment');

  const cancelledJob = await FlowSchedulerService.cancelJob(job1.id);
  assert.strictEqual(cancelledJob.status, 'failed', 'Cancelled job should be failed');

  // Clean up test job
  await FlowSchedulerService.deleteJob(job1.id);
  const deletedCheck = await FlowSchedulerService.getJobById(job1.id);
  assert.strictEqual(deletedCheck, null, 'Job should be deleted');
  console.log('   ✓ Job cancellation, retry, and deletion lifecycle verified');

  // Test 7: Bulk Scene Generation & CDP Port Configuration
  console.log('7. Testing Bulk Scene Generation & CDP Port Configuration...');
  const batchPayloads = [
    { prompt: 'Scene 1: Golden sunrise over mountain sanctuary', mediaType: 'image' as const, sceneNumber: '001' },
    { prompt: 'Scene 2: Drone flying into mist', mediaType: 'video' as const, sceneNumber: '002' }
  ];
  const batchJobs = await FlowSchedulerService.createBatchJobs(batchPayloads);
  assert.strictEqual(batchJobs.length, 2, 'Batch of 2 jobs must be created');
  assert.strictEqual(batchJobs[0].mediaType, 'image');
  assert.strictEqual(batchJobs[1].mediaType, 'video');
  assert.strictEqual(batchJobs[0].batchId, batchJobs[1].batchId, 'Batch jobs must share a common batchId');
  assert.strictEqual(batchJobs[0].sceneNumber, '001');

  // Verify CDP debug port calculation
  const port = FlowAccountService.getDebuggingPortForAccount(accounts[0]);
  assert.strictEqual(port, 9222, 'CDP debugging port should default to 9222');
  console.log(`   ✓ Bulk script scene creation verified (Batch ID: ${batchJobs[0].batchId})`);
  console.log(`   ✓ Chrome DevTools Protocol debugging port verified (Port: ${port})`);

  // Clean up batch jobs
  for (const bJob of batchJobs) {
    await FlowSchedulerService.deleteJob(bJob.id);
  }

  // Release test account locks
  for (let i = 1; i <= 10; i++) {
    await FlowAccountService.setAccountStatus(`acc_${i}`, 'ready');
  }

  console.log('✅ ALL GOOGLE FLOW STUDIO UNIT TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Flow Studio Unit Tests Failed:', err);
  process.exit(1);
});
