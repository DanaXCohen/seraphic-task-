import fs from 'fs';
import crypto from 'crypto';
import {Rule, SecurityPolicy, User} from '../models/types';
import {PolicyVersionService, VersionInfo} from './policy-version-service';
import {ValidationError} from "../errors/validation-error";
import {PolicyVersionError} from "../errors/policy-version-error";
import {InfraError} from "../errors/infra-error";

export class SecurityPolicyService {
    // Default empty policy that will be loaded from file during initialization
    private policy: SecurityPolicy = { rules: [], version: 0 };
    private versionService: PolicyVersionService;
    private isInitialized: boolean = false;

    constructor(private policyFilePath: string = './policy.json') {
        this.versionService = new PolicyVersionService();
    }

    // Initialize the service by loading the policy from file
    public async init(): Promise<void> {
        if (!this.isInitialized) {
            await this.loadInitialPolicy();
            this.isInitialized = true;
        }
    }

    // Load policy from file and validate it
    private async loadInitialPolicy(): Promise<void> {
        try {
            if (fs.existsSync(this.policyFilePath)) {
                const policyData = fs.readFileSync(this.policyFilePath, 'utf-8');
                const parsedPolicy = JSON.parse(policyData) as SecurityPolicy;

                if (this.validatePolicy(parsedPolicy)) {
                    const versionInfo = this.versionService.getCurrentVersion();
                    this.policy = {
                        ...parsedPolicy,
                        version: versionInfo.version
                    };
                    this.versionService.savePolicyToHistory(this.policy);
                    console.log('Initial policy loaded successfully');
                } else {
                    console.error('Initial policy validation failed');
                }
            } else {
                console.log('No policy file found, creating a default one');
            }
        } catch (error) {
            console.error('Error loading initial policy:', error);
        }
    }

    // Calculate a hash of the policy rules for version tracking
    private calculatePolicyHash(policy: SecurityPolicy): string {
        const policyString = JSON.stringify(policy.rules);
        return crypto.createHash('sha256').update(policyString).digest('hex');
    }

    // Update the policy with new rules and handle versioning
    public async updatePolicy(user: User, newPolicy: SecurityPolicy): Promise<SecurityPolicy> {
        if (!this.validatePolicy(newPolicy)) {
            throw new ValidationError('policy validation failed');
        }

        // Sort rules by priority (lowest number = highest priority)
        newPolicy.rules = newPolicy.rules.sort((a, b) => a.priority - b.priority);

        const hash: string = this.calculatePolicyHash(newPolicy);

        try {
            return this._updatePolicy(user, hash, newPolicy);
        } catch (error) {
            // If the version service failed, attempt to rollback
            if (error instanceof PolicyVersionError) {
                try {
                    // Rollback to previous version
                    const previousVersion = this.policy.version || 0;
                    const { policy } = await this.versionService.rollbackToVersion(previousVersion);
                    this.policy = policy;
                } catch (rollbackError) {
                    console.error('Failed to rollback policy:', rollbackError);
                    throw new InfraError('Policy update failed and rollback failed');
                }
            }
            throw error;
        }
    }

    private async _updatePolicy(user: User, hash: string, newPolicy: SecurityPolicy): Promise<SecurityPolicy> {
        let versionInfo: VersionInfo;
        versionInfo = await this.versionService.incrementVersion(hash, {
            updatedBy: user.id,
            timestamp: Date.now(),
            previousVersion: this.policy.version || 0
        });

        this.policy = {
            ...newPolicy,
            version: versionInfo.version
        };

        this.versionService.savePolicyToHistory(this.policy);

        return { ...this.policy };
    }

    public async getPolicy(): Promise<SecurityPolicy> {
        return { ...this.policy };
    }

    public async getPolicyVersion(): Promise<VersionInfo> {
        return this.versionService.getCurrentVersion();
    }

    public validatePolicy(policy: SecurityPolicy): boolean {
        // Check if policy has rules array
        if (!policy || !Array.isArray(policy.rules)) {
            return false;
        }

        // Validate each rule
        for (const rule of policy.rules) {
            if (!this.validateRule(rule)) {
                return false;
            }
        }

        // Check for duplicate IDs
        const ids = policy.rules.map(rule => rule.id);
        return new Set(ids).size === ids.length;
    }

    private validateRule(rule: Rule): boolean {
        return (
            typeof rule.id === 'number' &&
            typeof rule.type === 'string' &&
            typeof rule.displayName === 'string' &&
            typeof rule.priority === 'number' &&
            typeof rule.condition === 'string'
        );
    }
}