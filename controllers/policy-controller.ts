import { Request, Response } from 'express';
import { SecurityPolicyService } from '../services/security-policy-service';
import { SecurityPolicy } from '../models/types';
import {ValidationError} from "../errors/validation-error";
import path from "path";
import fs from "fs";
import {PolicyVersionError} from "../errors/policy-version-error";
import {VersionInfo} from "../services/policy-version-service";

export class PolicyController {
    constructor(private policyService: SecurityPolicyService) {}

    // Get the current policy
    public getPolicy = async (req: Request, res: Response): Promise<void> => {
        try {
            const policy: SecurityPolicy = await this.policyService.getPolicy();
            res.json(policy);
        } catch (error) {
            console.error('Error getting policy:', error);
            res.status(500).json({ error: 'Failed to get policy' });
        }
    };

    // Get the current policy version
    public getPolicyVersion = async (req: Request, res: Response): Promise<void> => {
        try {
            const versionInfo: VersionInfo = await this.policyService.getPolicyVersion();
            res.json(versionInfo);
        } catch (error) {
            console.error('Error getting policy version:', error);
            res.status(500).json({ error: 'Failed to get policy version' });
        }
    };

    // Update the policy with new rules
    public updatePolicy = async (req: Request, res: Response): Promise<void> => {
        try {
            const { user } = req;
            const { filePath } = req.body;
            
            if (!filePath) {
                res.status(400).json({ error: 'File path is required' });
                return;
            }

            // Resolve the absolute path
            const absolutePath: string = path.resolve(filePath);
            
            // Check if file exists
            if (!fs.existsSync(absolutePath)) {
                res.status(400).json({ error: `Policy file not found at ${absolutePath}` });
                return;
            }

            // Read and parse the policy file
            const policyContent: string = fs.readFileSync(absolutePath, 'utf-8');
            const policy = JSON.parse(policyContent) as SecurityPolicy;

            // Update the policy
            if (user) {
                await this.policyService.updatePolicy(user, policy);
            }
            res.json({ message: 'Policy updated successfully' });
        } catch (error) {
            console.error('Error updating policy:', error);

            if (error instanceof ValidationError || error instanceof PolicyVersionError) {
                res.status(error.code).json({error: error.message});
                return;
            }
        }
    };


}