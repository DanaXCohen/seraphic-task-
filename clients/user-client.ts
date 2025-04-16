import axios from 'axios';
import { SecurityPolicy } from '../models/types';

export interface PolicyVersionResponse {
    version: number;
    hash: string; // We'll use a hash to check if content has changed
}

export class UserClient {
    private currentString: string;
    private lastPolicyHash: string = '';
    private lastPolicyVersion: number = 0;
    private currentPolicy: SecurityPolicy | null = null;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(private serverUrl: string, initialString: string, private authToken: string) {
        this.currentString = initialString;
    }

    public async getPolicy(): Promise<SecurityPolicy | null> {
        try {
            const versionResponse = await axios.get<PolicyVersionResponse>(
                `${this.serverUrl}/policy/version`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                }
            );

            const { version, hash } = versionResponse.data;

            if (hash === this.lastPolicyHash) {
                console.log('Policy unchanged, using cached version');
                return null; // Policy unchanged
            }

            console.log(`Policy changed (version ${this.lastPolicyVersion} -> ${version}), fetching policy`);
            const policyResponse = await axios.get<SecurityPolicy>(
                `${this.serverUrl}/policy`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                }
            );

            const newPolicy = policyResponse.data;
            this.lastPolicyHash = hash;
            this.lastPolicyVersion = version;
            this.currentPolicy = newPolicy;

            return newPolicy;
        } catch (error) {
            console.error('Error fetching policy:', error);
            return null;
        }
    }

    public applyPolicy(policy: SecurityPolicy): void {
        if (!policy || !Array.isArray(policy.rules) || policy.rules.length === 0) {
            console.log('No policy to apply or empty policy');
            return;
        }

        console.log('Applying policy rules:');
        for (const rule of policy.rules) {
            console.log(`Applying rule: ${rule.displayName} (Priority: ${rule.priority})`);

            if (rule.type === 'exists') {
                if (!this.currentString.includes(rule.condition)) {
                    console.log(`- Failed: Character '${rule.condition}' does not exist`);
                } else {
                    console.log(`- Passed: Character '${rule.condition}' exists`);
                }
            } else if (rule.type === 'missing') {
                if (this.currentString.includes(rule.condition)) {
                    console.log(`- Failed: Character '${rule.condition}' is not missing`);
                } else {
                    console.log(`- Passed: Character '${rule.condition}' is missing`);
                }
            } else {
                console.log(`- Unknown rule type: ${rule.type}`);
            }
        }

        console.log(`Current string after policy application: ${this.currentString}`);
    }

    public startPeriodicCheck(interval: number): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        console.log(`Starting periodic policy check every ${interval}ms`);

        this.checkInterval = setInterval(async () => {
            try {
                const newPolicy = await this.getPolicy();
                if (newPolicy) {
                    console.log('New policy detected, applying...');
                    this.applyPolicy(newPolicy);
                }
            } catch (error) {
                console.error('Error in periodic check:', error);
            }
        }, interval);
    }

    public stopPeriodicCheck(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('Periodic policy check stopped');
        }
    }

    public setCurrentString(str: string): void {
        this.currentString = str;
        console.log(`Current string set to: ${this.currentString}`);

        // If we have a policy, apply it to the new string
        if (this.currentPolicy) {
            this.applyPolicy(this.currentPolicy);
        }
    }
}