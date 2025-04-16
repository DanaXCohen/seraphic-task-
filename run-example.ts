import { AdminClient } from './clients/admin-client';
import { UserClient } from './clients/user-client';
import axios from 'axios';
import path from 'path';

async function runExample() {
    try {
        // Login as admin
        console.log('Logging in as admin...');
        const adminLoginResponse = await axios.post('http://localhost:3000/auth/login', {
            userId: 'admin1'
        });
        const adminToken = adminLoginResponse.data.token;
        console.log('Admin logged in successfully');

        // Create admin client with token
        const adminClient = new AdminClient('http://localhost:3000', adminToken);

        // Read and update policy as admin
        console.log('Reading policy file...');
        const policyPath = path.join(__dirname, 'db/policy.json');

        console.log('Admin updating policy...');
        const updateResult = await adminClient.updatePolicyFromFile(policyPath);
        console.log('Policy update result:', updateResult);

        // Login as user
        console.log('Logging in as user...');
        const userLoginResponse = await axios.post('http://localhost:3000/auth/login', {
            userId: 'user1',
        });
        const userToken = userLoginResponse.data.token;
        console.log('User logged in successfully');

        // Create user client with token
        const userClient = new UserClient('http://localhost:3000', 'ABCDEF', userToken);

        // Get and apply policy as user
        console.log('User fetching policy...');
        const userPolicy = await userClient.getPolicy();

        if (userPolicy) {
            console.log('User applying policy...');
            userClient.applyPolicy(userPolicy);
        }

        // Start periodic checks
        userClient.startPeriodicCheck(10000);

        // Change string after 5 seconds
        setTimeout(() => {
            userClient.setCurrentString('ABCXYZ');
            console.log('Changed current string to: ABCXYZ');
        }, 5000);

        // Stop checks after 30 seconds
        setTimeout(() => {
            userClient.stopPeriodicCheck();
            console.log('Example complete');
            process.exit(0);
        }, 30000);

    } catch (error) {
        console.error('Error in example:', error);
        process.exit(1);
    }
}

// Run the example
runExample().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});