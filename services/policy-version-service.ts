import {PolicyVersionError} from "../errors/policy-version-error";
import { LockError } from "../errors/lock-error";
import { SecurityPolicy } from "../models/types";
import fs from 'fs';
import path from 'path';
const HISTORY_FILE_PATH = 'db/policies-history.json';
export interface VersionInfo {
    version: number;
    hash: string;
    timestamp: number;
    metadata?: Record<string, any>;
}

interface LockInfo {
    timestamp: number;
    expiresAt: number;
    operationId: string;
}

export class PolicyVersionService {
    private currentVersion: VersionInfo = { version: 0, hash: '', timestamp: Date.now() };
    private versionHistory: Map<number, VersionInfo> = new Map();
    private lockInfo: LockInfo | null = null;
    private readonly LOCK_TIMEOUT = 5000; // 5 seconds timeout for lock
    private readonly LOCK_RENEWAL_INTERVAL = 2000; // 2 seconds
    private readonly MAX_HISTORY_SIZE = 10;
    private readonly LOCK_RETRY_INTERVAL = 100; // 100ms between retries
    private readonly MAX_LOCK_RETRIES = 3;
    private readonly historyFilePath: string;

    constructor() {
        // Initializes historyFilePath by joining the current working directory with the constant history path
        this.historyFilePath = path.join(process.cwd(), HISTORY_FILE_PATH);
    }

    public savePolicyToHistory(policy: SecurityPolicy) {
        try {
            let history: Record<number, SecurityPolicy> = {};
            
            // Read existing history if file exists
            if (fs.existsSync(this.historyFilePath)) {
                const historyContent = fs.readFileSync(this.historyFilePath, 'utf-8');
                history = JSON.parse(historyContent);
            }

            // Add new policy with current version as key
            history[this.currentVersion.version] = policy;

            // Write back to file
            fs.writeFileSync(this.historyFilePath, JSON.stringify(history, null, 2));
        } catch (error) {
            console.error('Error saving policy to history:', error);
        }
    }

    private async acquireLock(operationId: string): Promise<boolean> {
        let retryCount = 0;
        
        while (retryCount < this.MAX_LOCK_RETRIES) {
            if (!this.lockInfo || this.lockInfo.expiresAt < Date.now()) {
                this.lockInfo = {
                    timestamp: Date.now(),
                    expiresAt: Date.now() + this.LOCK_TIMEOUT,
                    operationId
                };
                this.startLockRenewal();
                return true;
            }
            
            // If the lock is held by the same operation, allow it
            if (this.lockInfo.operationId === operationId) {
                return true;
            }
            
            retryCount++;
            if (retryCount < this.MAX_LOCK_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, this.LOCK_RETRY_INTERVAL));
            }
        }
        
        return false;
    }

    private startLockRenewal(): void {
        const renewalInterval = setInterval(() => {
            if (this.lockInfo) {
                this.lockInfo.expiresAt = Date.now() + this.LOCK_TIMEOUT;
            } else {
                clearInterval(renewalInterval);
            }
        }, this.LOCK_RENEWAL_INTERVAL);
    }

    public releaseLock(operationId: string): void {
        if (this.lockInfo && this.lockInfo.operationId === operationId) {
            this.lockInfo = null;
        }
    }

    public getCurrentVersion(): VersionInfo {
        return { ...this.currentVersion };
    }

    public async incrementVersion(hash: string, metadata?: Record<string, any>): Promise<VersionInfo> {
        const operationId: string = crypto.randomUUID();
        const hasLock: boolean = await this.acquireLock(operationId);
        
        if (!hasLock) {
            throw new LockError('Failed to acquire lock for version increment');
        }

        try {
            const newVersion = this.currentVersion.version + 1;
            const newVersionInfo: VersionInfo = {
                version: newVersion,
                hash,
                timestamp: Date.now(),
                metadata
            };

            // Store in history
            this.versionHistory.set(newVersion, { ...newVersionInfo });
            
            // Trim history if needed
            this.trimHistory();

            this.currentVersion = newVersionInfo;
            return { ...newVersionInfo };
        } catch (e) {
            throw new PolicyVersionError('incrementVersion has failed');
        } finally {
            this.releaseLock(operationId);
        }
    }

    private trimHistory() {
        if (this.versionHistory.size > this.MAX_HISTORY_SIZE) {
            const versionsToDelete: number[] = this.trimHistoryMetaData();

            // Remove deleted versions from the history db
            try {
                this.trimHistoryFromStorage(versionsToDelete);
            } catch (error) {
                console.error('Error updating policies-history.json during trim:', error);
            }
        }
    }

    private trimHistoryMetaData(): number[] {
        const versions = Array.from(this.versionHistory.keys()).sort((a, b) => a - b);
        const versionsToDelete: number[] = [];

        while (this.versionHistory.size > this.MAX_HISTORY_SIZE) {
            const versionToDelete = versions.shift()!;
            this.versionHistory.delete(versionToDelete);
            versionsToDelete.push(versionToDelete);
        }

        return versionsToDelete;
    }

    private trimHistoryFromStorage(versionsToDelete: number[]) {
        if (fs.existsSync(this.historyFilePath)) {
            const historyContent: string = fs.readFileSync(this.historyFilePath, 'utf-8');
            const history: Record<number, SecurityPolicy> = JSON.parse(historyContent);

            // Remove the deleted versions from the history file
            versionsToDelete.forEach(version => {
                delete history[version];
            });

            // Write the updated history back to file
            fs.writeFileSync(this.historyFilePath, JSON.stringify(history, null, 2));
        }
    }

    public async rollbackToVersion(version: number): Promise<any> {
        const operationId = crypto.randomUUID();
        const targetVersion = this.versionHistory.get(version);
        const policy: SecurityPolicy | null = this.loadPolicyByVersion(version);

        if (!targetVersion || !policy) {
            throw new PolicyVersionError(`Version ${version} not found in history`);
        }

        const hasLock = await this.acquireLock(operationId);
        if (!hasLock) {
            throw new LockError('Failed to acquire lock for version rollback');
        }

        this.currentVersion = { ...targetVersion };
        return { ...this.currentVersion, policy };
    }

    private loadPolicyByVersion(version: number) {
        if (fs.existsSync(this.historyFilePath)) {
            const historyContent = fs.readFileSync(this.historyFilePath, 'utf-8');
            const history: Record<number, SecurityPolicy> = JSON.parse(historyContent);
            return history[version];
        }

        return null;
    }
} 